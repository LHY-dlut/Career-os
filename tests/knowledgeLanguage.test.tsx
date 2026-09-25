// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { Knowledge } from '../src/pages/Knowledge';
import { ToastProvider } from '../src/components/common/Toast';
import { I18nProvider, LANGUAGE_STORAGE_KEY, useI18n } from '../src/i18n/I18nProvider';
import { createStudyData, storageKey } from '../src/repositories/local';

vi.mock('../src/hooks/useAICapabilities', () => ({ useAICapabilities: () => ({ capabilities: null, canSearch: false, searchUnavailableReason: '' }) }));
vi.mock('../src/services/aiCopilot', () => ({ requestSearchResearch: vi.fn() }));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

function LanguageControls() {
  const { setLanguage } = useI18n();
  return <><button onClick={() => setLanguage('en')}>English UI</button><button onClick={() => setLanguage('zh')}>Chinese UI</button></>;
}

it('reads existing starter articles in Chinese and switches back without saving or replacing an editor draft', () => {
  const data = createStudyData('guest');
  const original = JSON.stringify(data);
  const key = storageKey('guest', 'data');
  localStorage.setItem(key, original);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh');
  const save = vi.fn();
  render(<I18nProvider><ToastProvider><MemoryRouter initialEntries={['/knowledge/seed-art-1']}>
    <LanguageControls />
    <Knowledge articles={data.articles} selectedArticleId="seed-art-1" onSaveArticle={save} onDeleteArticle={vi.fn()} onNavigateToCopilot={vi.fn()} userId="guest" />
  </MemoryRouter></ToastProvider></I18nProvider>);
  expect(screen.getByText('1. 数学表达式', { selector: 'h2' })).toBeTruthy();
  expect(screen.getAllByText('自注意力与缩放点积注意力', { selector: 'h1' }).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: 'English UI' }));
  expect(screen.getByText('1. Mathematical Formulation', { selector: 'h2' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Chinese UI' }));
  fireEvent.click(screen.getByTitle('编辑文章'));
  const title = screen.getByRole('textbox', { name: '标题' }) as HTMLInputElement;
  expect(title.value).toBe('自注意力与缩放点积注意力');
  fireEvent.change(title, { target: { value: '我的未保存理解' } });
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: LANGUAGE_STORAGE_KEY, newValue: 'en' })));
  expect((screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement).value).toBe('我的未保存理解');
  expect(save).not.toHaveBeenCalled();
  expect(localStorage.getItem(key)).toBe(original);
  expect(JSON.stringify(data)).toBe(original);
});
