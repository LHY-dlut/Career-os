import express, { Router, Request, Response } from 'express';
import {
  explainTopic,
  improveInterviewAnswer,
  analyzeJobDescription,
  runMockInterviewTurn,
  runMultiTurnChat,
  researchTopicWithSearch,
} from './geminiService';

export const apiRouter = Router();

apiRouter.use(express.json({ limit: '10mb' }));

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

apiRouter.post('/copilot/chat', async (req: Request, res: Response) => {
  try {
    const { messages, systemInstruction, model, enableSearch } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }
    const result = await runMultiTurnChat({
      messages,
      systemInstruction,
      model,
      enableSearch: Boolean(enableSearch),
    });
    res.json(result);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

apiRouter.post('/copilot/search-research', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      res.status(400).json({ error: 'topic is required' });
      return;
    }
    const result = await researchTopicWithSearch(topic);
    res.json(result);
  } catch (error: any) {
    console.error('Search research error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

apiRouter.post('/copilot/explain', async (req: Request, res: Response) => {
  try {
    const { content, contextTitle } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    const explanation = await explainTopic(content, contextTitle);
    res.json({ explanation });
  } catch (error: any) {
    console.error('Explain error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

apiRouter.post('/copilot/improve', async (req: Request, res: Response) => {
  try {
    const { question, myAnswer } = req.body;
    if (!question || !myAnswer) {
      res.status(400).json({ error: 'Question and myAnswer are required' });
      return;
    }
    const result = await improveInterviewAnswer(question, myAnswer);
    res.json(result);
  } catch (error: any) {
    console.error('Improve error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

apiRouter.post('/copilot/jd-analyze', async (req: Request, res: Response) => {
  try {
    const { jdText, availableKnowledgeTitles = [], availableQuestionTitles = [] } = req.body;
    if (!jdText) {
      res.status(400).json({ error: 'jdText is required' });
      return;
    }
    const result = await analyzeJobDescription(
      jdText,
      availableKnowledgeTitles,
      availableQuestionTitles
    );
    res.json(result);
  } catch (error: any) {
    console.error('JD analyze error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

apiRouter.post('/copilot/mock-interview', async (req: Request, res: Response) => {
  try {
    const { topic, history = [], candidateAnswer } = req.body;
    if (!topic) {
      res.status(400).json({ error: 'Topic is required' });
      return;
    }
    const result = await runMockInterviewTurn(topic, history, candidateAnswer);
    res.json(result);
  } catch (error: any) {
    console.error('Mock interview error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
