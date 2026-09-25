import { describe, expect, it } from 'vitest';
import { getKnowledgeCategories, knowledgeCategoryPath } from '../src/utils/knowledgeCatalog';

describe('knowledge category navigation', () => {
  it.each([
    '06 Machine Learning',
    'RAG & Agent',
    '中文 分类 / 数据?x=1#笔记',
  ])('round-trips %s as one query value without changing the route', (category) => {
    const url = new URL(knowledgeCategoryPath(category), 'https://career.test');

    expect(url.pathname).toBe('/knowledge');
    expect([...url.searchParams.entries()]).toEqual([['category', category]]);
    expect(url.hash).toBe('');
  });

  it('keeps the built-in catalog and adds each exact custom category once without mutating articles', () => {
    const builtIn = getKnowledgeCategories([]);
    const articles = [
      { category: '中文 自定义 & RAG' },
      { category: builtIn[0] },
      { category: 'Career notes' },
      { category: '中文 自定义 & RAG' },
    ];
    const original = structuredClone(articles);

    const result = getKnowledgeCategories(articles);

    expect(result.slice(0, builtIn.length)).toEqual(builtIn);
    expect(result).toHaveLength(builtIn.length + 2);
    expect(new Set(result).size).toBe(result.length);
    expect(result).toContain('中文 自定义 & RAG');
    expect(result).toContain('Career notes');
    expect(articles).toEqual(original);
  });
});
