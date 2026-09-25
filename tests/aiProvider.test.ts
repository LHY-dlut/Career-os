import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAICapabilities, generateCompletion, AIUnavailableError, AIUnsupportedFeatureError } from '../src/server/aiProvider';
import { analyzeJobDescription, explainTopic, improveInterviewAnswer, researchTopicWithSearch, runMockInterviewTurn, runMultiTurnChat } from '../src/server/aiService';

const geminiGenerate = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent: geminiGenerate }; } }));
const fetchMock = vi.fn<typeof fetch>();
const response = (content = 'A concise answer.', finish = 'stop') => new Response(JSON.stringify({ model: 'deepseek-flash', choices: [{ finish_reason: finish, message: { content } }] }), { status: 200 });
const requestBody = () => JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));

beforeEach(() => {
  vi.stubEnv('AI_PROVIDER', '');
  vi.stubEnv('DEEPSEEK_API_KEY', 'test-only-key');
  vi.stubEnv('DEEPSEEK_MODEL', '');
  vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
  vi.stubEnv('GEMINI_MODEL', 'test-standard');
  vi.stubEnv('GEMINI_PRO_MODEL', 'test-deep');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset(); geminiGenerate.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('DeepSeek provider', () => {
  it('defaults to official V4.1 Flash, caps cost, converts history and returns actual provider metadata', async () => {
    fetchMock.mockResolvedValueOnce(response());
    const result = await runMultiTurnChat({ messages: [{ role: 'user', content: 'Question' }, { role: 'model', content: 'Previous answer' }, { role: 'user', content: 'Follow up' }], model: 'deep' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-only-key' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.redirect).toBe('error');
    expect(requestBody()).toMatchObject({ model: 'deepseek-flash', thinking: { type: 'disabled' }, max_tokens: 4096, stream: false });
    expect(requestBody().messages.map((m: { role: string }) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(result).toEqual({ reply: 'A concise answer.', modelUsed: 'deepseek-flash', groundingSources: [], webSearchQueries: [] });
    expect(geminiGenerate).not.toHaveBeenCalled();
  });
  it('publishes capabilities without credentials and honors only the server model setting', async () => {
    vi.stubEnv('DEEPSEEK_MODEL', 'server-selected-model');
    expect(getAICapabilities()).toEqual({ provider: 'deepseek', model: 'server-selected-model', webSearch: false, configured: true });
    fetchMock.mockResolvedValueOnce(response());
    await runMultiTurnChat({ messages: [{ role: 'user', content: 'Hi' }], model: 'gemini-3.1-pro-preview' });
    expect(requestBody().model).toBe('server-selected-model');
  });
  it('does not call any provider when the selected key is missing, even if Gemini is configured', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    expect(getAICapabilities().configured).toBe(false);
    await expect(explainTopic('attention')).rejects.toBeInstanceOf(AIUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled(); expect(geminiGenerate).not.toHaveBeenCalled();
  });
  it('rejects unsupported search before any paid request', async () => {
    await expect(runMultiTurnChat({ messages: [{ role: 'user', content: 'Latest papers' }], enableSearch: true })).rejects.toBeInstanceOf(AIUnsupportedFeatureError);
    await expect(researchTopicWithSearch('latest papers')).rejects.toBeInstanceOf(AIUnsupportedFeatureError);
    expect(fetchMock).not.toHaveBeenCalled(); expect(geminiGenerate).not.toHaveBeenCalled();
  });
  it('requests JSON with schema instructions and validates answer coaching output', async () => {
    const answer = { missingPoints: ['Scale'], inaccuracies: [], betterStructure: 'Start with motivation.', thirtySecondAnswer: 'Scale the dot product.', followUps: ['Why?'] };
    fetchMock.mockResolvedValueOnce(response(JSON.stringify(answer)));
    expect(await improveInterviewAnswer('Why scale attention?', 'For stability.')).toEqual(answer);
    expect(requestBody().response_format).toEqual({ type: 'json_object' });
    expect(requestBody().messages[0].content).toContain('JSON schema');
    expect(requestBody().messages[0].content).toContain('thirtySecondAnswer');
  });
  it('validates JD references against actual submitted titles and preserves mock output', async () => {
    const jd = { coreRequirements: [], importantSkills: [], likelyInterviewTopics: [], knowledgeGaps: [], relevantKnowledgeArticles: ['Attention', 'Invented'], relevantQuestionBankEntries: ['Why scale?', 'Fake'], suggestedPreparationChecklist: [] };
    fetchMock.mockResolvedValueOnce(response(JSON.stringify(jd)));
    const result = await analyzeJobDescription('LLM role', ['Attention'], ['Why scale?']);
    expect(result.relevantKnowledgeArticles).toEqual(['Attention']);
    expect(result.relevantQuestionBankEntries).toEqual(['Why scale?']);
    fetchMock.mockResolvedValueOnce(response(JSON.stringify({ feedback: '', nextQuestion: 'Explain KV cache.' })));
    expect(await runMockInterviewTurn('Inference', [])).toEqual({ feedback: '', nextQuestion: 'Explain KV cache.' });
  });
  it.each(['length', 'content_filter', 'aborted', 'tool_calls'])('rejects incomplete answers (%s)', async finish => {
    fetchMock.mockResolvedValueOnce(response('Partial result', finish));
    await expect(explainTopic('attention')).rejects.toThrow('incomplete');
  });
  it('rejects empty text, malformed JSON and structurally invalid output', async () => {
    fetchMock.mockResolvedValueOnce(response(' '));
    await expect(explainTopic('attention')).rejects.toThrow('empty');
    fetchMock.mockResolvedValueOnce(response('not JSON'));
    await expect(improveInterviewAnswer('Q', 'A')).rejects.toThrow();
    fetchMock.mockResolvedValueOnce(response('{}'));
    await expect(improveInterviewAnswer('Q', 'A')).rejects.toThrow();
  });
  it('does not expose provider error bodies or automatically retry/fall back', async () => {
    fetchMock.mockResolvedValueOnce(new Response('secret-provider-debug', { status: 429 }));
    await expect(explainTopic('attention')).rejects.toThrow('DeepSeek request failed.');
    expect(fetchMock).toHaveBeenCalledTimes(1); expect(geminiGenerate).not.toHaveBeenCalled();
    fetchMock.mockRejectedValueOnce(new DOMException('Timeout', 'TimeoutError'));
    await expect(explainTopic('retry manually')).rejects.toThrow('Timeout');
    expect(fetchMock).toHaveBeenCalledTimes(2); expect(geminiGenerate).not.toHaveBeenCalled();
  });
  it('fails closed for an invalid provider setting', async () => {
    vi.stubEnv('AI_PROVIDER', 'typo');
    expect(getAICapabilities).toThrow(AIUnavailableError);
    await expect(explainTopic('attention')).rejects.toThrow(AIUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('keeps Gemini an explicit alternative with its configured model and real grounding', async () => {
    vi.stubEnv('AI_PROVIDER', 'gemini');
    geminiGenerate.mockResolvedValue({ text: 'Grounded answer', candidates: [{ groundingMetadata: { groundingChunks: [{ web: { title: 'Paper', uri: 'https://example.com/paper' } }, { web: { uri: 'javascript:bad' } }], webSearchQueries: ['paper'] } }] });
    expect(getAICapabilities()).toEqual({ provider: 'gemini', model: 'test-standard', webSearch: true, configured: true });
    const result = await runMultiTurnChat({ messages: [{ role: 'user', content: 'Latest' }], enableSearch: true });
    expect(result.groundingSources).toEqual([{ title: 'Paper', url: 'https://example.com/paper' }]);
    expect(geminiGenerate.mock.calls[0][0].config.tools).toEqual([{ googleSearch: {} }]);
    await generateCompletion({ messages: [{ role: 'user', content: 'Derive' }], systemInstruction: 'Be precise.', profile: 'deep' });
    expect(geminiGenerate.mock.calls[1][0].model).toBe('test-deep');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
