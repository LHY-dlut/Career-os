import { describe, expect, it, vi } from 'vitest';
import { createLocalRepositories, type StoragePort } from '../src/repositories/local';
import { emptyDataset, type Repositories } from '../src/repositories/contracts';
import { guestMigrationFingerprint, importGuestIntoCloud, planGuestMigration, readGuestMigration } from '../src/services/guestMigration';

function memoryStorage(): StoragePort {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
}

describe('guest-to-account migration', () => {
  it('ignores untouched starter data and detects personal edits', async () => {
    const storage = memoryStorage();
    expect(await readGuestMigration(storage, 'alice')).toBeNull();
    const guest = createLocalRepositories(storage);
    const data = await guest.load();
    expect(await readGuestMigration(storage, 'alice')).toBeNull();
    await guest.entities.articles.save({ ...data.articles[0], title: 'My note' });
    const migration = await readGuestMigration(storage, 'alice');
    expect(migration?.articles[0].userId).toBe('alice');
    expect(migration?.articles[0].title).toBe('My note');
    expect((await guest.load()).articles[0].userId).toBe('guest');
  });

  it('remaps linked IDs, leaves cloud collisions untouched, and is retry-safe', async () => {
    const storage = memoryStorage();
    const guestRepo = createLocalRepositories(storage);
    const guest = await guestRepo.load();
    const question = guest.questions[0];
    await guestRepo.commit([{ collection: 'reviewHistory', value: { id: 'review-1', userId: 'guest', questionId: question.id, questionTitle: question.title, reviewedAt: '2026-09-29T00:00:00Z', rating: 'Good', previousInterval: 1, newInterval: 3 } }]);
    const source = (await readGuestMigration(storage, 'alice'))!;
    const first = await planGuestMigration(source, emptyDataset(), 'alice');
    const importedQuestion = first.find(change => change.collection === 'questions' && 'value' in change && change.value.title === question.title);
    const review = first.find(change => change.collection === 'reviewHistory' && 'value' in change);
    expect(importedQuestion && 'value' in importedQuestion && review && 'value' in review && review.value.questionId).toBe(importedQuestion && 'value' in importedQuestion && importedQuestion.value.id);
    const cloud = emptyDataset();
    cloud.questions = first.filter(change => change.collection === 'questions' && 'value' in change).map(change => ('value' in change ? change.value : question) as typeof question);
    const retry = await planGuestMigration(source, cloud, 'alice');
    expect(retry.some(change => change.collection === 'questions')).toBe(false);
    expect(await guestMigrationFingerprint(source)).toHaveLength(64);
    const commit = vi.fn().mockResolvedValue(undefined);
    const repository = { mode: 'cloud', identity: 'alice', commit } as unknown as Repositories;
    expect(await importGuestIntoCloud(repository, source, cloud)).toBe(retry.length);
    expect(commit).toHaveBeenCalledTimes(2);
    expect(commit.mock.calls[0][0].every((change: { collection: string }) => !['reviewHistory', 'codingAttempts', 'interviews', 'interviewQuestions'].includes(change.collection))).toBe(true);
    expect((await guestRepo.load()).reviewHistory).toHaveLength(1);
  });
});
