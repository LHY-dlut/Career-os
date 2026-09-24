import { SEED_ARTICLES, SEED_QUESTIONS, SEED_CODING_PROBLEMS } from '../services/seedData';
import { applyMutations, emptyDataset, entityRepositories, type Dataset, type Repositories } from './contracts';
import { datasetSchema, entitySchemas } from './schemas';
export type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const storageKey = (identity: string, key: string) => `ai_career_os:${encodeURIComponent(identity)}:${key}`;
export function createStudyData(identity: string, newId?: () => string): Dataset {
  return {
    ...emptyDataset(),
    articles: SEED_ARTICLES.map((a, i) => ({ ...a, id: newId?.() || `seed-art-${i + 1}`, userId: identity })),
    questions: SEED_QUESTIONS.map((q, i) => ({ ...q, id: newId?.() || `seed-q-${i + 1}`, userId: identity, masteryLevel: 'Unseen', intervalDays: 1, reviewCount: 0, lastReviewedAt: undefined, nextReviewAt: undefined })),
    codingProblems: SEED_CODING_PROBLEMS.map((p, i) => ({ ...p, id: newId?.() || `seed-p-${i + 1}`, userId: identity })),
  };
}
export function createLocalRepositories(storage: StoragePort, identity = 'guest'): Repositories {
  const key = storageKey(identity, 'data');
  const read = (): Dataset => {
    const saved = storage.getItem(key);
    if (saved !== null) return datasetSchema.parse(JSON.parse(saved));
    const data = identity === 'guest' ? createStudyData(identity) : emptyDataset();
    storage.setItem(key, JSON.stringify(data));
    return data;
  };
  const load: Repositories['load'] = async () => read();
  const commit: Repositories['commit'] = async changes => {
    for (const change of changes) {
      if ('value' in change) {
        entitySchemas[change.collection].parse(change.value);
        if (change.value.userId !== identity) throw new Error('Record belongs to a different account.');
      }
    }
    // One write: quota failure leaves the previous snapshot intact.
    storage.setItem(key, JSON.stringify(applyMutations(read(), changes)));
  };
  return { mode: 'local', identity, load, commit, entities: entityRepositories(load, commit) };
}
export function replaceLocalData(storage: StoragePort, identity: string, data: Dataset) {
  const validated = datasetSchema.parse(data);
  if (Object.values(validated).flat().some(record => record.userId !== identity)) throw new Error('Backup identity mismatch.');
  storage.setItem(storageKey(identity, 'data'), JSON.stringify(validated));
}
export function readTheme(identity: string): 'dark' | 'light' {
  try { return localStorage.getItem(storageKey(identity, 'theme')) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}
export function writeTheme(identity: string, theme: 'dark' | 'light') {
  localStorage.setItem(storageKey(identity, 'theme'), theme);
}
