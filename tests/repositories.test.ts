import { describe, expect, it, vi } from 'vitest';
import { createLocalRepositories, createStudyData, storageKey, type StoragePort } from '../src/repositories/local';
import { selectRepositories } from '../src/repositories';
import { exportBackup, restoreGuestBackup, resetGuestData, validateBackup } from '../src/services/backup';
import { calculateNextReview } from '../src/utils/reviewScheduler';

export function memoryStorage(): StoragePort {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
}
describe('identity-scoped repositories', () => {
  it('never constructs the cloud adapter for guest', async () => {
    const local = createLocalRepositories(memoryStorage());
    const cloud = vi.fn();
    expect(await selectRepositories(null, { local: () => local, cloud })).toBe(local);
    expect(cloud).not.toHaveBeenCalled();
  });
  it('selects cloud for a signed-in account without local fallback', async () => {
    const local = vi.fn();
    const cloud = vi.fn().mockRejectedValue(new Error('permission denied'));
    await expect(selectRepositories('alice', { local, cloud })).rejects.toThrow('permission denied');
    expect(cloud).toHaveBeenCalledWith('alice'); expect(local).not.toHaveBeenCalled();
  });
  it('isolates guest/alice/bob, rejects spoofing, preserves intentional empty datasets', async () => {
    const storage = memoryStorage();
    const guest = createLocalRepositories(storage);
    const alice = createLocalRepositories(storage, 'alice');
    const bob = createLocalRepositories(storage, 'bob');
    const data = await guest.load();
    const article = { ...data.articles[0], id: 'new', userId: 'alice', title: 'Private' };
    await alice.entities.articles.save(article);
    expect((await bob.load()).articles).toEqual([]);
    expect((await guest.load()).articles.some(a => a.id === 'new')).toBe(false);
    await expect(guest.entities.articles.save(article)).rejects.toThrow('different account');
    await alice.entities.articles.remove('new');
    expect((await createLocalRepositories(storage, 'alice').load()).articles).toEqual([]);
    await guest.commit(data.questions.map(q => ({ collection: 'questions', deleteId: q.id })));
    expect((await guest.load()).questions).toEqual([]);
  });
  it('does not fabricate review, coding or career activity from starter content', async () => {
    const data = await createLocalRepositories(memoryStorage()).load();
    expect(data.questions.every(q => q.masteryLevel === 'Unseen' && q.reviewCount === 0)).toBe(true);
    expect([data.applications, data.interviews, data.reviewHistory, data.codingAttempts].flat()).toEqual([]);
  });
  it('allocates distinct cloud starter IDs across accounts', () => {
    let sequence = 0;
    const makeId = () => `unique-${++sequence}`;
    const alice = Object.values(createStudyData('alice', makeId)).flat();
    const bob = Object.values(createStudyData('bob', makeId)).flat();
    expect(alice.every(record => record.userId === 'alice')).toBe(true);
    expect(bob.every(record => record.userId === 'bob')).toBe(true);
    expect(new Set([...alice, ...bob].map(record => record.id)).size).toBe(alice.length + bob.length);
  });
  it('keeps review and history together, and rejects quota failure without partial writes', async () => {
    const storage = memoryStorage(); const repo = createLocalRepositories(storage);
    const before = await repo.load();
    const { updatedQuestion, reviewEntry } = calculateNextReview(before.questions[0], 'Good', new Date('2026-09-24T00:00:00Z'), 'review-1');
    await repo.commit([{ collection: 'questions', value: updatedQuestion }, { collection: 'reviewHistory', value: reviewEntry }]);
    const after = await repo.load();
    expect(after.reviewHistory[0].questionId).toBe(updatedQuestion.id);
    expect(after.questions[0].reviewCount).toBe(1);
    const failStorage = { ...storage, setItem: () => { throw new Error('QuotaExceededError'); } };
    await expect(createLocalRepositories(failStorage).entities.questions.remove(updatedQuestion.id)).rejects.toThrow('QuotaExceededError');
    expect(await repo.load()).toEqual(after);
  });
});
describe('backup / restore / reset', () => {
  it('round trips all collections and rebinds owners on guest restore', () => {
    const data = createStudyData('alice');
    const imported = validateBackup(exportBackup(data));
    expect(imported.articles[0].userId).toBe('guest');
    expect(imported.articles[0].id).toBe(data.articles[0].id);
  });
  it.each(['{}', '{', JSON.stringify({ version: '100.0' })])('rejects invalid backup without touching saved data (%s)', json => {
    const storage = memoryStorage(); storage.setItem(storageKey('guest', 'data'), 'sentinel');
    expect(() => restoreGuestBackup(storage, json)).toThrow();
    expect(storage.getItem(storageKey('guest', 'data'))).toBe('sentinel');
  });
  it('rejects duplicate IDs, malformed records and dangling relations', () => {
    const data = createStudyData('guest');
    const raw = JSON.parse(exportBackup(data));
    raw.questions.push(raw.questions[0]);
    expect(() => validateBackup(JSON.stringify(raw))).toThrow('Duplicate');
    raw.questions.pop(); raw.questions[0].tags = 'invalid';
    expect(() => validateBackup(JSON.stringify(raw))).toThrow();
    raw.questions[0].tags = [];
    raw.reviewHistory.push({ id: 'r', userId: 'guest', questionId: 'missing', questionTitle: 'Deleted', reviewedAt: '2026-09-24T00:00:00Z', rating: 'Good', previousInterval: 1, newInterval: 3 });
    expect(() => validateBackup(JSON.stringify(raw))).toThrow('missing linked');
  });
  it('reset changes only guest data and leaves other users, themes and unrelated keys untouched', () => {
    const storage = memoryStorage();
    storage.setItem('unrelated', 'keep'); storage.setItem(storageKey('alice', 'data'), 'private'); storage.setItem(storageKey('guest', 'theme'), 'light');
    resetGuestData(storage);
    expect(storage.getItem('unrelated')).toBe('keep');
    expect(storage.getItem(storageKey('alice', 'data'))).toBe('private');
    expect(storage.getItem(storageKey('guest', 'theme'))).toBe('light');
    expect(JSON.parse(storage.getItem(storageKey('guest', 'data'))!).articles[0].id).toBeTruthy();
  });
});
