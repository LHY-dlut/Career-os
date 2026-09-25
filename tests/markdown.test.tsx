import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { extractHeadings } from '../src/utils/markdownHeadings';
import { parseMarkdownWithFrontmatter, serializeArticleToMarkdown } from '../src/utils/markdownFrontmatter';
import { MarkdownRenderer } from '../src/components/common/MarkdownRenderer';
import { createStudyData } from '../src/repositories/local';
import { I18nProvider } from '../src/i18n/I18nProvider';
it('makes TOC and rendered IDs agree for Chinese, inline markup, setext, duplicate and colliding headings', () => {
  const markdown = '# 中文 标题\n## A **bold** `code`\n## A bold code\n## A bold code-2\n## !!!\nAnother heading\n---\n```python\n# not a heading\n```';
  const headings = extractHeadings(markdown);
  const html = renderToStaticMarkup(<I18nProvider><MarkdownRenderer content={markdown} /></I18nProvider>);
  expect(headings).toHaveLength(6); expect(new Set(headings.map(h => h.id)).size).toBe(6);
  headings.forEach(h => expect(html).toContain(`id="${h.id}"`));
  expect(headings[0].id).toBe('heading-中文-标题');
  expect(html).not.toContain('<pre><div');
});
it('round trips quotes, commas, newlines, explicit categories and Chinese frontmatter', () => {
  const article = { ...createStudyData('guest').articles[0], title: '中文 "quoted"', tags: ['one,two', '三'], summary: 'line 1\nline 2: "quoted"', contentMarkdown: '# Transformer and RAG\n\nText' };
  const result = parseMarkdownWithFrontmatter(serializeArticleToMarkdown(article));
  expect(result).toMatchObject({ title: article.title, tags: article.tags, summary: article.summary, category: article.category, contentMarkdown: article.contentMarkdown });
});
it('accepts CRLF/BOM, infers when absent, rejects broken YAML', () => {
  expect(parseMarkdownWithFrontmatter('\uFEFF---\r\ntitle: Test\r\ncategory: 04 Agent\r\n---\r\n# Body').category).toBe('04 Agent');
  expect(parseMarkdownWithFrontmatter('# RAG intro').category).toBe('03 RAG');
  expect(() => parseMarkdownWithFrontmatter('---\ntags: [broken\n---\n# Body')).toThrow();
});
