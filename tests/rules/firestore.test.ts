import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
let environment: RulesTestEnvironment;
const names = ['knowledgeArticles', 'questions', 'reviewHistory', 'codingProblems', 'codingAttempts', 'applications', 'interviews', 'interviewQuestions', 'mockInterviewSessions'];
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run via Firebase emulators:exec. Never run against live Firestore.');
  environment = await initializeTestEnvironment({ projectId: 'demo-career-os', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  await environment.withSecurityRulesDisabled(async context => {
    for (const name of names) await setDoc(doc(context.firestore(), name, 'owned'), { id: 'owned', userId: 'alice', applicationId: 'owned', interviewId: 'owned', questionId: 'owned', problemId: 'owned' });
  });
});
afterAll(async () => { await environment?.cleanup(); });
it('denies anonymous and cross-account access on every collection', async () => {
  for (const name of names) {
    await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), name, 'owned')));
    await assertFails(getDoc(doc(environment.authenticatedContext('bob').firestore(), name, 'owned')));
    await assertSucceeds(getDoc(doc(environment.authenticatedContext('alice').firestore(), name, 'owned')));
  }
});
it('allows user-filtered list and denies unscoped list', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  await assertSucceeds(getDocs(query(collection(db, 'questions'), where('userId', '==', 'alice'))));
  await assertFails(getDocs(collection(db, 'questions')));
});
it('prevents ownership or document identity changes across all collections', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  for (const name of names) {
    await assertFails(updateDoc(doc(db, name, 'owned'), { userId: 'bob' }));
    await assertFails(updateDoc(doc(db, name, 'owned'), { id: 'spoof' }));
    await assertFails(setDoc(doc(db, name, 'spoof'), { id: 'spoof', userId: 'bob' }));
  }
});
it('requires parents belonging to the same account', async () => {
  const db = environment.authenticatedContext('bob').firestore();
  await assertFails(setDoc(doc(db, 'interviews', 'bad'), { id: 'bad', userId: 'bob', applicationId: 'owned' }));
  await assertFails(setDoc(doc(db, 'reviewHistory', 'bad'), { id: 'bad', userId: 'bob', questionId: 'owned' }));
});
it('permits atomic creation and linking while denying an invalid entire batch', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  const batch = writeBatch(db);
  batch.set(doc(db, 'questions', 'new-question'), { id: 'new-question', userId: 'alice' });
  batch.set(doc(db, 'interviewQuestions', 'new-link'), { id: 'new-link', userId: 'alice', interviewId: 'owned', questionId: 'new-question' });
  await assertSucceeds(batch.commit());
  const badBatch = writeBatch(db);
  badBatch.set(doc(db, 'questions', 'must-not-exist'), { id: 'must-not-exist', userId: 'alice' });
  badBatch.set(doc(db, 'reviewHistory', 'bad-review'), { id: 'bad-review', userId: 'alice', questionId: 'missing' });
  await assertFails(badBatch.commit());
  await environment.withSecurityRulesDisabled(async context => { expect((await getDoc(doc(context.firestore(), 'questions', 'must-not-exist'))).exists()).toBe(false); });
});
