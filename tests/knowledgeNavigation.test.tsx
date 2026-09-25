// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Knowledge } from '../src/pages/Knowledge';
import { ToastProvider } from '../src/components/common/Toast';
import { I18nProvider, LANGUAGE_STORAGE_KEY } from '../src/i18n/I18nProvider';
import type { KnowledgeArticle } from '../src/types';
import { knowledgeCategoryPath } from '../src/utils/knowledgeCatalog';

vi.mock('../src/hooks/useAICapabilities', () => ({
  useAICapabilities: () => ({
    capabilities: { provider: 'deepseek', model: 'deepseek-flash', webSearch: false, configured: false },
    loading: false,
    error: '',
    canSearch: false,
    searchUnavailableReason: 'AI is not configured on the server.',
  }),
}));
vi.mock('../src/services/aiCopilot', () => ({ requestSearchResearch: vi.fn() }));

const customCategory = '中文 RAG & Agent';
const articles: KnowledgeArticle[] = [
  { id: 'transformer', title: 'Attention foundations', category: '01 Transformer', summary: 'How attention works.', contentMarkdown: '## Attention details\n\nTransformer article body.' },
  { id: 'custom-rag', title: 'Retrieval practice', category: customCategory, summary: 'Search and ranking notes.', contentMarkdown: '## Retrieval details\n\nRetrieval article body.' },
  { id: 'custom-agent', title: 'Tool calling practice', category: customCategory, summary: 'Reliable tools and planning.', contentMarkdown: '## Tool details\n\nAgent article body.' },
].map(article => ({ ...article, userId: 'guest', tags: [], createdAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z' }));

function KnowledgeRoute() {
  const { articleId } = useParams();
  return <Knowledge articles={articles} selectedArticleId={articleId} onSaveArticle={async () => {}} onDeleteArticle={async () => {}} onNavigateToCopilot={() => {}} userId="guest" />;
}

function BrowserControls() {
  const navigate = useNavigate();
  const location = useLocation();
  return <>
    <button onClick={() => navigate(-1)}>Browser back</button>
    <output data-testid="location">{location.pathname}{location.search}{location.hash}</output>
  </>;
}

function openKnowledge(path = '/knowledge') {
  return render(<I18nProvider><ToastProvider><MemoryRouter initialEntries={[path]}>
    <BrowserControls />
    <Routes>
      <Route path="/knowledge" element={<KnowledgeRoute />} />
      <Route path="/knowledge/:articleId" element={<KnowledgeRoute />} />
    </Routes>
  </MemoryRouter></ToastProvider></I18nProvider>);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network is disabled in navigation tests')));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('opens a knowledge portal with article links and custom topics, without choosing an article to read', () => {
  openKnowledge();

  const list = screen.getByRole('region', { name: 'Article list' });
  for (const article of articles) {
    expect(within(list).getByRole('heading', { name: article.title })).toBeTruthy();
  }
  expect(screen.queryByText('Transformer article body.')).toBeNull();
  expect(screen.queryByText('Retrieval article body.')).toBeNull();
  expect(screen.queryByText('Agent article body.')).toBeNull();
  const categoryLink = within(screen.getByRole('navigation', { name: 'Knowledge categories' })).getByRole('link', { name: customCategory });
  const url = new URL(categoryLink.getAttribute('href')!, 'https://career.test');
  expect([...url.searchParams.entries()]).toEqual([['category', customCategory]]);
  expect(screen.getByTestId('location').textContent).toBe('/knowledge');
});

it('keeps an empty category empty even when other categories have articles', () => {
  openKnowledge(knowledgeCategoryPath('08 NLP'));

  const list = screen.getByRole('region', { name: 'Article list' });
  expect(within(list).getByText('This topic is ready for your first note.')).toBeTruthy();
  for (const article of articles) expect(screen.queryByText(article.title)).toBeNull();
  expect(screen.queryByText('Transformer article body.')).toBeNull();
  expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
});

it('restores a custom category and its search after opening an article and navigating back', async () => {
  const categoryPath = knowledgeCategoryPath(customCategory);
  openKnowledge(categoryPath);

  expect(screen.getByRole('heading', { level: 1, name: customCategory })).toBeTruthy();
  expect(screen.queryByText('Attention foundations')).toBeNull();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search knowledge articles' }), { target: { value: 'Retrieval' } });
  const list = screen.getByRole('region', { name: 'Article list' });
  expect(within(list).queryByText('Tool calling practice')).toBeNull();
  fireEvent.click(within(list).getByRole('link', { name: /^Retrieval practice/ }));

  expect(await screen.findByText('Retrieval article body.')).toBeTruthy();
  expect(screen.getByTestId('location').textContent).toBe('/knowledge/custom-rag');
  fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));

  await waitFor(() => {
    const url = new URL(screen.getByTestId('location').textContent!, 'https://career.test');
    expect(url.pathname).toBe('/knowledge');
    expect(url.searchParams.get('category')).toBe(customCategory);
    expect(url.searchParams.get('q')).toBe('Retrieval');
  });
  expect((screen.getByRole('textbox', { name: 'Search knowledge articles' }) as HTMLInputElement).value).toBe('Retrieval');
  const restoredList = screen.getByRole('region', { name: 'Article list' });
  expect(within(restoredList).getByRole('heading', { name: 'Retrieval practice' })).toBeTruthy();
  expect(within(restoredList).queryByText('Tool calling practice')).toBeNull();
  expect(screen.queryByText('Retrieval article body.')).toBeNull();
});

it('opens the exact deep-linked article and uses its topic link to return to a filtered list', async () => {
  openKnowledge('/knowledge/custom-agent');

  expect(screen.getByRole('heading', { level: 1, name: 'Tool calling practice' })).toBeTruthy();
  expect(screen.getByText('Agent article body.')).toBeTruthy();
  expect(screen.queryByText('Transformer article body.')).toBeNull();
  // Both responsive document trees are mounted; jsdom does not apply media queries.
  for (const navigation of screen.getAllByRole('navigation', { name: 'Knowledge document navigation' })) {
    expect(within(navigation).getByRole('link', { name: 'Tool calling practice' }).getAttribute('aria-current')).toBe('page');
  }
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Article breadcrumb' })).getByRole('link', { name: customCategory }));

  await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(knowledgeCategoryPath(customCategory)));
  const list = screen.getByRole('region', { name: 'Article list' });
  expect(within(list).getByRole('heading', { name: 'Retrieval practice' })).toBeTruthy();
  expect(within(list).getByRole('heading', { name: 'Tool calling practice' })).toBeTruthy();
  expect(within(list).queryByText('Attention foundations')).toBeNull();
  expect(screen.queryByText('Agent article body.')).toBeNull();
});

it('opens a new note in the URL category and keeps category and search when consuming the new flag', async () => {
  openKnowledge(`${knowledgeCategoryPath(customCategory)}&q=Retrieval&new=1`);

  const editor = await screen.findByRole('dialog', { name: 'Article editor' });
  expect((within(editor).getByLabelText('Category') as HTMLInputElement).value).toBe(customCategory);
  await waitFor(() => {
    const url = new URL(screen.getByTestId('location').textContent!, 'https://career.test');
    expect(url.searchParams.has('new')).toBe(false);
    expect(url.searchParams.get('category')).toBe(customCategory);
    expect(url.searchParams.get('q')).toBe('Retrieval');
  });
  fireEvent.click(within(editor).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog', { name: 'Article editor' })).toBeNull();
  expect((screen.getByRole('textbox', { name: 'Search knowledge articles' }) as HTMLInputElement).value).toBe('Retrieval');
  expect(within(screen.getByRole('region', { name: 'Article list' })).queryByText('Tool calling practice')).toBeNull();
});
