import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { libraryNote, libraryResources, librarySources, loadLibraryContent } from '../src/services/learningLibrary';
import type { LibraryResource, LibrarySource } from '../src/content/library/types';
import { extractHeadings } from '../src/utils/markdownHeadings';

const article: LibraryResource = {
  id: 'example-attention', sourceId: 'example', title: 'Attention practice', category: 'Transformer',
  tags: ['Attention'], summary: 'A third-party explanation that should not become a personal note.',
  kind: 'article', sourceUrl: 'https://example.org/attention', contentPath: '/library/example-attention.md',
};
const source: LibrarySource = {
  id: 'example', name: 'Example learning guide', url: 'https://example.org/', author: 'Example Author',
  license: 'MIT', licenseUrl: 'https://example.org/LICENSE', checkedAt: '2026-09-25', description: 'A test source.',
};

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('published learning library integrity', () => {
  it('gives every resource a unique route and a traceable source without embedded credentials', () => {
    expect(libraryResources).toHaveLength(186);
    expect(new Set(libraryResources.map(resource => resource.id)).size).toBe(libraryResources.length);
    expect(new Set(librarySources.map(item => item.id)).size).toBe(librarySources.length);
    const sourceById = new Map(librarySources.map(item => [item.id, item]));

    for (const item of librarySources) {
      expect(item.name.trim(), item.id).not.toBe('');
      expect(item.author.trim(), item.id).not.toBe('');
      expect(item.license.trim(), item.id).not.toBe('');
      expect(item.checkedAt, item.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const resource of libraryResources) {
      expect(resource.id).toMatch(/^[a-z0-9-]+$/);
      expect(sourceById.has(resource.sourceId), resource.id).toBe(true);
      expect(resource.title.trim(), resource.id).not.toBe('');
      if (resource.kind === 'link') expect(resource.contentPath, resource.id).toBeUndefined();
    }
    const urls = [
      ...libraryResources.map(resource => ({ value: resource.sourceUrl, original: sourceById.get(resource.sourceId)?.origin === 'original' })),
      ...librarySources.flatMap(item => [item.url, item.licenseUrl].map(value => ({ value, original: item.origin === 'original' }))),
    ];
    for (const { value, original } of urls) {
      if (original && value.startsWith('/')) {
        expect(value).toMatch(/^\/library\/career-[a-zA-Z0-9-]+\.md$/);
        expect(readFileSync(resolve('public', value.slice(1)), 'utf8').trim()).not.toBe('');
        continue;
      }
      const url = new URL(value);
      expect(url.protocol, value).toBe('https:');
      expect(url.username + url.password, value).toBe('');
    }
  });

  it('ships each local article and resolves its rendered Markdown links independently of the source site path', () => {
    const articles = libraryResources.filter(resource => resource.kind === 'article');
    expect(articles.filter(resource => librarySources.find(source => source.id === resource.sourceId)?.origin !== 'original')).toHaveLength(151);
    expect(articles.filter(resource => librarySources.find(source => source.id === resource.sourceId)?.origin === 'original')).toHaveLength(6);
    const articleIds = new Set(articles.map(resource => resource.id));
    const articleHeadings = new Map(articles.map(resource => [resource.id, new Set(extractHeadings(readFileSync(resolve('public', resource.contentPath!.slice(1)), 'utf8')).map(heading => heading.id))]));
    const paths = new Set<string>();
    const provenance = JSON.parse(readFileSync('public/library/licenses/provenance.json', 'utf8')).resources;
    expect(provenance).toHaveLength(151);
    const trainingIds = new Set((JSON.parse(readFileSync('src/content/training/pytorch.json', 'utf8')) as { id: string }[]).map(task => task.id));
    const parser = unified().use(remarkParse);
    for (const resource of articles) {
      const origin = librarySources.find(item => item.id === resource.sourceId)!;
      if (origin.origin !== 'original') {
        expect(origin.license, resource.id).toMatch(/MIT|CC BY|Apache|BSD/i);
        expect(origin.revision, resource.id).toMatch(/^[a-f0-9]{40}$/);
      } else expect(origin.license.trim(), resource.id).not.toBe('');
      expect(resource.contentPath, resource.id).toMatch(/^\/library\/[a-z0-9-]+\.md$/);
      expect(paths.has(resource.contentPath!), resource.id).toBe(false);
      paths.add(resource.contentPath!);
      const markdown = readFileSync(resolve('public', resource.contentPath!.slice(1)), 'utf8');
      const recorded = provenance.find((entry: { id: string }) => entry.id === resource.id);
      if (origin.origin === 'original') {
        expect(recorded, resource.id).toBeUndefined();
        expect(resource.contentStatus, resource.id).toBe('original-complete');
        expect(markdown, resource.id).toContain('Career OS');
        expect(markdown, resource.id).toContain(origin.author);
      } else {
        expect(recorded, resource.id).toBeDefined();
        expect(createHash('sha256').update(markdown).digest('hex'), resource.id).toBe(recorded.storedSha256);
      }
      expect(markdown.trim(), resource.id).not.toBe('');
      expect(markdown, resource.id).not.toMatch(/^\s*(?:<!doctype\s+html|<html[\s>])/i);

      visit(parser.parse(markdown), node => {
        if (!('url' in node) || typeof node.url !== 'string') return;
        const url = node.url;
        const location = `${resource.id}: ${url}`;
        if (url.startsWith('#')) {
          expect(articleHeadings.get(resource.id)?.has(decodeURIComponent(url.slice(1))), location).toBe(true);
          return;
        }
        if (url === `/library/licenses/${resource.sourceId}-MIT.txt`) {
          expect(readFileSync(resolve('public', url.slice(1)), 'utf8'), location).toMatch(/Permission is hereby granted/);
          return;
        }
        if (origin.origin === 'original' && url === '/library/career-LICENSE.md') {
          expect(readFileSync(resolve('public', url.slice(1)), 'utf8'), location).toContain(origin.license);
          return;
        }
        if (origin.origin === 'original' && url.startsWith('/coding/')) {
          const target = new URL(url, 'https://career.test');
          expect(trainingIds.has(target.pathname.slice('/coding/'.length)), location).toBe(true);
          expect(target.searchParams.get('track'), location).toBe('pytorch');
          return;
        }
        if (/^\/library\/[a-z0-9-]+(?:#.*)?$/.test(url)) {
          const [target, fragment] = url.slice('/library/'.length).split('#');
          expect(articleIds.has(target), location).toBe(true);
          if (fragment) expect(articleHeadings.get(target)?.has(decodeURIComponent(fragment)), location).toBe(true);
          return;
        }
        // Relative images and source-relative links would silently resolve against Career OS.
        expect(url, location).toMatch(/^(https?:\/\/|mailto:)/i);
        const parsed = new URL(url);
        expect(parsed.username + parsed.password, location).toBe('');
      });
    }
  }, 60_000);
});

describe('local article loading', () => {
  it('does not fetch external-only resources or paths outside the published Markdown directory', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const invalid = [
      { ...article, kind: 'link' as const },
      { ...article, contentPath: undefined },
      ...['https://example.org/guide.md', '/library/../private.md', '/library/guide.html'].map(contentPath => ({ ...article, contentPath })),
    ];
    for (const resource of invalid) await expect(loadLibraryContent(resource)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns Markdown from the local published file', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('## Attention\n\nReadable content.', { headers: { 'content-type': 'text/markdown' } })));
    await expect(loadLibraryContent(article)).resolves.toBe('## Attention\n\nReadable content.');
  });

  it('rejects failed responses and SPA HTML fallbacks instead of showing them as an article', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const responses = [
      new Response('Missing', { status: 404 }),
      new Response('<main>Application shell</main>', { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      new Response('\n<!doctype html><html><body>Application shell</body></html>'),
      new Response('   '),
    ];
    for (const response of responses) {
      fetchMock.mockResolvedValueOnce(response);
      await expect(loadLibraryContent(article)).rejects.toThrow();
    }
  });

  it('propagates cancellation so leaving a resource can stop its pending download', async () => {
    vi.stubGlobal('fetch', vi.fn((_input: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Download cancelled', 'AbortError')), { once: true });
    })));
    const controller = new AbortController();
    const pending = loadLibraryContent(article, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('preserves network failures for the reader retry flow', async () => {
    const failure = new TypeError('Network unavailable');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure));
    await expect(loadLibraryContent(article)).rejects.toBe(failure);
  });
});

it('creates attributable personal-note templates without copying third-party content or changing the public resource', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-25T09:00:00.000Z'));
  const originalResource = structuredClone(article);
  const originalSource = structuredClone(source);
  const first = libraryNote(article, source, 'owner-a');
  vi.setSystemTime(new Date('2026-09-26T09:00:00.000Z'));
  const later = libraryNote(article, source, 'owner-a');
  const otherOwner = libraryNote(article, source, 'owner-b');

  expect(first.id).toBe(later.id);
  expect(first.userId).toBe('owner-a');
  expect(otherOwner.userId).toBe('owner-b');
  expect(first.contentMarkdown).toContain(article.sourceUrl);
  expect(first.contentMarkdown).toContain(source.licenseUrl);
  expect(first.contentMarkdown).toContain(source.author);
  expect(first.contentMarkdown).not.toContain(article.summary);
  expect(first.contentMarkdown).toContain('## 我的理解');
  first.tags.push('Personal tag');
  expect(article).toEqual(originalResource);
  expect(source).toEqual(originalSource);
});
