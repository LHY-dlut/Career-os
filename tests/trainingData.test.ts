import { describe, expect, it, vi } from 'vitest';
import { createLocalRepositories, createStudyData, storageKey, type StoragePort } from '../src/repositories/local';
import { createTrainingRecovery } from '../src/repositories/trainingRecovery';
import { exportBackup, resetGuestData, restoreGuestBackup, validateBackup } from '../src/services/backup';
import { findTrainingProblem, loadTrainingText, taskAttempts, trainingMutations, trainingProblemId, trainingStatus, type WorkspaceTask } from '../src/services/trainingWorkspace';
import type { CodingDraft } from '../src/types';

export const sampleTask: WorkspaceTask = { id: 'lc-1', track: 'hot100', order: 1, number: 1, title: '两数之和', titleEn: 'Two Sum', category: '哈希', difficulty: 'Easy', language: 'Python', contentStatus: 'complete', description: '找出一对下标。', inputOutput: 'nums: list[int], target: int', examples: '[2, 6, 4], target=8 → [0,1]', hints: ['记录已经读到的数。'], codeTemplate: 'def solve(nums, target):\n    raise NotImplementedError\n', referencePath: '/training/hot100/lc-1/reference.py', testPath: '/training/hot100/lc-1/test_solution.py', complexityAnalysis: 'O(n)', keyPitfalls: ['不能重复使用同一位置'], interviewQuestions: ['如何处理重复值？'], relatedResourceIds: [] };
const draft: CodingDraft = { code: '# private code\n', updatedAt: '2026-09-25T10:00:00Z', elapsedSeconds: 72 };
const attempt = { id: 'attempt-1', attemptedAt: '2026-09-25T10:01:00Z', userCode: draft.code, durationMinutes: 1.2, status: 'Completed' as const, selfRating: 4, notes: 'understood', verification: 'not-run' as const, errorReason: '' };
function storage(): StoragePort { const values = new Map<string, string>(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } }; }

describe('public tasks and private records', () => {
  it('derives stable, globally distinct problem IDs for account/task/language', async () => {
    const alice = await trainingProblemId('alice', 'lc-1', 'Python');
    expect(alice).toBe(await trainingProblemId('alice', 'lc-1', 'Python'));
    expect(new Set(await Promise.all([['bob', 'lc-1', 'Python'], ['alice', 'lc-2', 'Python'], ['alice', 'lc-1', 'Java'], ['alice', 'lc-1', 'Python']].map(args => trainingProblemId(...args as [string, string, string])))).size).toBe(4);
    expect(alice).toMatch(/^training-[a-f0-9]{64}$/);
  });
  it('saves only the practiced problem and its attempt atomically, and keeps snapshot fields on later edits', async () => {
    const store = storage(); const repo = createLocalRepositories(store, 'alice');
    const changes = await trainingMutations('alice', sampleTask, [], draft, attempt);
    expect(changes.map(change => change.collection)).toEqual(['codingProblems', 'codingAttempts']);
    await repo.commit(changes);
    const data = await repo.load();
    expect(data.codingProblems).toHaveLength(1);
    expect(data.codingAttempts[0].problemId).toBe(data.codingProblems[0].id);
    const edited = { ...data.codingProblems[0], title: 'My custom explanation', referenceSolution: 'personal reference' };
    await repo.entities.codingProblems.save(edited);
    await repo.commit(await trainingMutations('alice', sampleTask, [edited], { ...draft, code: '# second draft' }));
    const updated = await repo.load();
    expect(updated.codingProblems[0].title).toBe('My custom explanation');
    expect(updated.codingProblems[0].referenceSolution).toBe('personal reference');
    expect(updated.codingAttempts[0].userCode).toBe(draft.code);
    expect(updated.codingProblems[0].drafts?.Python.code).toBe('# second draft');
    expect((await createLocalRepositories(store, 'bob').load()).codingProblems).toEqual([]);
  });
  it('retains old backups and round-trips drafts, reported evidence and attempt references', async () => {
    const old = createStudyData('guest');
    expect(validateBackup(exportBackup(old)).codingProblems).toEqual(old.codingProblems);
    const store = storage(); const repo = createLocalRepositories(store, 'alice');
    await repo.commit(await trainingMutations('alice', sampleTask, [], draft, attempt));
    const restored = validateBackup(exportBackup(await repo.load()), 'guest');
    expect(restored.codingProblems[0].drafts?.Python).toEqual(draft);
    expect(restored.codingAttempts[0].verification).toBe('not-run');
    expect(restored.codingAttempts[0].userId).toBe('guest');
    expect(findTrainingProblem(restored.codingProblems, 'guest', sampleTask)?.id).toBe(restored.codingAttempts[0].problemId);
  });
  it('does not report success or leave a partial problem when storage fails', async () => {
    const store = storage(); const repo = createLocalRepositories(store, 'alice');
    await repo.load();
    const broken = createLocalRepositories({ ...store, setItem: () => { throw new Error('quota'); } }, 'alice');
    await expect(broken.commit(await trainingMutations('alice', sampleTask, [], draft, attempt))).rejects.toThrow('quota');
    expect((await repo.load()).codingProblems).toEqual([]);
    expect((await repo.load()).codingAttempts).toEqual([]);
  });
  it('counts a task once and uses the latest self-assessment for review status', async () => {
    const store = storage(); const repo = createLocalRepositories(store, 'alice');
    await repo.commit(await trainingMutations('alice', sampleTask, [], draft, attempt));
    let data = await repo.load();
    await repo.commit(await trainingMutations('alice', sampleTask, data.codingProblems, draft, { ...attempt, id: 'attempt-2', attemptedAt: '2026-09-25T10:02:00Z' }));
    data = await repo.load();
    expect(taskAttempts(sampleTask, 'alice', data.codingProblems, data.codingAttempts)).toHaveLength(2);
    expect([sampleTask].filter(task => trainingStatus(taskAttempts(task, 'alice', data.codingProblems, data.codingAttempts)) === 'completed')).toHaveLength(1);
    await repo.commit(await trainingMutations('alice', sampleTask, data.codingProblems, draft, { ...attempt, id: 'attempt-3', status: 'Struggled', attemptedAt: '2026-09-25T10:03:00Z' }));
    data = await repo.load();
    expect(trainingStatus(taskAttempts(sampleTask, 'alice', data.codingProblems, data.codingAttempts))).toBe('review');
    expect(taskAttempts(sampleTask, 'bob', data.codingProblems, data.codingAttempts)).toEqual([]);
  });
});

describe('device recovery without fabricated cloud success', () => {
  it('isolates identities, tasks and languages and recovers a draft before debounce completes', () => {
    const store = storage(); const alice = createTrainingRecovery(store, 'alice');
    alice.write({ taskId: 'lc-1', language: 'Python', draft, pending: true });
    expect(createTrainingRecovery(store, 'alice').read('lc-1', 'Python')?.draft).toEqual(draft);
    expect(alice.read('lc-1', 'Python')?.pending).toBe(true);
    expect(alice.read('lc-2', 'Python')).toBeNull();
    expect(alice.read('lc-1', 'Java')).toBeNull();
    expect(createTrainingRecovery(store, 'guest').read('lc-1', 'Python')).toBeNull();
    expect(createTrainingRecovery(store, 'bob').read('lc-1', 'Python')).toBeNull();
    expect(store.getItem(storageKey('alice', 'data'))).toBeNull();
  });
  it('clears guest recovery on explicit reset/restore while preserving other accounts', () => {
    const store = storage(); const guest = createTrainingRecovery(store, 'guest'); const alice = createTrainingRecovery(store, 'alice');
    const recovery = { taskId: 'lc-1', language: 'Python', draft, pending: true };
    guest.write(recovery); guest.select('lc-1'); alice.write(recovery);
    resetGuestData(store);
    expect(guest.read('lc-1', 'Python')).toBeNull(); expect(guest.selected()).toBeNull();
    expect(alice.read('lc-1', 'Python')?.draft).toEqual(draft);
    guest.write(recovery);
    restoreGuestBackup(store, exportBackup(createStudyData('guest')));
    expect(guest.read('lc-1', 'Python')).toBeNull();
  });
});

it('rejects missing training files, HTML rewrites and arbitrary paths instead of showing a fake solution', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!doctype html><html>app</html>', { headers: { 'content-type': 'text/html' } })));
  try {
    await expect(loadTrainingText('/training/hot100/lc-1/reference.py')).rejects.toThrow('could not be loaded');
    await expect(loadTrainingText('https://example.com/secret.py')).rejects.toThrow('Invalid');
  } finally { vi.unstubAllGlobals(); }
});
