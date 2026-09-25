import { readFileSync, existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import hot100 from '../src/content/training/hot100.json';
import pytorch from '../src/content/training/pytorch.json';
import { libraryResources } from '../src/services/learningLibrary';
import type { TrainingTask } from '../src/content/training/types';

it('connects each complete public task to real download files and stable, existing lessons', () => {
  const tasks = [...hot100, ...pytorch] as TrainingTask[];
  expect(new Set(tasks.map(task => task.id)).size).toBe(tasks.length);
  for (const task of tasks) {
    expect(task.codeTemplate.trim(), task.id).not.toBe('');
    for (const id of task.relatedResourceIds) expect(libraryResources.some(resource => resource.id === id), `${task.id} → ${id}`).toBe(true);
    if (task.contentStatus === 'complete') {
      expect(task.description.trim().length, task.id).toBeGreaterThan(20);
      expect(task.hints.length, task.id).toBeGreaterThan(0);
      for (const path of [task.referencePath, task.testPath]) {
        expect(path, task.id).toMatch(/^\/training\/[a-z0-9/_-]+\.py$/);
        expect(existsSync(`public${path}`), `${task.id}: ${path}`).toBe(true);
        const text = readFileSync(`public${path}`, 'utf8');
        expect(text).not.toMatch(/^\s*<!doctype html/i);
        expect(text.trim().length).toBeGreaterThan(50);
      }
    }
  }
});
