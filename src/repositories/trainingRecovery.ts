import { codingDraftSchema } from './schemas';
import { storageKey, type StoragePort } from './local';
import type { CodingDraft } from '../types';

export interface DraftRecovery { taskId: string; language: string; draft: CodingDraft; pending: boolean }
// Crash recovery is deliberately distinct from a successful account save.
export function createTrainingRecovery(storage: StoragePort, identity: string) {
  const key = (taskId: string, language: string) => storageKey(identity, `training-recovery:${encodeURIComponent(taskId)}:${encodeURIComponent(language)}`);
  const indexKey = storageKey(identity, 'training-recovery-index');
  return {
    pending(): DraftRecovery[] {
      const keys: unknown = JSON.parse(storage.getItem(indexKey) || '[]');
      if (!Array.isArray(keys)) return [];
      return keys.flatMap(key => {
        if (typeof key !== 'string' || !key.startsWith(storageKey(identity, 'training-recovery:'))) return [];
        const raw = storage.getItem(key);
        if (!raw) return [];
        try {
          const value = JSON.parse(raw);
          if (!value.pending || typeof value.taskId !== 'string' || typeof value.language !== 'string') return [];
          return [{ taskId: value.taskId, language: value.language, pending: true, draft: codingDraftSchema.parse(value.draft) }];
        } catch { return []; }
      });
    },
    read(taskId: string, language: string): DraftRecovery | null {
      const raw = storage.getItem(key(taskId, language));
      if (!raw) return null;
      try {
        const value = JSON.parse(raw);
        if (value.taskId !== taskId || value.language !== language || typeof value.pending !== 'boolean') return null;
        return { taskId, language, pending: value.pending, draft: codingDraftSchema.parse(value.draft) };
      } catch { return null; }
    },
    write(value: DraftRecovery) {
      codingDraftSchema.parse(value.draft);
      const keys: string[] = JSON.parse(storage.getItem(indexKey) || '[]');
      const draftKey = key(value.taskId, value.language);
      if (!keys.includes(draftKey)) storage.setItem(indexKey, JSON.stringify([...keys, draftKey]));
      storage.setItem(key(value.taskId, value.language), JSON.stringify(value));
    },
    clear(taskId: string, language: string) { storage.removeItem(key(taskId, language)); },
    select(taskId: string) { storage.setItem(storageKey(identity, 'training-last-task'), taskId); },
    selected() { return storage.getItem(storageKey(identity, 'training-last-task')); },
  };
}

export function clearTrainingRecovery(storage: StoragePort, identity: string) {
  const indexKey = storageKey(identity, 'training-recovery-index');
  let keys: unknown = [];
  try { keys = JSON.parse(storage.getItem(indexKey) || '[]'); } catch { /* Ignore corrupt optional recovery index. */ }
  if (Array.isArray(keys)) for (const key of keys) if (typeof key === 'string' && key.startsWith(storageKey(identity, 'training-recovery:'))) storage.removeItem(key);
  storage.removeItem(indexKey);
  storage.removeItem(storageKey(identity, 'training-last-task'));
}
