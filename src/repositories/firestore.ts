import { collection, doc, getDocs, getFirestore, query, where, writeBatch } from 'firebase/firestore';
import { auth, firebaseApp } from '../services/firebase';
import { collections, entityRepositories, type Repositories, type Dataset, type CollectionName } from './contracts';
import { entitySchemas } from './schemas';
const paths: Record<CollectionName, string> = { articles: 'knowledgeArticles', questions: 'questions', reviewHistory: 'reviewHistory', codingProblems: 'codingProblems', codingAttempts: 'codingAttempts', applications: 'applications', interviews: 'interviews', interviewQuestions: 'interviewQuestions', mockSessions: 'mockInterviewSessions' };
export function createFirestoreRepositories(identity: string): Repositories {
  const db = firebaseApp ? getFirestore(firebaseApp, import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)') : null;
  function assertIdentity() {
    if (!db || auth?.currentUser?.uid !== identity) throw new Error('Your account changed. Reload before saving.');
  }
  const load: Repositories['load'] = async () => {
    assertIdentity();
    const rows = await Promise.all(collections.map(async name => {
      const snapshot = await getDocs(query(collection(db!, paths[name]), where('userId', '==', identity)));
      return [name, snapshot.docs.map(record => entitySchemas[name].parse({ ...record.data(), id: record.id }))];
    }));
    assertIdentity();
    return Object.fromEntries(rows) as Dataset;
  };
  const commit: Repositories['commit'] = async changes => {
    assertIdentity();
    if (changes.length > 450) throw new Error('Too many records in one operation.');
    const batch = writeBatch(db!);
    for (const change of changes) {
      const id = 'value' in change ? change.value.id : change.deleteId;
      if (!id || id.includes('/') || id === '.' || id === '..') throw new Error('Invalid record ID.');
      const reference = doc(db!, paths[change.collection], id);
      if ('value' in change) {
        const value = entitySchemas[change.collection].parse(change.value);
        if (value.userId !== identity) throw new Error('Record belongs to a different account.');
        batch.set(reference, JSON.parse(JSON.stringify(value)));
      } else batch.delete(reference);
    }
    await batch.commit();
  };
  return { mode: 'cloud', identity, load, commit, entities: entityRepositories(load, commit) };
}
