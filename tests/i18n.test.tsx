// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { I18nProvider, LANGUAGE_STORAGE_KEY, useI18n } from '../src/i18n/I18nProvider';
import { Navbar } from '../src/components/layout/Navbar';
import { MemoryRouter } from 'react-router-dom';

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function Page() {
  const { label, locale, translateMessage } = useI18n();
  return <>
    <Navbar currentView="dashboard" onOpenCommandPalette={() => {}} isDark={false} onToggleTheme={() => {}} currentUser={null} onSignIn={() => {}} onSignOut={() => {}} onQuickAdd={() => {}} />
    <input aria-label="user draft" defaultValue="My Transformer 笔记" />
    <select aria-label="status" defaultValue="Applied"><option value="Applied">{label('Applied')}</option><option value="Interviewing">{label('Interviewing')}</option></select>
    <span data-testid="locale">{locale}</span>
    <span>{translateMessage('AI request timed out. Please retry.')}</span>
  </>;
}
const tree = () => <I18nProvider><MemoryRouter initialEntries={['/dashboard']}><Page /></MemoryRouter></I18nProvider>;

it('switches the real navbar immediately and preserves drafts, enum values, records and the choice after remount', () => {
  localStorage.setItem('ai_career_os:guest:workspace', '{"title":"Original record"}');
  const app = render(tree());
  expect(screen.getByRole('link', { name: '学习总览' })).toBeTruthy();
  expect(document.documentElement.lang).toBe('zh-CN');
  fireEvent.change(screen.getByLabelText('user draft'), { target: { value: '未保存的自写内容' } });
  fireEvent.click(screen.getByRole('button', { name: '切换为英文' }));
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy();
  expect((screen.getByLabelText('user draft') as HTMLInputElement).value).toBe('未保存的自写内容');
  expect((screen.getByLabelText('status') as HTMLSelectElement).value).toBe('Applied');
  expect(screen.getByRole('option', { name: 'Applied' })).toBeTruthy();
  expect(localStorage.getItem('ai_career_os:guest:workspace')).toBe('{"title":"Original record"}');
  expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  expect(screen.getByTestId('locale').textContent).toBe('en-US');
  app.unmount();
  render(tree());
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Switch to Chinese' }));
  expect(screen.getByRole('option', { name: '已投递' })).toBeTruthy();
  expect(screen.getByText('AI 请求超时，请重试。')).toBeTruthy();
});

it('falls back from invalid preferences and follows changes made in another browser tab', () => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'unknown');
  render(tree());
  expect(screen.getByRole('link', { name: '学习总览' })).toBeTruthy();
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: LANGUAGE_STORAGE_KEY, newValue: 'en' })));
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy();
  expect(document.documentElement.lang).toBe('en');
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: LANGUAGE_STORAGE_KEY, newValue: null })));
  expect(document.documentElement.lang).toBe('zh-CN');
});

it('still switches during a session when browser storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  render(tree());
  fireEvent.click(screen.getByRole('button', { name: '切换为英文' }));
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy();
});
