import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useData } from './DataProvider';
import { useWorkspaceActions } from './WorkspaceActions';
import { createTrainingRecovery } from '../repositories/trainingRecovery';
import { findTrainingProblem, personalTrainingTask, type WorkspaceTask } from '../services/trainingWorkspace';
import type { CodingAttempt, CodingDraft } from '../types';

interface Entry {
  task: WorkspaceTask;
  draft: CodingDraft;
  revision: number;
  status: 'clean' | 'dirty' | 'saving' | 'saved' | 'error';
  error: string;
}
type AttemptInput = Omit<CodingAttempt, 'problemId' | 'userId' | 'problemTitle'>;
interface TrainingState {
  entries: Record<string, Entry>;
  register: (task: WorkspaceTask) => void;
  update: (task: WorkspaceTask, code: string, elapsedSeconds?: number) => void;
  save: (task: WorkspaceTask, attempt?: AttemptInput) => Promise<void>;
  selectedId: string;
  select: (id: string) => void;
}
const Context = createContext<TrainingState | null>(null);
const taskKey = (task: WorkspaceTask) => `${task.id}:${task.language}`;
const emptyDraft = (task: WorkspaceTask): CodingDraft => ({ code: task.codeTemplate, elapsedSeconds: 0, updatedAt: new Date(0).toISOString() });

export function TrainingBoundary({ identity, children }: { identity: string; children: ReactNode }) {
  const { revision } = useData();
  // Restore/reset/refresh replaces editor sessions; routine saves keep them mounted.
  return <TrainingProvider key={`${identity}:${revision}`} identity={identity}>{children}</TrainingProvider>;
}

export function TrainingProvider({ identity, children }: { identity: string; children: ReactNode }) {
  const { data, beforeExport } = useData();
  const { saveTraining } = useWorkspaceActions();
  const latest = useRef({ data, saveTraining });
  latest.current = { data, saveTraining };
  const recovery = useMemoRecovery(identity);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const current = useRef(entries);
  const active = useRef(true);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [selectedId, setSelectedId] = useState(() => { try { return recovery.selected() || ''; } catch { return ''; } });
  const publish = useCallback((key: string, entry: Entry) => {
    current.current = { ...current.current, [key]: entry };
    if (active.current) setEntries(current.current);
  }, []);
  const ensure = useCallback((task: WorkspaceTask): Entry => {
    const key = taskKey(task);
    if (current.current[key]) return current.current[key];
    const remote = findTrainingProblem(latest.current.data.codingProblems, identity, task)?.drafts?.[task.language];
    let draft = remote || emptyDraft(task);
    let status: Entry['status'] = remote ? 'saved' : 'clean';
    let error = '';
    try {
      const local = recovery.read(task.id, task.language);
      if (local && (!remote || Date.parse(local.draft.updatedAt) > Date.parse(remote.updatedAt) || (local.pending && local.draft.updatedAt === remote.updatedAt && local.draft.code !== remote.code))) {
        draft = local.draft; status = local.pending ? 'dirty' : 'saved';
      }
    } catch { error = 'Browser recovery storage is unavailable.'; }
    const entry: Entry = { task, draft, status, error, revision: 0 };
    current.current = { ...current.current, [key]: entry };
    return entry;
  }, [identity, recovery]);

  const save = useCallback((task: WorkspaceTask, attempt?: AttemptInput): Promise<void> => {
    const key = taskKey(task);
    clearTimeout(timers.current.get(key)); timers.current.delete(key);
    const operation = queue.current.catch(() => undefined).then(async () => {
      if (!active.current) throw new Error('Your account changed before saving.');
      const entry = ensure(task);
      if (!attempt && (entry.status === 'saved' || entry.status === 'clean')) return;
      const snapshot = { ...entry, draft: { ...entry.draft } };
      publish(key, { ...entry, status: 'saving', error: '' });
      try {
        await latest.current.saveTraining(task, snapshot.draft, attempt);
        if (!active.current) return;
        const newest = current.current[key];
        if (newest.revision === snapshot.revision) {
          try { recovery.clear(task.id, task.language); } catch { /* The repository save remains authoritative. */ }
          publish(key, { ...newest, status: 'saved', error: '' });
        } else publish(key, { ...newest, status: 'dirty' });
      } catch (cause) {
        if (active.current) publish(key, { ...current.current[key], status: 'error', error: cause instanceof Error ? cause.message : 'Save failed.' });
        throw cause;
      }
    });
    queue.current = operation;
    return operation;
  }, [ensure, publish, recovery]);
  const schedule = useCallback((task: WorkspaceTask) => {
    const key = taskKey(task);
    clearTimeout(timers.current.get(key));
    timers.current.set(key, setTimeout(() => { void save(task).catch(() => undefined); }, 1800));
  }, [save]);
  const register = useCallback((task: WorkspaceTask) => {
    const entry = ensure(task);
    publish(taskKey(task), entry);
    if (entry.status === 'dirty') schedule(task);
  }, [ensure, publish, schedule]);
  const update = useCallback((task: WorkspaceTask, code: string, elapsedSeconds?: number) => {
    if (!active.current) return;
    const entry = ensure(task);
    const draft = { code, elapsedSeconds: elapsedSeconds ?? entry.draft.elapsedSeconds, updatedAt: new Date().toISOString() };
    let error = '';
    try { recovery.write({ taskId: task.id, language: task.language, draft, pending: true }); }
    catch { error = 'Browser recovery could not be saved. Keep this page open and save your draft.'; }
    publish(taskKey(task), { ...entry, draft, revision: entry.revision + 1, status: 'dirty', error });
    schedule(task);
  }, [ensure, publish, recovery, schedule]);
  const select = useCallback((id: string) => {
    setSelectedId(id);
    try { recovery.select(id); } catch { /* Navigation still works without a last-task preference. */ }
  }, [recovery]);
  useEffect(() => beforeExport(async () => {
    // Include crash-recovered drafts even when the user opens Settings directly.
    const recovered = recovery.pending();
    const unknown = recovered.filter(item => !current.current[`${item.taskId}:${item.language}`]);
    if (unknown.length) {
      const { loadTrainingCatalog } = await import('../services/trainingCatalog');
      const publicTasks = await loadTrainingCatalog();
      const tasks: WorkspaceTask[] = [...publicTasks, ...latest.current.data.codingProblems.filter(problem => !problem.trainingTaskId).map(personalTrainingTask)];
      for (const item of unknown) {
        const task = tasks.find(task => task.id === item.taskId && task.language === item.language);
        if (!task) throw new Error('A recovered training task is unavailable. Save its code before exporting.');
        ensure(task);
      }
    }
    for (const entry of Object.values(current.current)) if (['dirty', 'saving', 'error'].includes(entry.status)) await save(entry.task);
    await queue.current;
  }), [beforeExport, ensure, recovery, save]);
  useEffect(() => {
    active.current = true;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      // Synchronous recovery is already written on edit; never pretend an async cloud write is complete.
      if (Object.values(current.current).some(entry => entry.error.startsWith('Browser recovery'))) {
        event.preventDefault(); event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { active.current = false; for (const timer of timers.current.values()) clearTimeout(timer); window.removeEventListener('beforeunload', beforeUnload); };
  }, []);
  return <Context.Provider value={{ entries, register, update, save, selectedId, select }}>{children}</Context.Provider>;
}

function useMemoRecovery(identity: string) {
  const ref = useRef<{ identity: string; value: ReturnType<typeof createTrainingRecovery> } | null>(null);
  if (ref.current?.identity !== identity) ref.current = { identity, value: createTrainingRecovery({
    getItem: key => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: key => localStorage.removeItem(key),
  }, identity) };
  return ref.current.value;
}
export function useTraining() {
  const state = useContext(Context);
  if (!state) throw new Error('TrainingProvider is missing.');
  return state;
}
export function useTrainingDraft(task: WorkspaceTask) {
  const state = useTraining();
  useEffect(() => { state.register(task); }, [task.id, task.language, state.register]);
  return { ...state, entry: state.entries[taskKey(task)], draft: state.entries[taskKey(task)]?.draft || emptyDraft(task) };
}
