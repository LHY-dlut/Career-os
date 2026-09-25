import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';
import { z } from 'zod';

export type ModelProfile = 'standard' | 'deep' | 'fast' | 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';
export interface ChatMessage { role: 'user' | 'assistant' | 'model'; content: string }
export interface GroundingSource { title: string; url: string }
export interface Completion { text: string; modelUsed: string; groundingSources: GroundingSource[]; webSearchQueries: string[] }
export class AIUnavailableError extends Error {}
export class AIUnsupportedFeatureError extends Error {}

function providerName(): 'deepseek' | 'gemini' {
  const provider = process.env.AI_PROVIDER?.trim() || 'deepseek';
  if (provider !== 'deepseek' && provider !== 'gemini') throw new AIUnavailableError('The AI provider setting is invalid. Ask the owner to check the server configuration.');
  return provider;
}
function modelName(provider: 'deepseek' | 'gemini', profile?: ModelProfile) {
  if (provider === 'deepseek') return process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash';
  const standard = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';
  if (profile === 'deep' || profile === 'gemini-3.1-pro-preview') return process.env.GEMINI_PRO_MODEL?.trim() || standard;
  if (profile === 'fast' || profile === 'gemini-3.1-flash-lite') return process.env.GEMINI_LITE_MODEL?.trim() || standard;
  return standard;
}
export function getAICapabilities() {
  const provider = providerName();
  return { provider, model: modelName(provider), webSearch: provider === 'gemini', configured: Boolean((provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.GEMINI_API_KEY)?.trim()) };
}

interface GenerateOptions {
  messages: ChatMessage[];
  systemInstruction: string;
  profile?: ModelProfile;
  enableSearch?: boolean;
  jsonSchema?: Record<string, unknown>;
}
const deepSeekResponse = z.object({
  model: z.string().min(1).max(200),
  choices: z.array(z.object({ finish_reason: z.string(), message: z.object({ content: z.string().nullable() }) })).min(1),
});

export async function generateCompletion(options: GenerateOptions): Promise<Completion> {
  const provider = providerName();
  const model = modelName(provider, options.enableSearch ? undefined : options.profile);
  if (provider === 'deepseek') {
    // This endpoint has no hosted search tool. Never silently substitute ungrounded text.
    if (options.enableSearch) throw new AIUnsupportedFeatureError('Web research is not available with the configured DeepSeek API. Regular AI chat is available.');
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) throw new AIUnavailableError('DeepSeek is not configured. Ask the owner to set DEEPSEEK_API_KEY on the server.');
    const system = `${options.systemInstruction}\nYou have no live web search in this request. Do not claim to have searched or verified current sources.${options.jsonSchema ? `\nReturn only a JSON object matching this JSON schema: ${JSON.stringify(options.jsonSchema)}` : ''}`;
    // Fixed provider origin prevents an accidental credential-bearing request to an arbitrary host.
    // No retries or fallback: a failed request must not silently trigger another paid request.
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      redirect: 'error',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, ...options.messages.map(message => ({ role: message.role === 'user' ? 'user' : 'assistant', content: message.content }))],
        thinking: { type: 'disabled' },
        max_tokens: 4096,
        stream: false,
        ...(options.jsonSchema ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!response.ok) throw new Error('DeepSeek request failed.');
    const result = deepSeekResponse.parse(await response.json());
    const choice = result.choices[0];
    if (choice.finish_reason !== 'stop' || !choice.message.content?.trim()) throw new Error('DeepSeek returned an incomplete, empty or blocked answer.');
    return { text: choice.message.content, modelUsed: result.model, groundingSources: [], webSearchQueries: [] };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AIUnavailableError('Gemini is not configured. Ask the owner to set GEMINI_API_KEY on the server.');
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 30000 } });
  const response = await ai.models.generateContent({
    model,
    contents: options.messages.map(message => ({ role: message.role === 'user' ? 'user' : 'model', parts: [{ text: message.content }] })),
    config: { maxOutputTokens: 4096, systemInstruction: options.systemInstruction, ...(options.enableSearch ? { tools: [{ googleSearch: {} }] } : {}), ...(options.jsonSchema ? { responseMimeType: 'application/json', responseJsonSchema: options.jsonSchema } : {}) },
  });
  if (!response.text?.trim()) throw new Error('The provider returned an empty or blocked response.');
  return { text: response.text, modelUsed: model, ...grounding(response) };
}

function grounding(response: GenerateContentResponse) {
  const metadata = response.candidates?.[0]?.groundingMetadata;
  const groundingSources: GroundingSource[] = [];
  for (const chunk of metadata?.groundingChunks || []) {
    if (chunk.web?.uri && /^https?:\/\//i.test(chunk.web.uri)) groundingSources.push({ title: chunk.web.title || chunk.web.uri, url: chunk.web.uri });
  }
  return { groundingSources, webSearchQueries: metadata?.webSearchQueries || [] };
}
