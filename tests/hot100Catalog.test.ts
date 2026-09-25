import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import hot100 from '../src/content/training/hot100.json';
import snapshot from '../public/training/hot100/official-index.json';
import type { TrainingTask } from '../src/content/training/types';
import { libraryResources } from '../src/services/learningLibrary';

const tasks = hot100 as TrainingTask[];
const completeIds = ['lc-1', 'lc-283', 'lc-3', 'lc-560', 'lc-53', 'lc-206', 'lc-94', 'lc-200', 'lc-20', 'lc-70'];

describe('Hot100 publishing contract', () => {
  it('matches the verified official 100-question plan, including category and order', () => {
    expect(snapshot.source.planUrl).toBe('https://leetcode.cn/studyplan/top-100-liked/');
    expect(snapshot.source.pageSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.groups).toHaveLength(17);
    const official = snapshot.groups.flatMap(group => group.questions.map(question => ({ ...question, category: group.name })));
    expect(official).toHaveLength(100);
    expect(tasks).toHaveLength(100);
    expect(new Set(tasks.map(task => task.id)).size).toBe(100);
    expect(snapshot.requests.flatMap(request => request.questionNumbers)).toEqual(official.map(question => question.number));
    for (const request of snapshot.requests) {
      expect(request.responseSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(request.querySha256).toMatch(/^[a-f0-9]{64}$/);
    }
    tasks.forEach((task, index) => {
      const question = official[index];
      expect(task, task.id).toMatchObject({
        id: `lc-${question.number}`, number: question.number, order: index + 1,
        title: question.title, titleEn: question.titleEn, category: question.category,
        difficulty: question.difficulty, track: 'hot100', language: 'Python',
        sourceUrl: `https://leetcode.cn/problems/${question.slug}/`, verifiedAt: snapshot.source.verifiedAt,
      });
    });
  });

  it('ships a real reference and original local tests only for the advertised ten complete packages', () => {
    expect(tasks.filter(task => task.contentStatus === 'complete').map(task => task.id)).toEqual(completeIds);
    const resourceIds = new Set(libraryResources.map(resource => resource.id));
    for (const task of tasks) {
      expect(task.codeTemplate, task.id).toContain('raise NotImplementedError');
      expect(task.codeTemplate, task.id).toContain('solution.py');
      for (const id of task.relatedResourceIds) expect(resourceIds.has(id), `${task.id}: ${id}`).toBe(true);
      if (task.contentStatus === 'index') {
        expect(task.referencePath, task.id).toBeUndefined();
        expect(task.testPath, task.id).toBeUndefined();
        expect(task.description, task.id).toContain('尚未提供');
        continue;
      }
      expect(task.description, task.id).toContain('本站原创');
      expect(task.examples.trim(), task.id).not.toBe('');
      expect(task.hints.length, task.id).toBeGreaterThanOrEqual(2);
      expect(task.keyPitfalls.length, task.id).toBeGreaterThanOrEqual(2);
      expect(task.interviewQuestions.length, task.id).toBeGreaterThanOrEqual(2);
      expect(task.referencePath, task.id).toBe(`/training/hot100/${task.id}/reference.py`);
      expect(task.testPath, task.id).toBe(`/training/hot100/${task.id}/test_solution.py`);
      const reference = readFileSync(resolve('public', task.referencePath!.slice(1)), 'utf8');
      const tests = readFileSync(resolve('public', task.testPath!.slice(1)), 'utf8');
      expect(reference, task.id).not.toContain('NotImplementedError');
      expect(tests, task.id).toMatch(/from solution import/);
      expect(tests, task.id).toContain('unittest');
    }
  });

  it('uses actual linked-list and tree Python contracts instead of serialized judge inputs', () => {
    const template = (number: number) => tasks.find(task => task.number === number)!.codeTemplate;
    expect(template(160)).toMatch(/getIntersectionNode\(self, headA: ListNode, headB: ListNode\)/);
    expect(template(160)).not.toMatch(/intersectVal|skipA|skipB/);
    expect(template(141)).toMatch(/hasCycle\(self, head:/);
    expect(template(142)).toMatch(/detectCycle\(self, head:/);
    expect(template(141) + template(142)).not.toMatch(/\bpos\b/);
    expect(template(138)).toContain('class Node:');
    expect(template(138)).toContain("copyRandomList(self, head: 'Optional[Node]')");
    expect(template(236)).toContain("lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode')");
    for (const [number, className] of [[146, 'LRUCache'], [155, 'MinStack'], [208, 'Trie'], [295, 'MedianFinder']] as const) {
      expect(template(number)).toContain(`class ${className}:`);
      expect(template(number)).not.toContain('class Solution:');
    }
  });
});
