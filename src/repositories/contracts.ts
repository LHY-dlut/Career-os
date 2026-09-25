import type { KnowledgeArticle, Question, ReviewHistory, CodingProblem, CodingAttempt, Application, Interview, InterviewQuestion, MockInterviewSession } from '../types';

export interface EntityMap {
  articles: KnowledgeArticle;
  questions: Question;
  reviewHistory: ReviewHistory;
  codingProblems: CodingProblem;
  codingAttempts: CodingAttempt;
  applications: Application;
  interviews: Interview;
  interviewQuestions: InterviewQuestion;
  mockSessions: MockInterviewSession;
}
export type CollectionName = keyof EntityMap;
export type Dataset = { [K in CollectionName]: EntityMap[K][] };
export const collections: CollectionName[] = ['articles', 'questions', 'reviewHistory', 'codingProblems', 'codingAttempts', 'applications', 'interviews', 'interviewQuestions', 'mockSessions'];
export const emptyDataset = (): Dataset => Object.fromEntries(collections.map(key => [key, []])) as unknown as Dataset;
export type Mutation = { [K in CollectionName]: { collection: K; value: EntityMap[K] } }[CollectionName] | { collection: CollectionName; deleteId: string };
export interface EntityRepository<T> {
  list(): Promise<T[]>;
  save(value: T): Promise<void>;
  remove(id: string): Promise<void>;
}
export type KnowledgeRepository = EntityRepository<KnowledgeArticle>;
export type QuestionRepository = EntityRepository<Question>;
export type ReviewRepository = EntityRepository<ReviewHistory>;
export type CodingRepository = EntityRepository<CodingProblem>;
export type ApplicationRepository = EntityRepository<Application>;
export type InterviewRepository = EntityRepository<Interview>;
export interface Repositories {
  mode: 'local' | 'cloud';
  identity: string;
  entities: { [K in CollectionName]: EntityRepository<EntityMap[K]> };
  load(): Promise<Dataset>;
  commit(changes: Mutation[]): Promise<void>;
}
export function applyMutations(data: Dataset, changes: Mutation[]): Dataset {
  const next = { ...data };
  for (const change of changes) {
    const id = 'value' in change ? change.value.id : change.deleteId;
    const records = (next[change.collection] as Array<EntityMap[CollectionName]>).filter(item => item.id !== id);
    if ('value' in change) records.unshift(change.value);
    Object.assign(next, { [change.collection]: records });
  }
  return next;
}
export function entityRepositories(load: Repositories['load'], commit: Repositories['commit']): Repositories['entities'] {
  return Object.fromEntries(collections.map(collection => [collection, {
    list: async () => (await load())[collection],
    save: (value: EntityMap[CollectionName]) => commit([{ collection, value } as Mutation]),
    remove: (deleteId: string) => commit([{ collection, deleteId }]),
  }])) as Repositories['entities'];
}
