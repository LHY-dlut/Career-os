import { useData } from './DataProvider';
import type { CollectionName, EntityMap, Mutation } from '../repositories/contracts';
import type { InterviewQuestion, Question, ReviewRating, CodingAttempt, CodingDraft } from '../types';
import { trainingMutations, type WorkspaceTask } from '../services/trainingWorkspace';
import { calculateNextReview } from '../utils/reviewScheduler';
import { generateId } from '../utils/id';
import { createStudyData } from '../repositories/local';
import { useAuth } from './AuthProvider';

export function useWorkspaceActions() {
  const { data, generation, commit } = useData();
  const { user } = useAuth();
  const save = <K extends CollectionName>(collection: K, value: EntityMap[K]) => commit([{ collection, value } as Mutation]);
  const remove = async (collection: CollectionName, id: string) => {
    const changes: Mutation[] = [{ collection, deleteId: id }];
    if (collection === 'applications') {
      const ids = data.interviews.filter(i => i.applicationId === id).map(i => i.id);
      ids.forEach(deleteId => changes.push({ collection: 'interviews', deleteId }));
      data.interviewQuestions.filter(i => ids.includes(i.interviewId)).forEach(i => changes.push({ collection: 'interviewQuestions', deleteId: i.id }));
    }
    if (collection === 'interviews') data.interviewQuestions.filter(i => i.interviewId === id).forEach(i => changes.push({ collection: 'interviewQuestions', deleteId: i.id }));
    if (collection === 'questions') {
      data.reviewHistory.filter(r => r.questionId === id).forEach(r => changes.push({ collection: 'reviewHistory', deleteId: r.id }));
      data.interviewQuestions.filter(i => i.questionId === id).forEach(i => changes.push({ collection: 'interviewQuestions', value: { ...i, questionId: undefined } }));
    }
    return commit(changes);
  };
  const recordReview = async (question: Question, rating: ReviewRating) => {
    const { updatedQuestion, reviewEntry } = calculateNextReview(question, rating, new Date(), generateId());
    await commit([{ collection: 'questions', value: updatedQuestion }, { collection: 'reviewHistory', value: reviewEntry }]);
  };
  const promoteQuestion = async (question: Omit<Question, 'id' | 'userId'>, iq: InterviewQuestion) => {
    if (iq.questionId) return;
    const value = { ...question, id: generateId(), userId: iq.userId };
    await commit([{ collection: 'questions', value }, { collection: 'interviewQuestions', value: { ...iq, questionId: value.id } }]);
  };
  const loadStarter = async () => {
    if (data.articles.length || data.questions.length || data.codingProblems.length) throw new Error('Study collections must be empty before loading starter materials.');
    const starter = createStudyData(user?.uid || 'guest', generateId);
    const changes = (['articles', 'questions', 'codingProblems'] as const).flatMap(collection => starter[collection].map(value => ({ collection, value } as Mutation)));
    await commit(changes);
  };
  const saveTraining = async (task: WorkspaceTask, draft: CodingDraft, attempt?: Omit<CodingAttempt, 'problemId' | 'userId' | 'problemTitle'>) => {
    const changes = await trainingMutations(user?.uid || 'guest', task, data.codingProblems, draft, attempt);
    await commit(changes, generation);
  };
  return { save, remove, recordReview, promoteQuestion, loadStarter, saveTraining };
}
