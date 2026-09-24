import { z } from 'zod';
const text = z.string().max(200_000);
const id = z.string().min(1).max(128).regex(/^[^/]+$/).refine(s => s !== '.' && s !== '..');
const date = z.string().min(1).refine(s => Number.isFinite(Date.parse(s)), 'Invalid date');
const base = { id, userId: id };
const timestamps = { createdAt: date, updatedAt: date };
const strings = z.array(text).max(1000);
const nonnegative = z.number().finite().min(0);
const score = z.number().int().min(1).max(5);
const difficulty = z.enum(['Easy', 'Medium', 'Hard']);
export const entitySchemas = {
  articles: z.object({ ...base, ...timestamps, title: text.min(1), category: text, subcategory: text.optional(), tags: strings, summary: text, contentMarkdown: text }),
  questions: z.object({ ...base, ...timestamps, title: text.min(1), category: text, difficulty, tags: strings, conciseAnswer: text, detailedAnswer: text, followUps: strings, relatedKnowledgeArticles: strings.optional(), masteryLevel: z.enum(['Unseen', 'Learning', 'Reviewing', 'Mastered']), intervalDays: nonnegative, lastReviewedAt: date.optional(), nextReviewAt: date.optional(), reviewCount: nonnegative.int() }),
  reviewHistory: z.object({ ...base, questionId: id, questionTitle: text, reviewedAt: date, rating: z.enum(['Again', 'Hard', 'Good', 'Easy']), previousInterval: nonnegative, newInterval: nonnegative }),
  codingProblems: z.object({ ...base, title: text.min(1), category: text, difficulty, problemDescription: text, codeTemplate: text, referenceSolution: text, language: text, complexityAnalysis: text, keyPitfalls: strings, interviewExplanation: text }),
  codingAttempts: z.object({ ...base, problemId: id, problemTitle: text, attemptedAt: date, userCode: text, durationMinutes: nonnegative, status: z.enum(['Completed', 'Struggled', 'Partial', 'Abandoned']), selfRating: score, notes: text }),
  applications: z.object({ ...base, ...timestamps, company: text.min(1), department: text, position: text.min(1), jobType: z.enum(['Full-time', 'Internship', 'Contract', 'Remote']), location: text, jobDescription: text, source: text, resumeVersion: text, applicationDate: date, status: z.enum(['Wishlist', 'Applied', 'Assessment', 'Interviewing', 'Offer', 'Rejected', 'Withdrawn']), priority: z.enum(['Low', 'Medium', 'High']), notes: text }),
  interviews: z.object({ ...base, applicationId: id, companyName: text, position: text, roundNumber: z.number().int().positive(), roundName: text, scheduledAt: date, durationMinutes: nonnegative, result: z.enum(['Scheduled', 'Pending', 'Passed', 'Failed', 'Cancelled']), overallSelfRating: score.optional(), retrospective: text, rawNotes: text, createdAt: date }),
  interviewQuestions: z.object({ ...base, interviewId: id, questionId: id.optional(), customQuestion: text.optional(), myAnswer: text, betterAnswer: text, performanceScore: score, notes: text, createdAt: date }),
  mockSessions: z.object({ ...base, topic: text, messages: z.array(z.object({ role: z.enum(['interviewer', 'candidate']), content: text, feedback: text.optional(), score: z.number().finite().optional(), timestamp: date })), overallScore: z.number().finite().optional(), feedbackSummary: text.optional(), createdAt: date }),
};
export const datasetSchema = z.object({
  articles: z.array(entitySchemas.articles).max(10000), questions: z.array(entitySchemas.questions).max(10000),
  reviewHistory: z.array(entitySchemas.reviewHistory).max(10000), codingProblems: z.array(entitySchemas.codingProblems).max(10000),
  codingAttempts: z.array(entitySchemas.codingAttempts).max(10000), applications: z.array(entitySchemas.applications).max(10000),
  interviews: z.array(entitySchemas.interviews).max(10000), interviewQuestions: z.array(entitySchemas.interviewQuestions).max(10000),
  mockSessions: z.array(entitySchemas.mockSessions).max(10000).default([]),
});
