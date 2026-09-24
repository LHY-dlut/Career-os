import type { Question, ReviewRating, ReviewHistory } from '../types';
export function calculateNextReview(question: Question, rating: ReviewRating, now: Date, id: string): { updatedQuestion: Question; reviewEntry: ReviewHistory } {
  const previousInterval = Math.max(1, question.intervalDays || 1);
  const newInterval = rating === 'Again' ? 1 : Math.max(1, Math.round(previousInterval * { Hard: 1.2, Good: 2.5, Easy: 3.5 }[rating]));
  const timestamp = now.toISOString();
  return {
    updatedQuestion: { ...question, masteryLevel: newInterval >= 14 ? 'Mastered' : newInterval >= 5 ? 'Reviewing' : 'Learning', intervalDays: newInterval, lastReviewedAt: timestamp, nextReviewAt: new Date(now.getTime() + newInterval * 86400000).toISOString(), reviewCount: question.reviewCount + 1, updatedAt: timestamp },
    reviewEntry: { id, userId: question.userId, questionId: question.id, questionTitle: question.title, reviewedAt: timestamp, rating, previousInterval, newInterval },
  };
}
