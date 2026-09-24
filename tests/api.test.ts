import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from '../src/server/app';
import * as ai from '../src/server/geminiService';

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
