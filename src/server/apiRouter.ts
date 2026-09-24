import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import * as ai from './geminiService.ts';
import { requireIdentity, type VerifyToken } from './security.ts';

const text = z.string().trim().min(1).max(30000);
const chatSchema = z.object({ messages: z.array(z.object({ role: z.enum(['user', 'assistant', 'model']), content: text })).min(1).max(40).refine(messages => messages.reduce((n, m) => n + m.content.length, 0) <= 60000, 'Conversation is too long.'), systemInstruction: z.string().max(8000).optional(), model: z.enum(['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite']).optional(), enableSearch: z.boolean().optional() }).strict();
const titles = z.array(z.string().max(500)).max(200).default([]);
export function createApiRouter(options: { verifyToken: VerifyToken; allowedUids: string[]; rateLimit?: number }) {
  const router = Router();
  router.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  router.use('/copilot', rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Retry in a minute.' } }));
  router.use('/copilot', requireIdentity(options.verifyToken, options.allowedUids));
  router.use('/copilot', rateLimit({ windowMs: 60000, limit: options.rateLimit ?? 10, keyGenerator: (_req, res) => res.locals.uid, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'AI minute limit reached. Retry later.' } }));
  router.use('/copilot', rateLimit({ windowMs: 86400000, limit: 100, keyGenerator: (_req, res) => res.locals.uid, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'AI daily limit reached.' } }));
  router.use('/copilot', rateLimit({ windowMs: 86400000, limit: 300, keyGenerator: () => 'global', standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Workspace AI daily limit reached.' } }));
  router.use(express.json({ limit: '128kb' }));
  function post<T extends z.ZodType>(path: string, schema: T, handler: (input: z.infer<T>) => Promise<unknown>) {
    router.post(path, async (req, res) => {
      const result = schema.safeParse(req.body);
      if (!result.success) { res.status(400).json({ error: 'Invalid request. Check required fields and input length.' }); return; }
      try { res.json(await handler(result.data)); }
      catch (error) {
        if (error instanceof ai.AIUnavailableError) { res.status(503).json({ error: error.message }); return; }
        // Never send provider exceptions, credentials, request bodies or fabricated output to the client.
        console.error('AI request failed:', error instanceof Error ? error.name : 'UnknownError');
        res.status(502).json({ error: 'The AI provider could not complete this request. Please retry.' });
      }
    });
  }
  post('/copilot/chat', chatSchema, ai.runMultiTurnChat);
  post('/copilot/search-research', z.object({ topic: text }).strict(), input => ai.researchTopicWithSearch(input.topic));
  post('/copilot/explain', z.object({ content: text, contextTitle: z.string().max(500).optional() }).strict(), async input => ({ explanation: await ai.explainTopic(input.content, input.contextTitle) }));
  post('/copilot/improve', z.object({ question: text, myAnswer: text }).strict(), input => ai.improveInterviewAnswer(input.question, input.myAnswer));
  post('/copilot/jd-analyze', z.object({ jdText: text, availableKnowledgeTitles: titles, availableQuestionTitles: titles }).strict(), input => ai.analyzeJobDescription(input.jdText, input.availableKnowledgeTitles, input.availableQuestionTitles));
  post('/copilot/mock-interview', z.object({ topic: text, history: z.array(z.object({ role: z.enum(['interviewer', 'candidate']), content: z.string().max(5000) })).max(20).default([]), candidateAnswer: text.optional() }).strict(), input => ai.runMockInterviewTurn(input.topic, input.history, input.candidateAnswer));
  return router;
}
