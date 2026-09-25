import importedResources from '../content/library/imported-catalog.json';
import importedSources from '../content/library/imported-sources.json';
import linkedResources from '../content/library/linked-catalog.json';
import linkedSources from '../content/library/linked-sources.json';
import type { LibraryResource, LibrarySource } from '../content/library/types';
import type { KnowledgeArticle } from '../types';

export const libraryResources = [...importedResources, ...linkedResources] as LibraryResource[];
export const librarySources = [...importedSources, ...linkedSources] as LibrarySource[];

export const libraryPath = (id?: string) => id ? `/library/${encodeURIComponent(id)}` : '/library';

export function filterLibrary(query = '', sourceId = '', category = '') {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return libraryResources.filter(resource => (!sourceId || resource.sourceId === sourceId) &&
    (!category || resource.category === category) &&
    terms.every(term => `${resource.title} ${resource.category} ${resource.summary} ${resource.tags.join(' ')} ${librarySources.find(source => source.id === resource.sourceId)?.name || ''}`.toLocaleLowerCase().includes(term)));
}

export async function loadLibraryContent(resource: LibraryResource, signal?: AbortSignal): Promise<string> {
  if (resource.kind !== 'article' || !resource.contentPath || !/^\/library\/[a-z0-9-]+\.md$/.test(resource.contentPath)) {
    throw new Error('This resource is available at its original website.');
  }
  const response = await fetch(`${import.meta.env.BASE_URL}${resource.contentPath.slice(1)}`, { signal });
  if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error('The article could not be loaded. Please retry.');
  const markdown = await response.text();
  if (!markdown.trim() || /^\s*(<!doctype\s+html|<html[\s>])/i.test(markdown) || markdown.length > 2_000_000) {
    throw new Error('The article file is missing or invalid.');
  }
  return markdown;
}

// A separate note per resource and workspace; never writes to the published library.
export function libraryNote(resource: LibraryResource, source: LibrarySource, userId: string): KnowledgeArticle {
  const now = new Date().toISOString();
  return {
    id: `library-note-${resource.id}`, userId,
    title: `${resource.title} · 学习笔记`, category: resource.category,
    tags: [...new Set(['学习笔记', source.name, ...resource.tags])],
    summary: `围绕 ${resource.title} 的个人理解与练习记录。`,
    contentMarkdown: `# ${resource.title} · 学习笔记\n\n> 学习来源：[${source.name}](${resource.sourceUrl}) · 作者：${source.author}\n> [在本站打开资料](${libraryPath(resource.id)}) · [来源许可](${source.licenseUrl})\n\n## 我的理解\n\n用自己的话记录关键概念和适用条件。\n\n## 动手验证\n\n记录最小实验、结果与遇到的问题。\n\n## 面试自测\n\n列出一个需要解释的问题，并尝试脱稿回答。\n\n## 待复习的问题\n\n记录还没有解决的疑问。\n`,
    createdAt: now, updatedAt: now,
  };
}
