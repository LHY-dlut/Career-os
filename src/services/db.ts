import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type {
  KnowledgeArticle,
  Question,
  ReviewHistory,
  CodingProblem,
  CodingAttempt,
  Application,
  Interview,
  InterviewQuestion,
  MockInterviewSession,
} from '../types';
import {
  SEED_ARTICLES,
  SEED_QUESTIONS,
  SEED_CODING_PROBLEMS,
  SEED_APPLICATIONS,
  SEED_INTERVIEWS,
  SEED_REVIEW_HISTORY,
} from './seedData';

// Local storage keys for resilient offline/unauthenticated instant previews
const STORAGE_PREFIX = 'ai_career_os_';

function getLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.error('LocalStorage error', err);
  }
}

// Generate unique ID helper
export function generateId(): string {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

// --- INITIALIZE SEED DATA ---
export async function initializeUserData(userId: string): Promise<void> {
  const isSeedDoneKey = `seeded_${userId}`;
  if (getLocal(isSeedDoneKey, false)) return;

  try {
    // Check if user already has articles in Firestore
    const artQuery = query(collection(db, 'knowledgeArticles'), where('userId', '==', userId));
    const snapshot = await getDocs(artQuery);
    if (!snapshot.empty) {
      setLocal(isSeedDoneKey, true);
      return;
    }

    // Seed articles
    for (const art of SEED_ARTICLES) {
      const id = generateId();
      await setDoc(doc(db, 'knowledgeArticles', id), { ...art, id, userId });
    }

    // Seed questions
    for (const q of SEED_QUESTIONS) {
      const id = generateId();
      await setDoc(doc(db, 'questions', id), { ...q, id, userId });
    }

    // Seed coding problems
    for (const p of SEED_CODING_PROBLEMS) {
      const id = generateId();
      await setDoc(doc(db, 'codingProblems', id), { ...p, id, userId });
    }

    // Seed applications
    const createdAppIds: string[] = [];
    for (const app of SEED_APPLICATIONS) {
      const id = generateId();
      createdAppIds.push(id);
      await setDoc(doc(db, 'applications', id), { ...app, id, userId });
    }

    // Seed interviews
    if (createdAppIds.length > 0) {
      for (const inv of SEED_INTERVIEWS) {
        const id = generateId();
        await setDoc(doc(db, 'interviews', id), {
          ...inv,
          id,
          userId,
          applicationId: createdAppIds[0],
        });
      }
    }

    // Seed review history
    for (const rev of SEED_REVIEW_HISTORY) {
      const id = generateId();
      await setDoc(doc(db, 'reviewHistory', id), { ...rev, id, userId });
    }

    setLocal(isSeedDoneKey, true);
  } catch (err) {
    console.warn('Firestore seeding skipped or failed (will use local demo state):', err);
  }
}

// Fallback initial in-memory / local state for instant responsiveness
export function getLocalFallbackData(userId: string = 'demo_user') {
  let articles = getLocal<KnowledgeArticle[]>('articles', []);
  if (!articles || articles.length === 0) {
    articles = SEED_ARTICLES.map((a, idx) => ({
      ...a,
      id: `seed-art-${idx + 1}`,
      userId,
    }));
    setLocal('articles', articles);
  }

  let questions = getLocal<Question[]>('questions', []);
  if (!questions || questions.length === 0) {
    questions = SEED_QUESTIONS.map((q, idx) => ({
      ...q,
      id: `seed-q-${idx + 1}`,
      userId,
    }));
    setLocal('questions', questions);
  }

  let codingProblems = getLocal<CodingProblem[]>('codingProblems', []);
  if (!codingProblems || codingProblems.length === 0) {
    codingProblems = SEED_CODING_PROBLEMS.map((p, idx) => ({
      ...p,
      id: `seed-p-${idx + 1}`,
      userId,
    }));
    setLocal('codingProblems', codingProblems);
  }

  let applications = getLocal<Application[]>('applications', []);
  if (!applications || applications.length === 0) {
    applications = SEED_APPLICATIONS.map((app, idx) => ({
      ...app,
      id: `seed-app-${idx + 1}`,
      userId,
    }));
    setLocal('applications', applications);
  }

  let interviews = getLocal<Interview[]>('interviews', []);
  if (!interviews || interviews.length === 0) {
    interviews = SEED_INTERVIEWS.map((inv, idx) => ({
      ...inv,
      id: `seed-inv-${idx + 1}`,
      userId,
      applicationId: applications[0]?.id || 'seed-app-1',
    }));
    setLocal('interviews', interviews);
  }

  let reviewHistory = getLocal<ReviewHistory[]>('reviewHistory', []);
  if (!reviewHistory || reviewHistory.length === 0) {
    reviewHistory = SEED_REVIEW_HISTORY.map((rev, idx) => ({
      ...rev,
      id: `seed-rev-${idx + 1}`,
      userId,
    }));
    setLocal('reviewHistory', reviewHistory);
  }

  let codingAttempts = getLocal<CodingAttempt[]>('codingAttempts', []);
  let interviewQuestions = getLocal<InterviewQuestion[]>('interviewQuestions', []);
  let mockSessions = getLocal<MockInterviewSession[]>('mockSessions', []);

  return {
    articles,
    questions,
    codingProblems,
    applications,
    interviews,
    reviewHistory,
    codingAttempts,
    interviewQuestions,
    mockSessions,
  };
}

// --- KNOWLEDGE ARTICLES ---
export async function fetchArticles(userId: string): Promise<KnowledgeArticle[]> {
  try {
    const q = query(collection(db, 'knowledgeArticles'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => d.data() as KnowledgeArticle);
    if (data.length > 0) {
      setLocal('articles', data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'knowledgeArticles');
  }
  return getLocalFallbackData(userId).articles;
}

export async function saveArticle(article: KnowledgeArticle): Promise<void> {
  setLocal('articles', [
    ...getLocal<KnowledgeArticle[]>('articles', []).filter((a) => a.id !== article.id),
    article,
  ]);
  try {
    await setDoc(doc(db, 'knowledgeArticles', article.id), article);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `knowledgeArticles/${article.id}`);
  }
}

export async function deleteArticle(articleId: string): Promise<void> {
  setLocal(
    'articles',
    getLocal<KnowledgeArticle[]>('articles', []).filter((a) => a.id !== articleId)
  );
  try {
    await deleteDoc(doc(db, 'knowledgeArticles', articleId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `knowledgeArticles/${articleId}`);
  }
}

// --- QUESTIONS ---
export async function fetchQuestions(userId: string): Promise<Question[]> {
  try {
    const q = query(collection(db, 'questions'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => d.data() as Question);
    if (data.length > 0) {
      setLocal('questions', data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'questions');
  }
  return getLocalFallbackData(userId).questions;
}

export async function saveQuestion(question: Question): Promise<void> {
  setLocal('questions', [
    ...getLocal<Question[]>('questions', []).filter((q) => q.id !== question.id),
    question,
  ]);
  try {
    await setDoc(doc(db, 'questions', question.id), question);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `questions/${question.id}`);
  }
}

export async function deleteQuestion(questionId: string): Promise<void> {
  setLocal(
    'questions',
    getLocal<Question[]>('questions', []).filter((q) => q.id !== questionId)
  );
  try {
    await deleteDoc(doc(db, 'questions', questionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `questions/${questionId}`);
  }
}

// --- REVIEW HISTORY & SPACED REPETITION ---
export async function recordReviewAttempt(
  userId: string,
  question: Question,
  rating: 'Again' | 'Hard' | 'Good' | 'Easy'
): Promise<{ updatedQuestion: Question; reviewEntry: ReviewHistory }> {
  const previousInterval = question.intervalDays || 1;
  let newInterval = 1;

  switch (rating) {
    case 'Again':
      newInterval = 1;
      break;
    case 'Hard':
      newInterval = Math.max(1, Math.round(previousInterval * 1.2)) || 3;
      break;
    case 'Good':
      newInterval = Math.round(previousInterval * 2.5) || 7;
      break;
    case 'Easy':
      newInterval = Math.round(previousInterval * 3.5) || 14;
      break;
  }

  const now = new Date();
  const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

  let newMastery = question.masteryLevel;
  if (rating === 'Again') {
    newMastery = 'Learning';
  } else if (newInterval >= 14) {
    newMastery = 'Mastered';
  } else if (newInterval >= 5) {
    newMastery = 'Reviewing';
  } else {
    newMastery = 'Learning';
  }

  const updatedQuestion: Question = {
    ...question,
    masteryLevel: newMastery,
    intervalDays: newInterval,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: nextReview.toISOString(),
    reviewCount: (question.reviewCount || 0) + 1,
    updatedAt: now.toISOString(),
  };

  const reviewEntry: ReviewHistory = {
    id: generateId(),
    userId,
    questionId: question.id,
    questionTitle: question.title,
    reviewedAt: now.toISOString(),
    rating,
    previousInterval,
    newInterval,
  };

  // Save updated question
  await saveQuestion(updatedQuestion);

  // Save review history entry
  setLocal('reviewHistory', [
    reviewEntry,
    ...getLocal<ReviewHistory[]>('reviewHistory', []),
  ]);
  try {
    await setDoc(doc(db, 'reviewHistory', reviewEntry.id), reviewEntry);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `reviewHistory/${reviewEntry.id}`);
  }

  return { updatedQuestion, reviewEntry };
}

export async function fetchReviewHistory(userId: string): Promise<ReviewHistory[]> {
  try {
    const q = query(
      collection(db, 'reviewHistory'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => d.data() as ReviewHistory);
    if (data.length > 0) {
      data.sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime());
      setLocal('reviewHistory', data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'reviewHistory');
  }
  return getLocalFallbackData(userId).reviewHistory;
}

// --- CODING PROBLEMS & ATTEMPTS ---
export async function fetchCodingProblems(userId: string): Promise<CodingProblem[]> {
  try {
    const q = query(collection(db, 'codingProblems'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => d.data() as CodingProblem);
    if (data.length > 0) {
      setLocal('codingProblems', data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'codingProblems');
  }
  return getLocalFallbackData(userId).codingProblems;
}

export async function saveCodingAttempt(attempt: CodingAttempt): Promise<void> {
  setLocal('codingAttempts', [
    attempt,
    ...getLocal<CodingAttempt[]>('codingAttempts', []),
  ]);
  try {
    await setDoc(doc(db, 'codingAttempts', attempt.id), attempt);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `codingAttempts/${attempt.id}`);
  }
}

export async function fetchCodingAttempts(userId: string): Promise<CodingAttempt[]> {
  try {
    const q = query(collection(db, 'codingAttempts'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => d.data() as CodingAttempt);
    if (data.length > 0) {
      data.sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());
      setLocal('codingAttempts', data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'codingAttempts');
  }
  return getLocal<CodingAttempt[]>('codingAttempts', []);
}

// --- APPLICATIONS (CRM) ---
export async function fetchApplications(userId: string): Promise<Application[]> {
  try {
    const q = query(collection(db, 'applications'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => d.data() as Application);
    if (data.length > 0) {
      setLocal('applications', data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'applications');
  }
  return getLocalFallbackData(userId).applications;
}

export async function saveApplication(app: Application): Promise<void> {
  setLocal('applications', [
    ...getLocal<Application[]>('applications', []).filter((a) => a.id !== app.id),
    app,
  ]);
  try {
    await setDoc(doc(db, 'applications', app.id), app);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `applications/${app.id}`);
  }
}

export async function deleteApplication(appId: string): Promise<void> {
  setLocal(
    'applications',
    getLocal<Application[]>('applications', []).filter((a) => a.id !== appId)
  );
  try {
    await deleteDoc(doc(db, 'applications', appId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `applications/${appId}`);
  }
}

// --- INTERVIEWS ---
export async function fetchInterviews(userId: string): Promise<Interview[]> {
  try {
    const q = query(collection(db, 'interviews'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => d.data() as Interview);
    if (data.length > 0) {
      setLocal('interviews', data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'interviews');
  }
  return getLocalFallbackData(userId).interviews;
}

export async function saveInterview(interview: Interview): Promise<void> {
  setLocal('interviews', [
    ...getLocal<Interview[]>('interviews', []).filter((i) => i.id !== interview.id),
    interview,
  ]);
  try {
    await setDoc(doc(db, 'interviews', interview.id), interview);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `interviews/${interview.id}`);
  }
}

export async function deleteInterview(interviewId: string): Promise<void> {
  setLocal(
    'interviews',
    getLocal<Interview[]>('interviews', []).filter((i) => i.id !== interviewId)
  );
  try {
    await deleteDoc(doc(db, 'interviews', interviewId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `interviews/${interviewId}`);
  }
}

// --- INTERVIEW QUESTIONS (Link to Question Bank) ---
export async function fetchInterviewQuestions(userId: string, interviewId?: string): Promise<InterviewQuestion[]> {
  try {
    const coll = collection(db, 'interviewQuestions');
    const q = interviewId
      ? query(coll, where('userId', '==', userId), where('interviewId', '==', interviewId))
      : query(coll, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => d.data() as InterviewQuestion);
    if (data.length > 0) {
      setLocal('interviewQuestions', data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'interviewQuestions');
  }
  const all = getLocal<InterviewQuestion[]>('interviewQuestions', []);
  return interviewId ? all.filter((iq) => iq.interviewId === interviewId) : all;
}

export async function saveInterviewQuestion(iq: InterviewQuestion): Promise<void> {
  setLocal('interviewQuestions', [
    ...getLocal<InterviewQuestion[]>('interviewQuestions', []).filter((item) => item.id !== iq.id),
    iq,
  ]);
  try {
    await setDoc(doc(db, 'interviewQuestions', iq.id), iq);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `interviewQuestions/${iq.id}`);
  }
}

// Aliases for clean semantic API across components
export const saveKnowledgeArticle = saveArticle;
export const deleteKnowledgeArticle = deleteArticle;
export const recordReview = recordReviewAttempt;

// Load all data across collections
export async function loadAllData(userId: string) {
  // Ensure user data seeded if not done
  await initializeUserData(userId);

  const [
    articles,
    questions,
    codingProblems,
    codingAttempts,
    applications,
    interviews,
    interviewQuestions,
    reviewHistory,
  ] = await Promise.all([
    fetchArticles(userId),
    fetchQuestions(userId),
    fetchCodingProblems(userId),
    fetchCodingAttempts(userId),
    fetchApplications(userId),
    fetchInterviews(userId),
    fetchInterviewQuestions(userId),
    fetchReviewHistory(userId),
  ]);

  return {
    articles,
    questions,
    codingProblems,
    codingAttempts,
    applications,
    interviews,
    interviewQuestions,
    reviewHistory,
  };
}

// Export entire dataset as JSON backup
export function exportAllDataAsJson(): string {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    articles: getLocal('articles', []),
    questions: getLocal('questions', []),
    codingProblems: getLocal('codingProblems', []),
    codingAttempts: getLocal('codingAttempts', []),
    applications: getLocal('applications', []),
    interviews: getLocal('interviews', []),
    interviewQuestions: getLocal('interviewQuestions', []),
    reviewHistory: getLocal('reviewHistory', []),
  };
  return JSON.stringify(data, null, 2);
}

// Import dataset from JSON backup
export function importDataFromJson(jsonString: string): void {
  const parsed = JSON.parse(jsonString);
  if (parsed.articles) setLocal('articles', parsed.articles);
  if (parsed.questions) setLocal('questions', parsed.questions);
  if (parsed.codingProblems) setLocal('codingProblems', parsed.codingProblems);
  if (parsed.codingAttempts) setLocal('codingAttempts', parsed.codingAttempts);
  if (parsed.applications) setLocal('applications', parsed.applications);
  if (parsed.interviews) setLocal('interviews', parsed.interviews);
  if (parsed.interviewQuestions) setLocal('interviewQuestions', parsed.interviewQuestions);
  if (parsed.reviewHistory) setLocal('reviewHistory', parsed.reviewHistory);
}

// Reset all storage to curated default seed data
export function resetToSeedData(): void {
  localStorage.clear();
  setLocal('articles', SEED_ARTICLES);
  setLocal('questions', SEED_QUESTIONS);
  setLocal('codingProblems', SEED_CODING_PROBLEMS);
  setLocal('applications', SEED_APPLICATIONS);
  setLocal('interviews', SEED_INTERVIEWS);
  setLocal('reviewHistory', SEED_REVIEW_HISTORY);
  setLocal('codingAttempts', []);
  setLocal('interviewQuestions', []);
}

