import { describe, expect, it } from 'vitest';
import { SEED_ARTICLES } from '../src/services/seedData';
import { localizeStarterArticle, STARTER_ARTICLE_TRANSLATIONS } from '../src/services/starterArticleLocalization';
import type { KnowledgeArticle } from '../src/types';

function savedArticle(index = 0): KnowledgeArticle {
  return {
    ...SEED_ARTICLES[index],
    tags: [...SEED_ARTICLES[index].tags],
    id: `saved-article-${index}`,
    userId: 'existing-account',
    createdAt: '2024-01-02T03:04:05.000Z',
    updatedAt: '2025-06-07T08:09:10.000Z',
  };
}
const displayMath = (content: string) => [...content.matchAll(/\$\$([\s\S]*?)\$\$/g)].map(match => match[1].replace(/\s+/g, ''));

describe('starter article reading translations', () => {
  it.each(SEED_ARTICLES.map((starter, index) => ({ title: starter.title, index })))('translates the complete saved article: $title', ({ index }) => {
    const article = savedArticle(index);
    const before = JSON.stringify(article);
    Object.freeze(article.tags);
    Object.freeze(article);

    const localized = localizeStarterArticle(article, 'zh');
    expect(localized).not.toBe(article);
    expect(localized.title).toMatch(/[\u4e00-\u9fff]/);
    expect(localized.summary).toMatch(/[\u4e00-\u9fff]/);
    expect(localized.subcategory).toMatch(/[\u4e00-\u9fff]/);
    // The reading copy includes all source sections, rather than a Chinese summary only.
    const sourceHeadings = article.contentMarkdown.match(/^#{1,6} .+$/gm) || [];
    const translatedHeadings = localized.contentMarkdown.match(/^#{1,6} .+$/gm) || [];
    expect(translatedHeadings).toHaveLength(sourceHeadings.length);
    for (const heading of translatedHeadings) expect(heading).toMatch(/[\u4e00-\u9fff]/);
    expect(localized.contentMarkdown.match(/[\u4e00-\u9fff]/g)!.length).toBeGreaterThan(250);
    expect(localized.contentMarkdown).toContain(`# ${localized.title}`);
    expect(localized.id).toBe(article.id);
    expect(localized.userId).toBe(article.userId);
    expect(localized.createdAt).toBe(article.createdAt);
    expect(localized.updatedAt).toBe(article.updatedAt);
    expect(localized.category).toBe(article.category);
    expect(JSON.stringify(article)).toBe(before);
  });

  it('returns the original English records, including when a saved record has custom identity and dates', () => {
    for (let index = 0; index < SEED_ARTICLES.length; index++) {
      const article = savedArticle(index);
      expect(localizeStarterArticle(article, 'en')).toBe(article);
    }
  });

  const edits: [string, (article: KnowledgeArticle) => KnowledgeArticle][] = [
    ['title', article => ({ ...article, title: `${article.title} (my revision)` })],
    ['category', article => ({ ...article, category: 'My personal category' })],
    ['subcategory', article => ({ ...article, subcategory: undefined })],
    ['tags', article => ({ ...article, tags: [...article.tags, 'Personal'] })],
    ['tag order', article => ({ ...article, tags: [...article.tags].reverse() })],
    ['summary', article => ({ ...article, summary: `${article.summary} 我的补充。` })],
    ['body', article => ({ ...article, contentMarkdown: `${article.contentMarkdown}\n我的学习笔记。` })],
    ['body whitespace', article => ({ ...article, contentMarkdown: `${article.contentMarkdown} ` })],
  ];
  it.each(edits)('leaves a user-edited %s unchanged even when the other starter fields match', (_field, edit) => {
    const article = edit(savedArticle());
    expect(localizeStarterArticle(article, 'zh')).toBe(article);
    expect(localizeStarterArticle(article, 'en')).toBe(article);
  });

  it('does not translate a personal article merely because it has a known starter id', () => {
    const article = { ...savedArticle(), id: 'seed-art-1', title: '我的研究', contentMarkdown: '# 我的研究\n\nPersonal notes.' };
    expect(localizeStarterArticle(article, 'zh')).toBe(article);
  });

  it('recognizes CRLF and LF copies without accepting other content changes', () => {
    const article = savedArticle();
    article.contentMarkdown = article.contentMarkdown.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    const localized = localizeStarterArticle(article, 'zh');
    expect(localized.title).toBe('自注意力与缩放点积注意力');
    expect(article.contentMarkdown).toContain('\r\n');
    const changed = { ...article, contentMarkdown: article.contentMarkdown.replace('Where:', 'Where (edited):') };
    expect(localizeStarterArticle(changed, 'zh')).toBe(changed);
  });

  it('keeps original display formulas intact except for the explicitly corrected KV arithmetic', () => {
    for (let index = 0; index < SEED_ARTICLES.length; index++) {
      if (index === 2) continue;
      const article = savedArticle(index);
      const translatedMath = displayMath(localizeStarterArticle(article, 'zh').contentMarkdown);
      for (const formula of displayMath(article.contentMarkdown)) expect(translatedMath).toContain(formula);
    }
  });

  it('includes sourced corrections for the old KV factor and the overbroad RoPE decay claim', () => {
    const kv = localizeStarterArticle(savedArticle(2), 'zh').contentMarkdown;
    expect(kv).toContain('2,621,440');
    expect(kv).toContain('167,772,160,000');
    expect(kv).toContain('167.77');
    expect(kv).toContain('旧入门稿勘误');
    expect(kv).toContain('https://huggingface.co/docs/transformers/main/cache_explanation#cache-storage-implementation');
    expect(displayMath(kv).some(formula => formula.includes('=2\\times2\\times'))).toBe(false);
    const rope = localizeStarterArticle(savedArticle(1), 'zh').contentMarkdown;
    expect(rope).toContain('并不保证');
    expect(rope).toContain('单调下降');
    expect(rope).toContain('https://arxiv.org/html/2104.09864v5');
    // The legacy English source remains a matching fingerprint, not silently rewritten data.
    expect(savedArticle(2).contentMarkdown).toContain('5,242,880');
  });

  it('returns isolated tag arrays and leaves already-localized copies unchanged', () => {
    const article = savedArticle();
    const first = localizeStarterArticle(article, 'zh');
    const second = localizeStarterArticle(article, 'zh');
    first.tags.push('临时显示修改');
    expect(second.tags).not.toContain('临时显示修改');
    expect(STARTER_ARTICLE_TRANSLATIONS[article.title].tags).not.toContain('临时显示修改');
    expect(article.tags).toEqual(SEED_ARTICLES[0].tags);
    expect(localizeStarterArticle(second, 'zh')).toBe(second);
  });
});
