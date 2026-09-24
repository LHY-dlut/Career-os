import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';
import { z } from 'zod';

export interface ChatMessage { role: 'user' | 'assistant' | 'model'; content: string }
export interface GroundingSource { title: string; url: string }
export interface MultiTurnChatResult { reply: string; modelUsed: string; groundingSources?: GroundingSource[]; webSearchQueries?: string[] }
export type ModelProfile = 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';
const strings = z.array(z.string());
const improvementSchema = z.object({ missingPoints: strings, inaccuracies: strings, betterStructure: z.string(), thirtySecondAnswer: z.string(), followUps: strings });
const jdSchema = z.object({ coreRequirements: strings, importantSkills: strings, likelyInterviewTopics: strings, knowledgeGaps: strings, relevantKnowledgeArticles: strings, relevantQuestionBankEntries: strings, suggestedPreparationChecklist: strings });
const mockSchema = z.object({ feedback: z.string(), nextQuestion: z.string(), scoreOutOf10: z.number().min(0).max(10).optional(), isComplete: z.boolean().optional() });
export type AnswerImprovementResult = z.infer<typeof improvementSchema>;
export type JDAnalysisResult = z.infer<typeof jdSchema>;
export type MockInterviewTurnResult = z.infer<typeof mockSchema>;
export class AIUnavailableError extends Error {}
function getAI() {
  if (!process.env.GEMINI_API_KEY) throw new AIUnavailableError('AI is not configured. Ask the owner to configure the server.');
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 30000 } });
}
function modelName(profile?: ModelProfile) {
  if (profile === 'gemini-3.1-pro-preview') return process.env.GEMINI_PRO_MODEL || process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  if (profile === 'gemini-3.1-flash-lite') return process.env.GEMINI_LITE_MODEL || process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  return process.env.GEMINI_MODEL || 'gemini-3.5-flash';
}
function resultText(response: GenerateContentResponse) {
  if (!response.text?.trim()) throw new Error('The provider returned an empty or blocked response.');
  return response.text;
}
function grounding(response: GenerateContentResponse) {
  const metadata = response.candidates?.[0]?.groundingMetadata;
  const groundingSources: GroundingSource[] = [];
  for (const chunk of metadata?.groundingChunks || []) {
    if (chunk.web?.uri && /^https?:\/\//i.test(chunk.web.uri)) groundingSources.push({ title: chunk.web.title || chunk.web.uri, url: chunk.web.uri });
  }
  return { groundingSources, webSearchQueries: metadata?.webSearchQueries || [] };
}
export async function runMultiTurnChat(params: { messages: ChatMessage[]; systemInstruction?: string; model?: ModelProfile; enableSearch?: boolean }): Promise<MultiTurnChatResult> {
  const model = modelName(params.enableSearch ? undefined : params.model);
  const response = await getAI().models.generateContent({
    model,
    contents: params.messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
    config: { maxOutputTokens: 4096, systemInstruction: params.systemInstruction || 'Help the user prepare for AI engineering interviews. Be accurate and state uncertainty. Do not invent sources or claim access to documents you were not given.', ...(params.enableSearch ? { tools: [{ googleSearch: {} }] } : {}) },
  });
  return { reply: resultText(response), modelUsed: model, ...grounding(response) };
}
export async function researchTopicWithSearch(topic: string) {
  const response = await getAI().models.generateContent({ model: modelName(), contents: `Research this AI engineering topic using search: ${topic}. Today is ${new Date().toISOString().slice(0, 10)}. Distinguish established results from recent developments, include dates and grounded sources, explain trade-offs and interview angles. Never invent citations.`, config: { maxOutputTokens: 4096, tools: [{ googleSearch: {} }] } });
  return { content: resultText(response), ...grounding(response) };
}
export async function explainTopic(content: string, contextTitle?: string) {
  const response = await getAI().models.generateContent({ model: modelName(), contents: `Explain this provided material for an AI engineering interview, including math and trade-offs. Use Markdown. Do not claim other local documents are available.\nTitle: ${contextTitle || 'Topic'}\n${content}`, config: { maxOutputTokens: 4096 } });
  return resultText(response);
}
async function structured<T extends z.ZodType>(prompt: string, schema: T): Promise<z.infer<T>> {
  const response = await getAI().models.generateContent({ model: modelName(), contents: prompt, config: { maxOutputTokens: 4096, responseMimeType: 'application/json', responseJsonSchema: z.toJSONSchema(schema) } });
  return schema.parse(JSON.parse(resultText(response)));
}
export async function improveInterviewAnswer(question: string, myAnswer: string): Promise<AnswerImprovementResult> {
  return structured(`Evaluate the candidate's answer precisely. Report missing points, technical inaccuracies, a better structure, a 30-second answer and follow-up questions. Do not fabricate claims.\nQuestion: ${question}\nCandidate answer: ${myAnswer}`, improvementSchema);
}
export async function analyzeJobDescription(jdText: string, availableKnowledgeTitles: string[], availableQuestionTitles: string[]): Promise<JDAnalysisResult> {
  const result = await structured(`Analyze this AI engineering job description. Extract core requirements, skills, likely interview topics, general knowledge gaps and a preparation checklist. Relevant local articles/questions MUST be exact titles from the supplied lists. Empty lists mean no local matches.\nJD: ${jdText}\nArticles: ${JSON.stringify(availableKnowledgeTitles)}\nQuestions: ${JSON.stringify(availableQuestionTitles)}`, jdSchema);
  return { ...result, relevantKnowledgeArticles: result.relevantKnowledgeArticles.filter(t => availableKnowledgeTitles.includes(t)), relevantQuestionBankEntries: result.relevantQuestionBankEntries.filter(t => availableQuestionTitles.includes(t)) };
}
export async function runMockInterviewTurn(topic: string, history: Array<{ role: 'interviewer' | 'candidate'; content: string }>, candidateAnswer?: string): Promise<MockInterviewTurnResult> {
  return structured(`Conduct a technical interview on ${topic}. Ask one question per turn. Give factual constructive feedback only if a candidate answer exists; otherwise feedback must be empty and omit a score. End after enough evidence by setting isComplete.\nHistory: ${JSON.stringify(history)}\nCandidate answer: ${candidateAnswer || '(no answer yet)'}`, mockSchema);
}
