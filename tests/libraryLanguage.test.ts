import { describe, expect, it } from 'vitest';
import importedCatalog from '../src/content/library/imported-catalog.json';
import chineseTitles from '../src/content/library/aris-titles-zh.json';
import type { LibraryResource } from '../src/content/library/types';
import { getLibraryResourceForLanguage, getLibraryResourceLanguage, getLibraryResourceTitle, preferLibraryLanguage } from '../src/services/libraryLanguage';

const catalog = importedCatalog as LibraryResource[];
const makeResource = (id: string, overrides: Partial<LibraryResource> = {}): LibraryResource => ({
  id, sourceId: 'example', title: id, category: '基础', tags: [], summary: '', kind: 'article',
  sourceUrl: `https://example.org/${id}`, contentPath: `/library/${id}.md`, ...overrides,
});

describe('published library language metadata', () => {
  it('identifies all 151 source documents and pairs every ARIS topic in both directions', () => {
    expect(catalog).toHaveLength(151);
    expect(catalog.filter(resource => resource.language === 'zh')).toHaveLength(116);
    expect(catalog.filter(resource => resource.language === 'en')).toHaveLength(35);
    const aris = catalog.filter(resource => resource.sourceId === 'aris-ai-offer');
    expect(aris).toHaveLength(70);
    expect(new Set(aris.map(resource => resource.translationGroupId)).size).toBe(35);
    expect(Object.keys(chineseTitles)).toHaveLength(35);
    for (const resource of aris) {
      const alternate = aris.find(candidate => candidate.id === resource.alternateId);
      expect(alternate, resource.id).toBeDefined();
      expect(alternate?.alternateId, resource.id).toBe(resource.id);
      expect(alternate?.translationGroupId, resource.id).toBe(resource.translationGroupId);
      expect(alternate?.language, resource.id).not.toBe(resource.language);
      expect(resource.titleZh, resource.id).toMatch(/\p{Script=Han}/u);
      expect(resource.titleZh, resource.id).not.toMatch(/Cheat Sheet|Quick Reference/);
      expect(alternate?.titleZh, resource.id).toBe(resource.titleZh);
    }
  });

  it('chooses 35 Chinese or English ARIS versions while retaining the 81 Chinese-only AIInfra resources', () => {
    const chinese = preferLibraryLanguage(catalog, 'zh');
    const english = preferLibraryLanguage(catalog, 'en');
    expect(chinese).toHaveLength(116);
    expect(english).toHaveLength(116);
    expect(chinese.every(resource => resource.language === 'zh')).toBe(true);
    expect(english.filter(resource => resource.language === 'en')).toHaveLength(35);
    expect(english.filter(resource => resource.sourceId === 'aiinfra-guide')).toHaveLength(81);
  });
});

describe('content language selection', () => {
  it('preserves the original resource title and uses a reviewed Chinese display label only when requested', () => {
    const resource = Object.freeze(makeResource('agent', { title: 'Agent Foundations 面试 Cheat Sheet', titleZh: '智能体基础面试速查', language: 'zh' }));
    expect(getLibraryResourceTitle(resource, 'zh')).toBe('智能体基础面试速查');
    expect(getLibraryResourceTitle(resource, 'en')).toBe('Agent Foundations 面试 Cheat Sheet');
    expect(resource.title).toBe('Agent Foundations 面试 Cheat Sheet');
    expect(getLibraryResourceTitle(makeResource('single'), 'zh')).toBe('single');
    expect(getLibraryResourceTitle(makeResource('blank', { titleZh: '  ' }), 'zh')).toBe('blank');
  });

  it('uses explicit language before legacy tags without guessing language from technical words in the title', () => {
    expect(getLibraryResourceLanguage(makeResource('explicit', { language: 'zh', tags: ['English'] }))).toBe('zh');
    expect(getLibraryResourceLanguage(makeResource('legacy', { tags: ['English'] }))).toBe('en');
    expect(getLibraryResourceLanguage(makeResource('aris-ai-offer-attention-tutorial-en', { sourceId: 'aris-ai-offer' }))).toBe('en');
    expect(getLibraryResourceLanguage(makeResource('CUDA', { title: 'CUDA / GPU / Transformer' }))).toBe('zh');
  });

  it('keeps first-seen topic order, selects the matching version, and never mutates the input', () => {
    const english = Object.freeze(makeResource('topic-en', { language: 'en', translationGroupId: 'topic', alternateId: 'topic-zh' }));
    const single = Object.freeze(makeResource('single', { language: 'zh' }));
    const chinese = Object.freeze(makeResource('topic-zh', { language: 'zh', translationGroupId: 'topic', alternateId: 'topic-en' }));
    const input = Object.freeze([english, single, chinese]);
    expect(preferLibraryLanguage(input, 'zh')).toEqual([chinese, single]);
    expect(preferLibraryLanguage(input, 'en')).toEqual([english, single]);
    expect(getLibraryResourceForLanguage(english, input, 'zh')).toBe(chinese);
    expect(getLibraryResourceForLanguage(chinese, input, 'zh')).toBe(chinese);
    expect(input).toEqual([english, single, chinese]);
  });

  it('keeps unavailable translations and unrelated sources instead of sending the reader to the wrong document', () => {
    const english = makeResource('topic-en', { language: 'en', translationGroupId: 'topic', alternateId: 'missing' });
    const unrelated = makeResource('other-zh', { sourceId: 'other', language: 'zh', translationGroupId: 'topic' });
    const withoutGroup = makeResource('solo-en', { language: 'en' });
    const input = [english, unrelated, withoutGroup];
    expect(getLibraryResourceForLanguage(english, input, 'zh')).toBe(english);
    expect(getLibraryResourceForLanguage(withoutGroup, input, 'zh')).toBe(withoutGroup);
    expect(preferLibraryLanguage(input, 'zh')).toEqual(input);
    const chinese = makeResource('actual-zh', { language: 'zh', translationGroupId: 'topic' });
    expect(getLibraryResourceForLanguage(english, [...input, chinese], 'zh')).toBe(chinese);
  });
});
