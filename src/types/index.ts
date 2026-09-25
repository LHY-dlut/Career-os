export type Theme = 'light' | 'dark' | 'system';

export type KnowledgeCategory =
  | '01 Transformer'
  | '02 LLM'
  | '03 RAG'
  | '04 Agent'
  | '05 Text-to-SQL'
  | '06 Machine Learning'
  | '07 Deep Learning'
  | '08 NLP';

export interface KnowledgeArticle {
  id: string;
  userId: string;
  title: string;
  category: KnowledgeCategory | string;
  subcategory?: string;
  tags: string[];
  summary: string;
  contentMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestionCategory =
  | 'Transformer'
  | 'LLM'
  | 'RAG'
  | 'Agent'
  | 'Text-to-SQL'
  | 'Machine Learning'
  | 'Deep Learning'
  | 'NLP'
  | 'Inference'
  | 'Project Deep Dive'
  | 'System Design';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type MasteryLevel = 'Unseen' | 'Learning' | 'Reviewing' | 'Mastered';

export interface Question {
  id: string;
  userId: string;
  title: string;
  category: QuestionCategory | string;
  difficulty: Difficulty;
  tags: string[];
  conciseAnswer: string; // 30-second elevator pitch
  detailedAnswer: string; // Thorough technical explanation
  followUps: string[]; // Possible interviewer follow-up questions
  relatedKnowledgeArticles?: string[]; // IDs or titles of related knowledge articles
  masteryLevel: MasteryLevel;
  intervalDays: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ReviewRating = 'Again' | 'Hard' | 'Good' | 'Easy';

export interface ReviewHistory {
  id: string;
  userId: string;
  questionId: string;
  questionTitle: string;
  reviewedAt: string;
  rating: ReviewRating;
  previousInterval: number;
  newInterval: number;
}

export type CodingCategory =
  | 'LLM From Scratch'
  | 'RAG From Scratch'
  | 'Agent From Scratch'
  | 'LeetCode Hot 100'
  | 'ACM / Coding Interview'
  | 'Text-to-SQL';

export interface CodingDraft {
  code: string;
  updatedAt: string;
  elapsedSeconds: number;
}

export interface CodingProblem {
  id: string;
  userId: string;
  title: string;
  category: CodingCategory | string;
  difficulty: Difficulty;
  problemDescription: string;
  codeTemplate: string;
  referenceSolution: string;
  language: string;
  complexityAnalysis: string;
  keyPitfalls: string[];
  interviewExplanation: string;
  trainingTaskId?: string;
  trainingTrack?: 'hot100' | 'pytorch';
  drafts?: Record<string, CodingDraft>;
}

export interface CodingAttempt {
  id: string;
  userId: string;
  problemId: string;
  problemTitle: string;
  attemptedAt: string;
  userCode: string;
  durationMinutes: number;
  status: 'Completed' | 'Struggled' | 'Partial' | 'Abandoned';
  selfRating: number; // 1-5
  notes: string;
  language?: string;
  errorReason?: string;
  verification?: 'not-run' | 'local-samples-reported' | 'leetcode-accepted-reported';
}

export type ApplicationStage =
  | 'Wishlist'
  | 'Applied'
  | 'Assessment'
  | 'Interviewing'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export type Priority = 'Low' | 'Medium' | 'High';

export interface Application {
  id: string;
  userId: string;
  company: string;
  department: string;
  position: string;
  jobType: 'Full-time' | 'Internship' | 'Contract' | 'Remote';
  location: string;
  jobDescription: string;
  source: string;
  resumeVersion: string;
  applicationDate: string;
  status: ApplicationStage;
  priority: Priority;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type InterviewResult = 'Scheduled' | 'Pending' | 'Passed' | 'Failed' | 'Cancelled';

export interface Interview {
  id: string;
  userId: string;
  applicationId: string;
  companyName: string;
  position: string;
  roundNumber: number;
  roundName: string; // e.g. "Tech Screen", "LLM Deep Dive", "System Design", "HR"
  scheduledAt: string;
  durationMinutes: number;
  result: InterviewResult;
  overallSelfRating?: number; // 1-5
  retrospective: string;
  rawNotes: string;
  createdAt: string;
}

export interface InterviewQuestion {
  id: string;
  userId: string;
  interviewId: string;
  questionId?: string; // If linked to Question Bank
  customQuestion?: string;
  myAnswer: string;
  betterAnswer: string;
  performanceScore: number; // 1-5
  notes: string;
  createdAt: string;
}

export interface MockInterviewSession {
  id: string;
  userId: string;
  topic: string;
  messages: Array<{
    role: 'interviewer' | 'candidate';
    content: string;
    feedback?: string;
    score?: number;
    timestamp: string;
  }>;
  overallScore?: number;
  feedbackSummary?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  theme: Theme;
}
