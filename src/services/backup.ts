import { z } from 'zod';
import { datasetSchema } from '../repositories/schemas';
import { collections, type Dataset } from '../repositories/contracts';
import { createStudyData, replaceLocalData, type StoragePort } from '../repositories/local';
import { clearTrainingRecovery } from '../repositories/trainingRecovery';
export const backupSchema = datasetSchema.extend({ version: z.enum(['1.0', '2.0']), exportDate: z.string().refine(s => Number.isFinite(Date.parse(s))) });
export function validateBackup(json: string, identity = 'guest'): Dataset {
  if (json.length > 20_000_000) throw new Error('Backup exceeds 20 MB.');
  const parsed = backupSchema.parse(JSON.parse(json));
  const data = Object.fromEntries(collections.map(key => [key, parsed[key].map(record => ({ ...record, userId: identity }))])) as Dataset;
  for (const key of collections) {
    if (new Set(data[key].map(r => r.id)).size !== data[key].length) throw new Error(`Duplicate IDs in ${key}.`);
  }
  const has = (key: keyof Dataset, id: string) => data[key].some(r => r.id === id);
  if (data.interviews.some(r => !has('applications', r.applicationId)) ||
      data.interviewQuestions.some(r => !has('interviews', r.interviewId) || (r.questionId && !has('questions', r.questionId))) ||
      data.reviewHistory.some(r => !has('questions', r.questionId)) ||
      data.codingAttempts.some(r => !has('codingProblems', r.problemId))) throw new Error('Backup contains missing linked records.');
  return data;
}
export function exportBackup(data: Dataset): string {
  return JSON.stringify({ version: '2.0', exportDate: new Date().toISOString(), ...datasetSchema.parse(data) }, null, 2);
}
export function restoreGuestBackup(storage: StoragePort, json: string) {
  replaceLocalData(storage, 'guest', validateBackup(json));
  clearTrainingRecovery(storage, 'guest');
}
export function resetGuestData(storage: StoragePort) {
  replaceLocalData(storage, 'guest', createStudyData('guest'));
  clearTrainingRecovery(storage, 'guest');
}
