import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { libraryResources } from '../src/services/learningLibrary';
import { preferLibraryLanguage } from '../src/services/libraryLanguage';
import { filterCourse, findCoursePath, flattenCourse, getLibraryCourses, getReadingCourse, libraryCourseLink, libraryStats, naturalCourseCompare } from '../src/services/libraryCourses';
import { getLibraryTrainingLinks } from '../src/services/libraryTrainingLinks';
import type { LibraryResource } from '../src/content/library/types';

const chinese = preferLibraryLanguage(libraryResources, 'zh');

it('uses pinned AIInfra chapters and puts their detailed sections under the correct parents', () => {
  const course = getLibraryCourses(chinese, 'source', 'zh').find(course => course.id === 'source-aiinfra-guide')!;
  const path = findCoursePath(course, 'aiinfra-guide-5328322073d0c2f3');
  expect(path.map(node => node.title)).toEqual(['AIInfraGuide', 'AI Infra 前置基础', '第3章：AI Infra工程师学Transformer', '3.3 Self-Attention机制深入理解']);
  expect(path[2].resourceId).toBe('aiinfra-guide-cc408d5cb153a180');
  const distributed = course.children.find(node => node.id === 'aiinfra-distributed-training')!;
  expect(distributed.children.map(node => node.title.match(/^第(\d+)章/)?.[1])).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
  const order = flattenCourse(course);
  expect(order.indexOf(path[2].resourceId!)).toBeLessThan(order.indexOf(path[3].resourceId!));
  expect(order).toHaveLength(81);
});

it('naturally orders numbered siblings and preserves parents when filtering to a detailed article', () => {
  expect([{ title: '1.10' }, { title: '1.2' }, { title: '1.1' }].sort(naturalCourseCompare).map(node => node.title)).toEqual(['1.1', '1.2', '1.10']);
  const course = getLibraryCourses(chinese, 'source', 'zh')[0];
  const filtered = filterCourse(course, new Set(['aiinfra-guide-5328322073d0c2f3']))!;
  expect(flattenCourse(filtered)).toEqual(['aiinfra-guide-5328322073d0c2f3']);
  expect(findCoursePath(filtered, 'aiinfra-guide-5328322073d0c2f3')).toHaveLength(4);
  expect(flattenCourse(course)).toHaveLength(81);
});

it('shows eight curated learning paths, covers every topic and keeps unknown future resources readable', () => {
  const paths = getLibraryCourses(chinese, 'path', 'zh');
  expect(paths).toHaveLength(8);
  expect(new Set(paths.flatMap(flattenCourse))).toEqual(new Set(chinese.map(resource => resource.id)));
  const unknown: LibraryResource = { id: 'future-resource', title: 'Future material', sourceId: 'future-source', category: '', tags: [], summary: '', kind: 'link', sourceUrl: 'https://example.org' };
  const expanded = getLibraryCourses([...chinese, unknown], 'path', 'zh');
  expect(expanded.at(-1)?.id).toBe('path-unclassified');
  expect(flattenCourse(expanded.at(-1)!)).toContain(unknown.id);
});

it('uses the original ARIS home page order and resolves 35 topics into the requested editions', () => {
  const zh = getLibraryCourses(chinese, 'source', 'zh').find(course => course.id === 'source-aris-ai-offer')!;
  expect(flattenCourse(zh)[0]).toBe('aris-ai-offer-attention-tutorial');
  expect(flattenCourse(zh)).toHaveLength(35);
  const en = getLibraryCourses(preferLibraryLanguage(libraryResources, 'en'), 'source', 'en').find(course => course.id === zh.id)!;
  expect(flattenCourse(en)).toHaveLength(35);
  expect(flattenCourse(en).every(id => libraryResources.find(resource => resource.id === id)?.language === 'en')).toBe(true);
  const all = getLibraryCourses(libraryResources, 'source', 'zh').find(course => course.id === zh.id)!;
  expect(flattenCourse(all)).toHaveLength(70);
  expect(libraryStats(flattenCourse(all).map(id => libraryResources.find(resource => resource.id === id)!)).topics).toBe(35);
});

it('retains the chosen learning path for a shared article and preserves filters in lesson navigation', () => {
  const paths = getLibraryCourses(chinese, 'path', 'zh');
  const shared = 'aiinfra-guide-bc9237c2c72b1d2b';
  const selected = getReadingCourse(paths, shared, 'path-transformer')!;
  expect(selected.id).toBe('path-transformer');
  const url = new URL(libraryCourseLink(shared, '?source=aiinfra-guide&q=Attention&lang=zh&page=3', selected, 'path'), 'https://career.test');
  expect(url.searchParams.get('course')).toBe('path-transformer');
  expect(url.searchParams.get('source')).toBe('aiinfra-guide');
  expect(url.searchParams.get('q')).toBe('Attention');
  expect(url.searchParams.get('lang')).toBe('zh');
  expect(url.searchParams.has('page')).toBe(false);
  expect(url.hash).toBe('');
});

it('labels original outlines separately from substantive source chapters and links only real training tasks', () => {
  expect(libraryResources.filter(resource => resource.contentStatus === 'outline')).toHaveLength(35);
  expect(libraryResources.find(resource => resource.id === 'aiinfra-guide-a2f11c9bbc82d504')?.contentStatus).toBe('complete');
  expect(libraryResources.find(resource => resource.id === 'aiinfra-guide-bf08fe797a94bda6')?.contentStatus).toBe('complete');
  const tasks = JSON.parse(readFileSync('src/content/training/pytorch.json', 'utf8')) as { id: string }[];
  const ids = new Set(tasks.map(task => task.id));
  for (const resource of libraryResources) for (const link of getLibraryTrainingLinks(resource)) {
    expect(ids.has(link.id), `${resource.id} references an existing task`).toBe(true);
    expect(link.href).toBe(`/coding/${link.id}?track=pytorch`);
  }
});
