import { collections, type CollectionName, type Dataset, type Mutation, type Repositories } from '../repositories/contracts';
import { createLocalRepositories, createStudyData, storageKey, type StoragePort } from '../repositories/local';
import { exportBackup, validateBackup } from './backup';
import { datasetSchema } from '../repositories/schemas';

const order: CollectionName[] = ['articles', 'questions', 'codingProblems', 'applications', 'mockSessions', 'reviewHistory', 'codingAttempts', 'interviews', 'interviewQuestions'];

export async function readGuestMigration(storage: StoragePort, uid: string): Promise<Dataset | null> {
  if (storage.getItem(storageKey('guest', 'data')) === null) return null;
  const guest = await createLocalRepositories(storage).load();
  const seed = datasetSchema.parse(createStudyData('guest'));
  const comparable = (record: object) => {
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = record as { createdAt?: string; updatedAt?: string };
    return JSON.stringify(rest);
  };
  const changed = collections.some(name => {
    const baseline = new Map(seed[name].map(record => [record.id, comparable(record)]));
    return guest[name].length !== seed[name].length || guest[name].some(record => baseline.get(record.id) !== comparable(record));
  });
  return changed ? validateBackup(exportBackup(guest), uid) : null;
}

async function migratedId(uid: string, collection: CollectionName, originalId: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${uid}\u0000${collection}\u0000${originalId}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return `guest-${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function guestMigrationFingerprint(guest: Dataset): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(guest)));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function planGuestMigration(guest: Dataset, cloud: Dataset, uid: string): Promise<Mutation[]> {
  const ids = new Map<string, string>();
  for (const name of collections) for (const record of guest[name]) ids.set(`${name}:${record.id}`, await migratedId(uid, name, record.id));
  const link = (name: CollectionName, id: string) => ids.get(`${name}:${id}`) ?? id;
  const mutations: Mutation[] = [];
  for (const name of order) {
    const existing = new Set(cloud[name].map(record => record.id));
    for (const record of guest[name]) {
      const id = ids.get(`${name}:${record.id}`)!;
      if (existing.has(id)) continue; // Never replace account data, including a previous partial import.
      let value: Record<string, unknown> = { ...record, id, userId: uid };
      const source = record as unknown as Record<string, unknown>;
      if (name === 'reviewHistory') value = { ...value, questionId: link('questions', String(source.questionId)) };
      if (name === 'codingAttempts') value = { ...value, problemId: link('codingProblems', String(source.problemId)) };
      if (name === 'interviews') value = { ...value, applicationId: link('applications', String(source.applicationId)) };
      if (name === 'interviewQuestions') value = { ...value, interviewId: link('interviews', String(source.interviewId)), ...(source.questionId ? { questionId: link('questions', String(source.questionId)) } : {}) };
      mutations.push({ collection: name, value } as unknown as Mutation);
    }
  }
  return mutations;
}

export async function importGuestIntoCloud(repository: Repositories, guest: Dataset, cloud: Dataset): Promise<number> {
  if (repository.mode !== 'cloud') throw new Error('Cloud workspace is required.');
  const changes = await planGuestMigration(guest, cloud, repository.identity);
  // Linked records use Firestore getAfter() rules; keep each batch below the rules access budget.
  for (let index = 0; index < changes.length;) {
    const linked = ['reviewHistory', 'codingAttempts', 'interviews', 'interviewQuestions'].includes(changes[index].collection);
    const size = linked ? 8 : 400;
    let end = index + 1;
    while (end < changes.length && end - index < size && (['reviewHistory', 'codingAttempts', 'interviews', 'interviewQuestions'].includes(changes[end].collection)) === linked) end++;
    await repository.commit(changes.slice(index, end));
    index = end;
  }
  return changes.length;
}
