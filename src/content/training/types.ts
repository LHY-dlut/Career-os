import type { Difficulty } from '../../types';

/** Public task content. Private drafts and attempts are stored separately. */
export interface TrainingTask {
  id: string;
  track: 'hot100' | 'pytorch';
  order: number;
  number?: number;
  title: string;
  titleEn?: string;
  category: string;
  difficulty: Difficulty;
  language: 'Python';
  contentStatus: 'complete' | 'index';
  description: string;
  inputOutput: string;
  examples: string;
  hints: string[];
  codeTemplate: string;
  referencePath?: string;
  testPath?: string;
  complexityAnalysis: string;
  keyPitfalls: string[];
  interviewQuestions: string[];
  relatedResourceIds: string[];
  sourceUrl?: string;
  verifiedAt?: string;
}
