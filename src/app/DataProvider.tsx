import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getRepositories } from '../repositories';
import { applyMutations, emptyDataset, type Dataset, type Mutation, type Repositories } from '../repositories/contracts';
import { exportBackup, resetGuestData, restoreGuestBackup } from '../services/backup';
import { useToast } from '../components/common/Toast';
import { guestMigrationFingerprint, importGuestIntoCloud, readGuestMigration } from '../services/guestMigration';
import { storageKey } from '../repositories/local';

interface DataState { data: Dataset; revision: number; generation: number; loading: boolean; error: string; migration: 'none' | 'available' | 'importing' | 'failed' | 'complete'; migrationCount: number; importGuest: () => Promise<void>; refresh: () => Promise<void>; commit: (changes: Mutation[], expectedGeneration?: number) => Promise<void>; beforeExport: (handler: () => Promise<void>) => () => void; exportData: () => Promise<string>; restore: (json: string) => Promise<void>; reset: () => Promise<void> }
const DataContext = createContext<DataState | null>(null);
export function DataProvider({ uid, children }: { uid: string | null; children: ReactNode }) {
  const [data, setData] = useState(emptyDataset);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [migration, setMigration] = useState<DataState['migration']>('none');
  const [migrationCount, setMigrationCount] = useState(0);
  const repo = useRef<Repositories | null>(null);
  const active = useRef(true);
  const generation = useRef(0);
  const pending = useRef(0);
  const migrationInProgress = useRef(false);
  const guestToImport = useRef<Dataset | null>(null);
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
      let next = await repository.load();
      if (uid && active.current && generation.current === ticket) {
        try {
          const guest = await readGuestMigration(localStorage, uid);
          guestToImport.current = guest;
          if (guest) {
            const fingerprint = await guestMigrationFingerprint(guest);
            if (localStorage.getItem(storageKey(uid, 'guest-migration-fingerprint')) !== fingerprint) {
              if (Object.values(next).every(records => records.length === 0)) {
                setMigration('importing');
                migrationInProgress.current = true;
                const imported = await importGuestIntoCloud(repository, guest, next);
                next = await repository.load();
                localStorage.setItem(storageKey(uid, 'guest-migration-fingerprint'), fingerprint);
                setMigrationCount(imported);
                setMigration('complete');
                migrationInProgress.current = false;
              } else {
                setMigrationCount(Object.values(guest).reduce((total, records) => total + records.length, 0));
                setMigration('available');
              }
            } else setMigration('none');
          } else setMigration('none');
        } catch (cause) {
          migrationInProgress.current = false;
          // A migration failure must never hide an otherwise readable cloud workspace.
          if (active.current && generation.current === ticket) {
            setMigration('failed');
            showToast(cause instanceof Error ? cause.message : 'Guest import failed. Local data is safe.', 'error');
          }
        }
      }
      if (active.current && generation.current === ticket) { repo.current = repository; setData(next); setRevision(value => value + 1); }
    } catch (cause) {
      if (active.current && generation.current === ticket) setError(cause instanceof Error ? cause.message : 'Workspace could not be loaded.');
    } finally {
      if (active.current && generation.current === ticket) setLoading(false);
    }
  }, [uid, showToast]);
  useEffect(() => {
    active.current = true;
    void refresh();
    return () => { active.current = false; generation.current++; repo.current = null; };
  }, [refresh]);
  const commit = async (changes: Mutation[], expectedGeneration?: number) => {
    if (migrationInProgress.current) throw new Error('Guest import is in progress. Please wait.');
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
  const importGuest = async () => {
    if (!uid || !repo.current || !guestToImport.current || migrationInProgress.current || pending.current) throw new Error('Guest import is not ready.');
    migrationInProgress.current = true;
    setMigration('importing');
    try {
      const guest = guestToImport.current;
      const imported = await importGuestIntoCloud(repo.current, guest, await repo.current.load());
      localStorage.setItem(storageKey(uid, 'guest-migration-fingerprint'), await guestMigrationFingerprint(guest));
      setMigrationCount(imported);
      await refresh();
      setMigration('complete');
    } catch (cause) { setMigration('failed'); throw cause; }
    finally { migrationInProgress.current = false; }
  };
  return <DataContext.Provider value={{ data, revision, generation: generation.current, loading, error, migration, migrationCount, importGuest, refresh, commit, beforeExport, exportData, restore, reset }}>{children}</DataContext.Provider>;
}
export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('DataProvider is missing.');
  return context;
}
