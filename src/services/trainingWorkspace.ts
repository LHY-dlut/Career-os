import type { TrainingTask } from '../content/training/types';
import type { CodingAttempt, CodingDraft, CodingProblem } from '../types';
import type { Mutation } from '../repositories/contracts';

export type WorkspaceTask = Omit<TrainingTask, 'track' | 'language'> & {
  track: TrainingTask['track'] | 'personal';
  language: string;
  privateProblemId?: string;
  referenceSolution?: string;
};

export function personalTrainingTask(problem: CodingProblem): WorkspaceTask {
  return {
    id: problem.id, privateProblemId: problem.id, track: 'personal', order: 0,
    title: problem.title, category: problem.category, difficulty: problem.difficulty,
    language: problem.language, contentStatus: 'index', description: problem.problemDescription,
    inputOutput: '', examples: '', hints: [], codeTemplate: problem.codeTemplate,
    complexityAnalysis: problem.complexityAnalysis, keyPitfalls: problem.keyPitfalls,
    interviewQuestions: problem.interviewExplanation ? [problem.interviewExplanation] : [],
    referenceSolution: problem.referenceSolution, relatedResourceIds: [],
  };
}

export function findTrainingProblem(problems: CodingProblem[], identity: string, task: WorkspaceTask) {
  return problems.find(problem => problem.userId === identity && (task.privateProblemId
    ? problem.id === task.privateProblemId
    : problem.trainingTaskId === task.id && problem.language === task.language));
}

// IDs are unique across accounts even though the public task ID is shared.
export async function trainingProblemId(identity: string, taskId: string, language: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([identity, taskId, language])));
  return `training-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function trainingMutations(identity: string, task: WorkspaceTask, problems: CodingProblem[], draft: CodingDraft, attempt?: Omit<CodingAttempt, 'problemId' | 'userId' | 'problemTitle'>): Promise<Mutation[]> {
  const existing = findTrainingProblem(problems, identity, task);
  if (task.privateProblemId && !existing) throw new Error('The personal problem is no longer available.');
  const problem: CodingProblem = existing || {
    id: await trainingProblemId(identity, task.id, task.language), userId: identity,
    title: task.title, category: task.category, difficulty: task.difficulty,
    problemDescription: task.description, codeTemplate: task.codeTemplate,
    referenceSolution: '', language: task.language, complexityAnalysis: task.complexityAnalysis,
    keyPitfalls: [...task.keyPitfalls], interviewExplanation: task.interviewQuestions.join('\n'),
    trainingTaskId: task.id, trainingTrack: task.track === 'hot100' ? 'hot100' : 'pytorch',
  };
  const value = { ...problem, drafts: { ...problem.drafts, [task.language]: { ...draft } } };
  const changes: Mutation[] = [{ collection: 'codingProblems', value }];
  if (attempt) changes.push({ collection: 'codingAttempts', value: { ...attempt, userId: identity, problemId: value.id, problemTitle: value.title, language: task.language } });
  return changes;
}

export function taskAttempts(task: WorkspaceTask, identity: string, problems: CodingProblem[], attempts: CodingAttempt[]): CodingAttempt[] {
  const ids = new Set(problems.filter(problem => problem.userId === identity && (task.privateProblemId ? problem.id === task.privateProblemId : problem.trainingTaskId === task.id)).map(problem => problem.id));
  return attempts.filter(attempt => attempt.userId === identity && ids.has(attempt.problemId)).sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt));
}

export function trainingStatus(attempts: CodingAttempt[]): 'unstarted' | 'review' | 'completed' {
  if (!attempts.length) return 'unstarted';
  return attempts[0].status === 'Completed' && attempts[0].selfRating >= 3 ? 'completed' : 'review';
}

export async function loadTrainingText(path: string, signal?: AbortSignal): Promise<string> {
  if (!/^\/training\/[a-z0-9/_-]+\.py$/.test(path)) throw new Error('Invalid training file path.');
  const response = await fetch(path, { signal });
  const text = await response.text();
  if (!response.ok || /text\/html/i.test(response.headers.get('content-type') || '') || /^\s*(?:<!doctype html|<html)/i.test(text)) throw new Error('The training file could not be loaded.');
  if (text.length > 200_000) throw new Error('Training file is too large.');
  return text;
}
