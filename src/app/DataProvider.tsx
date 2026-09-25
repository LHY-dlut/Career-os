import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getRepositories } from '../repositories';
import { applyMutations, emptyDataset, type Dataset, type Mutation, type Repositories } from '../repositories/contracts';
import { exportBackup, resetGuestData, restoreGuestBackup } from '../services/backup';
import { useToast } from '../components/common/Toast';

interface DataState { data: Dataset; revision: number; generation: number; loading: boolean; error: string; refresh: () => Promise<void>; commit: (changes: Mutation[], expectedGeneration?: number) => Promise<void>; beforeExport: (handler: () => Promise<void>) => () => void; exportData: () => Promise<string>; restore: (json: string) => Promise<void>; reset: () => Promise<void> }
const DataContext = createContext<DataState | null>(null);
export function DataProvider({ uid, children }: { uid: string | null; children: ReactNode }) {
  const [data, setData] = useState(emptyDataset);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const repo = useRef<Repositories | null>(null);
  const active = useRef(true);
  const generation = useRef(0);
  const pending = useRef(0);
  const exportPreparation = useRef<(() => Promise<void>) | null>(null);
  const beforeExport = useCallback((handler: () => Promise<void>) => {
    exportPreparation.current = handler;
    return () => { if (exportPreparation.current === handler) exportPreparation.current = null; };
  }, []);
  const { showToast } = useToast();
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true); setError('');
    try {
      const repository = await getRepositories(uid);
      const next = await repository.load();
      if (active.current && generation.current === ticket) { repo.current = repository; setData(next); setRevision(value => value + 1); }
    } catch (cause) {
      if (active.current && generation.current === ticket) setError(cause instanceof Error ? cause.message : 'Workspace could not be loaded.');
    } finally {
      if (active.current && generation.current === ticket) setLoading(false);
    }
  }, [uid]);
  useEffect(() => {
    active.current = true;
    void refresh();
    return () => { active.current = false; generation.current++; repo.current = null; };
  }, [refresh]);
  const commit = async (changes: Mutation[], expectedGeneration?: number) => {
    if (expectedGeneration !== undefined && expectedGeneration !== generation.current) throw new Error('Workspace was replaced before saving. The old edit was not written.');
    if (pending.current) { showToast('A save is already in progress.', 'info'); throw new Error('Save in progress.'); }
    pending.current++;
    try {
      if (!active.current || !repo.current) throw new Error('Workspace is not ready.');
      await repo.current.commit(changes);
      if (!active.current) throw new Error('Your account changed while saving.');
      setData(current => applyMutations(current, changes));
    } catch (cause) {
      if (active.current) showToast(cause instanceof Error ? cause.message : 'Save failed. Please retry.', 'error');
      throw cause;
    } finally { pending.current--; }
  };
  const exportData = async () => {
    await exportPreparation.current?.();
    if (!repo.current || pending.current) throw new Error('Please wait for saving to finish.');
    return exportBackup(await repo.current.load());
  };
  const restore = async (json: string) => {
    if (uid || pending.current) throw new Error('Restore is available only in the idle guest workspace.');
    restoreGuestBackup(localStorage, json);
    await refresh();
  };
  const reset = async () => {
    if (uid || pending.current) throw new Error('Reset is available only in the idle guest workspace.');
    resetGuestData(localStorage);
    await refresh();
  };
  return <DataContext.Provider value={{ data, revision, generation: generation.current, loading, error, refresh, commit, beforeExport, exportData, restore, reset }}>{children}</DataContext.Provider>;
}
export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('DataProvider is missing.');
  return context;
}
