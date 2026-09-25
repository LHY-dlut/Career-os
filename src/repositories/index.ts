import type { Repositories } from './contracts';
import { createLocalRepositories } from './local';
export async function selectRepositories(uid: string | null, factories: { local: () => Repositories; cloud: (uid: string) => Promise<Repositories> }): Promise<Repositories> {
  return uid ? factories.cloud(uid) : factories.local();
}
export const getRepositories = (uid: string | null) => selectRepositories(uid, {
  local: () => createLocalRepositories(localStorage),
  cloud: async identity => (await import('./firestore')).createFirestoreRepositories(identity),
});
