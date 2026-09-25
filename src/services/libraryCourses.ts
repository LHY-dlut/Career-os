import sourceCourses from '../content/library/source-courses.json';
import learningPaths from '../content/library/learning-paths.json';
import type { LibraryCourse, LibraryCourseNode, LibraryResource } from '../content/library/types';
import type { Language } from '../i18n/I18nProvider';
import { getLibraryResourceTitle } from './libraryLanguage';

export type LibraryBrowseMode = 'path' | 'source';
export function naturalCourseCompare(a: { order?: number; title: string }, b: { order?: number; title: string }) {
  return (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title, 'zh-CN', { numeric: true });
}
export const courseNodeTitle = (node: LibraryCourseNode, language: Language) => language === 'en' && node.titleEn ? node.titleEn : node.title;
const topic = (resource: LibraryResource) => resource.translationGroupId || resource.id;
const leaf = (resource: LibraryResource, id: string, order: number, language: Language): LibraryCourseNode => ({ id, resourceId: resource.id, title: getLibraryResourceTitle(resource, language), order, children: [] });

export function flattenCourse(node: LibraryCourseNode): string[] {
  return [...new Set([...(node.resourceId ? [node.resourceId] : []), ...node.children.flatMap(flattenCourse)])];
}
export function findCoursePath(node: LibraryCourseNode, resourceId: string): LibraryCourseNode[] {
  if (node.resourceId === resourceId) return [node];
  for (const child of node.children) { const found = findCoursePath(child, resourceId); if (found.length) return [node, ...found]; }
  return [];
}
export function filterCourse(node: LibraryCourseNode, allowed: ReadonlySet<string>): LibraryCourseNode | null {
  const children = node.children.map(child => filterCourse(child, allowed)).filter((child): child is LibraryCourseNode => Boolean(child));
  const resourceId = node.resourceId && allowed.has(node.resourceId) ? node.resourceId : undefined;
  return resourceId || children.length ? { ...node, resourceId, children } : null;
}

export function getLibraryCourses(resources: LibraryResource[], mode: LibraryBrowseMode, language: Language): LibraryCourse[] {
  const resolve = (id: string) => resources.filter(resource => resource.id === id || topic(resource) === id.replace(/-en$/, ''));
  if (mode === 'source') {
    const expand = (node: LibraryCourseNode): LibraryCourseNode[] => {
      const children = node.children.flatMap(expand);
      if (!node.resourceId) return children.length ? [{ ...node, children }] : [];
      const versions = resolve(node.resourceId);
      if (!versions.length) return children.length ? [{ ...node, resourceId: undefined, children }] : [];
      return versions.map((resource, index) => ({ ...leaf(resource, `${node.id}-${resource.id}`, node.order + index / 100, language), children: index === 0 ? children : [] }));
    };
    const courses = (sourceCourses as LibraryCourse[]).map(course => ({ ...course, children: course.children.flatMap(expand) })).filter(course => course.children.length);
    const known = new Set(courses.flatMap(flattenCourse));
    const remaining = resources.filter(resource => !known.has(resource.id));
    for (const sourceId of new Set(remaining.map(resource => resource.sourceId))) {
      const list = remaining.filter(resource => resource.sourceId === sourceId);
      courses.push({ id: `source-${sourceId}`, sourceId, mode: 'source', title: sourceId === 'career-os-original' ? '本站补充教程' : '待归类', titleEn: sourceId === 'career-os-original' ? 'Career OS tutorials' : 'Unclassified', description: sourceId === 'career-os-original' ? '本站独立编写的教学单元，与上游原文分开署名。' : '未取得可靠的来源层级，保留资源等待归类。', order: courses.length, children: list.map((resource, index) => leaf(resource, `unclassified-${resource.id}`, index, language)) });
    }
    return courses;
  }
  const courses: LibraryCourse[] = learningPaths.map((course, index) => ({ id: `path-${course.id}`, title: course.title, titleEn: course.titleEn, description: course.description, mode: 'path', order: index, children: course.sections.map((section, order) => ({ id: `path-${course.id}-${section.id}`, title: section.title, order, children: section.resourceIds.flatMap((id, position) => resolve(id).map((resource, version) => leaf(resource, `path-${course.id}-${section.id}-${resource.id}`, position * 2 + version, language))) })).filter(section => section.children.length) }));
  const known = new Set(courses.flatMap(flattenCourse));
  const remaining = resources.filter(resource => !known.has(resource.id));
  if (remaining.length) courses.push({ id: 'path-unclassified', title: '待归类与延伸阅读', titleEn: 'Unclassified & further reading', description: '暂未编入学习路线的资料，仍保留原始链接与出处。', mode: 'path', order: courses.length, children: remaining.map((resource, index) => leaf(resource, `path-unclassified-${resource.id}`, index, language)) });
  return courses.filter(course => course.children.length);
}

export function getReadingCourse(courses: LibraryCourse[], resourceId: string, preferredId?: string | null) {
  return courses.find(course => course.id === preferredId && flattenCourse(course).includes(resourceId)) || courses.find(course => flattenCourse(course).includes(resourceId));
}

export function libraryCourseLink(resourceId: string | undefined, search: string, course?: LibraryCourse | string, mode?: LibraryBrowseMode) {
  const params = new URLSearchParams(search);
  if (course) params.set('course', typeof course === 'string' ? course : course.id);
  if (mode) { if (mode === 'source') params.set('view', 'source'); else params.delete('view'); }
  params.delete('page');
  return `/library${resourceId ? `/${encodeURIComponent(resourceId)}` : ''}${params.size ? `?${params}` : ''}`;
}

export function getContentStatus(resource: LibraryResource) {
  return resource.kind === 'link' ? 'external' : resource.contentStatus || 'complete';
}
export function libraryStats(resources: LibraryResource[]) {
  return { versions: resources.length, topics: new Set(resources.map(resource => `${resource.sourceId}:${topic(resource)}`)).size, complete: resources.filter(resource => getContentStatus(resource) === 'complete').length, outlines: resources.filter(resource => getContentStatus(resource) === 'outline').length, external: resources.filter(resource => resource.kind === 'link').length, originals: resources.filter(resource => getContentStatus(resource) === 'original-complete').length };
}
