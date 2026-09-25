import { expect, it } from 'vitest';
import { calculateNextReview } from '../src/utils/reviewScheduler';
import { createStudyData } from '../src/repositories/local';
it.each([['Again', 1, 'Learning'], ['Hard', 6, 'Reviewing'], ['Good', 13, 'Reviewing'], ['Easy', 18, 'Mastered']] as const)('schedules %s deterministically without mutating input', (rating, days, mastery) => {
  const question = { ...createStudyData('guest').questions[0], intervalDays: 5 };
  const before = structuredClone(question); const now = new Date('2026-09-24T08:00:00Z');
  const { updatedQuestion, reviewEntry } = calculateNextReview(question, rating, now, 'event');
  expect(question).toEqual(before); expect(updatedQuestion.intervalDays).toBe(days); expect(updatedQuestion.masteryLevel).toBe(mastery);
  expect(Date.parse(updatedQuestion.nextReviewAt!) - now.getTime()).toBe(days * 86400000);
  expect(reviewEntry).toMatchObject({ id: 'event', previousInterval: 5, newInterval: days, rating, questionId: question.id });
});
it('starts an unseen zero-interval card with a positive interval', () => {
  const question = { ...createStudyData('guest').questions[0], intervalDays: 0 };
  expect(calculateNextReview(question, 'Good', new Date(), 'r').updatedQuestion.intervalDays).toBe(3);
});
