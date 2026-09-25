import type { TrainingTask } from '../content/training/types';

let pending: Promise<TrainingTask[]> | undefined;
export function loadTrainingCatalog(): Promise<TrainingTask[]> {
  pending ??= Promise.all([import('../content/training/hot100.json'), import('../content/training/pytorch.json')])
    .then(([hot100, pytorch]) => [...hot100.default, ...pytorch.default] as TrainingTask[])
    .catch(error => { pending = undefined; throw error; });
  return pending;
}
