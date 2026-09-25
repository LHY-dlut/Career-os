import importedResources from '../content/library/imported-catalog.json';
import importedSources from '../content/library/imported-sources.json';
import linkedResources from '../content/library/linked-catalog.json';
import linkedSources from '../content/library/linked-sources.json';
import type { LibraryResource, LibrarySource } from '../content/library/types';
import type { KnowledgeArticle } from '../types';
import { getLibraryResourceTitle, preferLibraryLanguage } from './libraryLanguage';

export const libraryResources = [...importedResources, ...linkedResources] as LibraryResource[];
export const librarySources = [...importedSources, ...linkedSources] as LibrarySource[];

export const libraryPath = (id?: string) => id ? `/library/${encodeURIComponent(id)}` : '/library';

export function filterLibrary(query = '', sourceId = '', category = '', language?: 'zh' | 'en') {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const resources = language ? preferLibraryLanguage(libraryResources, language) : libraryResources;
  return resources.filter(resource => (!sourceId || resource.sourceId === sourceId) &&
    (!category || resource.category === category) &&
    terms.every(term => `${resource.title} ${getLibraryResourceTitle(resource, language || 'zh')} ${resource.category} ${resource.summary} ${resource.tags.join(' ')} ${librarySources.find(source => source.id === resource.sourceId)?.name || ''}`.toLocaleLowerCase().includes(term)));
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
export function libraryNote(resource: LibraryResource, source: LibrarySource, userId: string, language: 'zh' | 'en' = 'zh'): KnowledgeArticle {
  const now = new Date().toISOString();
  const title = getLibraryResourceTitle(resource, language);
  return {
    id: `library-note-${resource.id}`, userId,
    title: `${title} · ${language === 'zh' ? '学习笔记' : 'Learning notes'}`, category: resource.category,
    tags: [...new Set(['学习笔记', source.name, ...resource.tags])],
    summary: language === 'zh' ? `围绕 ${title} 的个人理解与练习记录。` : `My understanding and practice notes on ${title}.`,
    contentMarkdown: language === 'zh'
      ? `# ${title} · 学习笔记\n\n> 学习来源：[${source.name}](${resource.sourceUrl}) · 作者：${source.author}\n> [在本站打开资料](${libraryPath(resource.id)}) · [来源许可](${source.licenseUrl})\n\n## 我的理解\n\n用自己的话记录关键概念和适用条件。\n\n## 动手验证\n\n记录最小实验、结果与遇到的问题。\n\n## 面试自测\n\n列出一个需要解释的问题，并尝试脱稿回答。\n\n## 待复习的问题\n\n记录还没有解决的疑问。\n`
      : `# ${title} · Learning notes\n\n> Source: [${source.name}](${resource.sourceUrl}) · Author: ${source.author}\n> [Read in this library](${libraryPath(resource.id)}) · [Source license](${source.licenseUrl})\n\n## My understanding\n\nExplain the key ideas and when they apply in your own words.\n\n## Hands-on practice\n\nRecord a small experiment, its results and any questions.\n\n## Interview practice\n\nWrite a question and try answering without referring to the material.\n\n## Questions to revisit\n\nRecord anything you have not understood yet.\n`,
    createdAt: now, updatedAt: now,
  };
}
