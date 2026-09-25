// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Library } from '../src/pages/Library';
import { AppLayout } from '../src/layouts/AppLayout';
import { ToastProvider } from '../src/components/common/Toast';
import { I18nProvider, LANGUAGE_STORAGE_KEY } from '../src/i18n/I18nProvider';
import { emptyDataset, type Dataset } from '../src/repositories/contracts';
import { libraryNote, libraryPath, libraryResources, librarySources } from '../src/services/learningLibrary';

const workspace = vi.hoisted(() => ({
  data: null as unknown as Dataset,
  loading: false,
  authLoading: false,
  error: '',
  save: vi.fn(),
  refresh: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('../src/app/DataProvider', () => ({ useData: () => workspace }));
vi.mock('../src/app/AuthProvider', () => ({ useAuth: () => ({ user: null, loading: workspace.authLoading, signIn: vi.fn(), signOut: vi.fn() }) }));
vi.mock('../src/app/WorkspaceActions', () => ({ useWorkspaceActions: () => ({ save: workspace.save }) }));
vi.mock('../src/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }) }));

const article = libraryResources.find(resource => resource.kind === 'article')!;
const nextArticle = libraryResources.find(resource => resource.kind === 'article' && resource.id !== article.id)!;
const source = librarySources.find(item => item.id === article.sourceId)!;
const articleBody = '## Test learning section\n\nThe published article is readable independently of personal notes.';

function BrowserControls() {
  const navigate = useNavigate();
  const location = useLocation();
  return <>
    <button onClick={() => navigate(-1)}>Browser back</button>
    <button onClick={() => navigate(libraryPath(nextArticle.id))}>Next test resource</button>
    <output data-testid="location">{location.pathname}{location.search}{location.hash}</output>
  </>;
}

function openLibrary(path = '/library') {
  return render(<I18nProvider><ToastProvider><MemoryRouter initialEntries={[path]}>
    <BrowserControls />
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/library" element={<Library />} />
        <Route path="/library/:resourceId" element={<Library />} />
        <Route path="/knowledge/:articleId" element={<p>Personal note opened</p>} />
      </Route>
    </Routes>
  </MemoryRouter></ToastProvider></I18nProvider>);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh');
  workspace.data = emptyDataset();
  workspace.loading = false;
  workspace.authLoading = false;
  workspace.error = '';
  workspace.save.mockReset().mockResolvedValue(undefined);
  workspace.refresh.mockReset();
  workspace.reset.mockReset();
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(articleBody, { headers: { 'content-type': 'text/markdown' } })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('restores source, category, and search after opening a result and using browser back', async () => {
  openLibrary();
  fireEvent.change(screen.getByRole('combobox', { name: '按来源筛选' }), { target: { value: source.id } });
  fireEvent.click(within(screen.getByRole('navigation', { name: '资料分类' })).getByRole('button', { name: article.category }));
  fireEvent.change(screen.getByRole('textbox', { name: '搜索学习资料' }), { target: { value: article.title } });
  const filteredUrl = screen.getByTestId('location').textContent!;
  const params = new URL(filteredUrl, 'https://career.test').searchParams;
  expect(params.get('source')).toBe(source.id);
  expect(params.get('category')).toBe(article.category);
  expect(params.get('q')).toBe(article.title);
  const result = within(screen.getByLabelText('资料列表')).getByRole('heading', { name: article.title });
  fireEvent.click(result.closest('a')!);

  expect(await screen.findByText('The published article is readable independently of personal notes.')).toBeTruthy();
  expect(new URL(screen.getByTestId('location').textContent!, 'https://career.test').pathname).toBe(libraryPath(article.id));
  fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));

  await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(filteredUrl));
  expect((screen.getByRole('combobox', { name: '按来源筛选' }) as HTMLSelectElement).value).toBe(source.id);
  expect((screen.getByRole('textbox', { name: '搜索学习资料' }) as HTMLInputElement).value).toBe(article.title);
  expect(within(screen.getByRole('navigation', { name: '资料分类' })).getByRole('button', { name: article.category }).getAttribute('aria-pressed')).toBe('true');
  expect(within(screen.getByLabelText('资料列表')).getByRole('heading', { name: article.title })).toBeTruthy();
});

it('shows a retry action for a missing article file and recovers without losing the resource route', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response('<!doctype html><html>SPA shell</html>', { headers: { 'content-type': 'text/html' } }))
    .mockResolvedValueOnce(new Response(articleBody));
  vi.stubGlobal('fetch', fetchMock);
  openLibrary(libraryPath(article.id));

  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('SPA shell')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '重试加载' }));
  expect(await screen.findByText('The published article is readable independently of personal notes.')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId('location').textContent).toBe(libraryPath(article.id));
});

it('does not replace the current article with an older download that finishes after navigation', async () => {
  let finishFirst: (response: Response) => void = () => {};
  let firstSignal: AbortSignal | undefined;
  const fetchMock = vi.fn()
    .mockImplementationOnce((_url: unknown, options?: RequestInit) => {
      firstSignal = options?.signal || undefined;
      return new Promise<Response>(resolve => { finishFirst = resolve; });
    })
    .mockResolvedValueOnce(new Response('## Current resource\n\nThe second article remains visible.'));
  vi.stubGlobal('fetch', fetchMock);
  openLibrary(libraryPath(article.id));
  fireEvent.click(screen.getByRole('button', { name: 'Next test resource' }));

  expect(await screen.findByText('The second article remains visible.')).toBeTruthy();
  expect(firstSignal?.aborted).toBe(true);
  await act(async () => { finishFirst(new Response('## Old resource\n\nOutdated download content.')); });
  expect(screen.getByText('The second article remains visible.')).toBeTruthy();
  expect(screen.queryByText('Outdated download content.')).toBeNull();
  expect(screen.getByTestId('location').textContent).toBe(libraryPath(nextArticle.id));
});

it('opens an existing personal note without overwriting its edits with the note template', async () => {
  const existing = { ...libraryNote(article, source, 'guest'), contentMarkdown: '# My carefully edited notes\n\nKeep this original work.' };
  workspace.data.articles = [existing];
  const original = structuredClone(workspace.data);
  openLibrary(libraryPath(article.id));

  fireEvent.click(screen.getByRole('button', { name: '打开我的笔记' }));
  expect(await screen.findByText('Personal note opened')).toBeTruthy();
  expect(screen.getByTestId('location').textContent).toBe(`/knowledge/${existing.id}`);
  expect(workspace.save).not.toHaveBeenCalled();
  expect(workspace.data).toEqual(original);
});

it('creates a separate note only after saving succeeds and does not copy the article body', async () => {
  openLibrary(libraryPath(article.id));
  expect(await screen.findByText('The published article is readable independently of personal notes.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '写学习笔记' }));

  expect(await screen.findByText('Personal note opened')).toBeTruthy();
  expect(workspace.save).toHaveBeenCalledTimes(1);
  const [collection, note] = workspace.save.mock.calls[0];
  expect(collection).toBe('articles');
  expect(note.userId).toBe('guest');
  expect(note.contentMarkdown).toContain(article.sourceUrl);
  expect(note.contentMarkdown).not.toContain('The published article is readable independently of personal notes.');
  expect(note.contentMarkdown).toContain('## 我的理解');
  expect(screen.getByTestId('location').textContent).toBe(`/knowledge/${note.id}`);
});

it('keeps the article open when saving a new note fails', async () => {
  workspace.save.mockRejectedValueOnce(new Error('Workspace storage unavailable'));
  openLibrary(libraryPath(article.id));
  fireEvent.click(screen.getByRole('button', { name: '写学习笔记' }));

  expect(await screen.findByText('笔记未能保存，请在工作区恢复后重试。')).toBeTruthy();
  expect(screen.queryByText('Personal note opened')).toBeNull();
  expect(screen.getByTestId('location').textContent).toBe(libraryPath(article.id));
  expect((screen.getByRole('button', { name: '写学习笔记' }) as HTMLButtonElement).disabled).toBe(false);
});

it.each([
  { name: 'personal data is loading', loading: true, error: '', authLoading: false },
  { name: 'personal data cannot be loaded', loading: false, error: 'Personal workspace failed to load', authLoading: false },
  { name: 'authentication is being restored', loading: false, error: '', authLoading: true },
])('keeps the published reader available when $name', async ({ loading, error, authLoading }) => {
  workspace.loading = loading;
  workspace.error = error;
  workspace.authLoading = authLoading;
  openLibrary(libraryPath(article.id));

  expect(await screen.findByText('The published article is readable independently of personal notes.')).toBeTruthy();
  const noteButton = screen.getByRole('button', { name: '写学习笔记' }) as HTMLButtonElement;
  expect(noteButton.disabled).toBe(true);
  fireEvent.click(noteButton);
  expect(workspace.save).not.toHaveBeenCalled();
  expect(screen.queryByText('正在加载工作区…')).toBeNull();
  expect(screen.queryByText('重置本地示例数据')).toBeNull();
});

it('keeps external-only resources as attributed reading links without requesting a local article', () => {
  const linked = libraryResources.find(resource => resource.kind === 'link')!;
  openLibrary(libraryPath(linked.id));

  expect(screen.getByRole('link', { name: '打开原始资料' }).getAttribute('href')).toBe(linked.sourceUrl);
  expect(screen.getByRole('heading', { name: '前往原站阅读全文' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '学习任务' })).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});
