import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from '../src/server/app';
import * as ai from '../src/server/aiService';
import * as provider from '../src/server/aiProvider';

describe('protected Express API', () => {
  let server: Server, base: string;
  const verify = vi.fn(async (token: string) => { if (token === 'invalid') throw new Error('expired'); return { uid: token }; });
  beforeAll(async () => {
    const app = createApp({ verifyToken: verify, allowedUids: ['owner'], allowedOrigins: ['https://career.example'], rateLimit: 5 });
    server = await new Promise<Server>(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));
  const post = (path: string, token?: string, body: unknown = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  it('health works, unknown API is JSON 404, disallowed origin and preflight are handled', async () => {
    expect(await (await fetch(base + '/api/health')).json()).toEqual({ status: 'ok' });
    expect((await fetch(base + '/api/unknown')).status).toBe(404);
    expect((await fetch(base + '/api/health', { headers: { Origin: 'https://evil.example' } })).status).toBe(403);
    const preflight = await fetch(base + '/api/copilot/chat', { method: 'OPTIONS', headers: { Origin: 'https://career.example' } });
    expect(preflight.status).toBe(204); expect(preflight.headers.get('access-control-allow-origin')).toBe('https://career.example');
  });
  it('requires verified identity for every copilot endpoint', async () => {
    for (const route of ['chat', 'search-research', 'explain', 'improve', 'jd-analyze', 'mock-interview']) expect((await post('/api/copilot/' + route)).status).toBe(401);
    expect((await post('/api/copilot/chat', 'invalid')).status).toBe(401);
    expect((await post('/api/copilot/chat', 'unapproved')).status).toBe(403);
  });
  it('rejects arbitrary models, oversized text, malformed JSON, then limits authenticated use', async () => {
    expect((await post('/api/copilot/chat', 'owner', { messages: [{ role: 'user', content: 'Hi' }], model: 'arbitrary-expensive-model' })).status).toBe(400);
    expect((await post('/api/copilot/explain', 'owner', { content: 'x'.repeat(30001) })).status).toBe(400);
    expect((await fetch(base + '/api/copilot/chat', { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: '{' })).status).toBe(400);
    vi.spyOn(ai, 'explainTopic').mockRejectedValueOnce(new ai.AIUnavailableError('AI is not configured.'));
    const missing = await post('/api/copilot/explain', 'owner', { content: 'attention' });
    expect(missing.status).toBe(503); expect(await missing.json()).not.toHaveProperty('explanation');
    vi.spyOn(ai, 'explainTopic').mockRejectedValueOnce(new Error('secret provider response'));
    const failure = await post('/api/copilot/explain', 'owner', { content: 'attention' });
    expect(failure.status).toBe(502); expect(await failure.text()).not.toContain('secret');
    expect((await post('/api/copilot/explain', 'owner', { content: 'again' })).status).toBe(429);
  });
});

describe('provider capability boundary', () => {
  let server: Server, base: string;
  beforeAll(async () => {
    vi.restoreAllMocks();
    vi.stubEnv('AI_PROVIDER', 'deepseek');
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    vi.stubEnv('DEEPSEEK_MODEL', 'deepseek-flash');
    const app = createApp({ verifyToken: async token => ({ uid: token }), allowedUids: ['owner'] });
    server = await new Promise<Server>(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
  const post = (path: string, body: unknown) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify(body) });
  it('exposes only public capabilities and reports disabled hosted search honestly', async () => {
    const capabilities = await fetch(base + '/api/capabilities');
    expect(capabilities.headers.get('cache-control')).toBe('no-store');
    expect(await capabilities.json()).toEqual({ provider: 'deepseek', model: 'deepseek-flash', webSearch: false, configured: false });
    for (const route of ['/api/copilot/search-research', '/api/copilot/chat']) {
      const response = await post(route, route.endsWith('chat') ? { messages: [{ role: 'user', content: 'Latest papers' }], enableSearch: true, model: 'standard' } : { topic: 'Latest papers' });
      expect(response.status).toBe(501);
      expect((await response.json()).error).toContain('not available');
    }
  });
  it('accepts neutral profiles and keeps unauthorized model names rejected', async () => {
    const completion = vi.spyOn(provider, 'generateCompletion').mockResolvedValue({ text: 'Answer', modelUsed: 'deepseek-flash', groundingSources: [], webSearchQueries: [] });
    for (const profile of ['standard', 'deep', 'fast']) {
      const response = await post('/api/copilot/chat', { messages: [{ role: 'user', content: 'Attention' }], model: profile });
      expect(response.status).toBe(200);
      expect((await response.json()).modelUsed).toBe('deepseek-flash');
    }
    const invalid = await post('/api/copilot/chat', { messages: [{ role: 'user', content: 'Attention' }], model: 'unapproved-model' });
    expect(invalid.status).toBe(400); expect(completion).toHaveBeenCalledTimes(3);
  });
});
