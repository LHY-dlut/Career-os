// @vitest-environment jsdom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DataProvider, useData } from '../src/app/DataProvider';
import { TrainingBoundary } from '../src/app/TrainingProvider';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { ToastProvider } from '../src/components/common/Toast';
import { TrainingWorkspace } from '../src/components/training/TrainingWorkspace';
import { createStudyData, storageKey } from '../src/repositories/local';
import type { TrainingTask } from '../src/content/training/types';

const state = vi.hoisted(() => ({ identity: 'guest', fail: false, commits: 0 }));
const fixtures: TrainingTask[] = [
  { id: 'lc-1', track: 'hot100', number: 1, order: 1, title: '两数之和', category: '哈希', difficulty: 'Easy', language: 'Python', contentStatus: 'complete', description: '给定数组与目标，找两个不同下标。', inputOutput: 'list[int], int → list[int]', examples: '[3, 8], 11 → [0, 1]', hints: ['记住已看到的数'], codeTemplate: '# one scaffold', referencePath: '/training/hot100/lc-1/reference.py', testPath: '/training/hot100/lc-1/test_solution.py', complexityAnalysis: 'O(n)', keyPitfalls: [], interviewQuestions: [], relatedResourceIds: [] },
  { id: 'lc-283', track: 'hot100', number: 283, order: 2, title: '移动零', category: '双指针', difficulty: 'Easy', language: 'Python', contentStatus: 'index', description: '原站阅读', inputOutput: '', examples: '', hints: [], codeTemplate: '# two scaffold', complexityAnalysis: '', keyPitfalls: [], interviewQuestions: [], relatedResourceIds: [] },
  { id: 'torch-softmax', track: 'pytorch', order: 2, title: '数值稳定 Softmax', category: '张量', difficulty: 'Medium', language: 'Python', contentStatus: 'complete', description: '沿最后一维归一化。', inputOutput: '[B,D] → [B,D]', examples: '', hints: ['先减去最大值'], codeTemplate: '# torch scaffold', complexityAnalysis: 'O(BD)', keyPitfalls: [], interviewQuestions: [], relatedResourceIds: [] },
];
vi.mock('../src/services/trainingCatalog', () => ({ loadTrainingCatalog: async () => fixtures }));
vi.mock('../src/app/AuthProvider', () => ({ useAuth: () => ({ user: state.identity === 'guest' ? null : { uid: state.identity }, loading: false }) }));
vi.mock('../src/repositories', () => ({ getRepositories: async (uid: string | null) => {
  const { createLocalRepositories } = await import('../src/repositories/local');
  const repo = createLocalRepositories(localStorage, uid || 'guest');
  return { ...repo, commit: async (changes: Parameters<typeof repo.commit>[0]) => { state.commits++; if (state.fail) throw new Error('Simulated account save failure'); await repo.commit(changes); } };
} }));

function Pages() {
  const { loading, reset, exportData } = useData();
  const [backup, setBackup] = useState('');
  const [exportError, setExportError] = useState('');
  if (loading) return <p>Loading</p>;
  return <><button onClick={() => void reset()}>Reset guest fixture</button><button onClick={() => { void exportData().then(setBackup, error => setExportError(error.message)); }}>Export fixture</button><output aria-label="backup">{backup}</output>{exportError && <p role="alert">{exportError}</p>}<Routes>
    <Route path="/dashboard" element={<TrainingWorkspace compact />} />
    <Route path="/coding/:problemId" element={<TrainingWorkspace />} />
    <Route path="/coding" element={<TrainingWorkspace />} />
    <Route path="/settings" element={<p>Settings fixture</p>} />
    <Route path="/library/:id" element={<Link to="/dashboard">Back to training</Link>} />
  </Routes></>;
}
function mount(identity = 'guest', path = '/dashboard?task=lc-1') {
  state.identity = identity;
  return render(<I18nProvider><ToastProvider><DataProvider key={identity} uid={identity === 'guest' ? null : identity}><TrainingBoundary identity={identity}><MemoryRouter initialEntries={[path]}><Pages /></MemoryRouter></TrainingBoundary></DataProvider></ToastProvider></I18nProvider>);
}
const editor = () => screen.getByRole('textbox', { name: 'Python 代码编辑器' }) as HTMLTextAreaElement;
const getEditor = async () => { await screen.findByRole('textbox', { name: 'Python 代码编辑器' }); await waitFor(() => expect(editor().disabled).toBe(false)); return editor(); };
beforeEach(() => {
  localStorage.clear(); state.fail = false; state.commits = 0;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'text/plain' }), text: async () => '# reference answer\nreturn 42' }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('shares drafts across home/full training, task changes and refresh without replacing code when revealing a solution', async () => {
  mount(); await getEditor();
  fireEvent.change(editor(), { target: { value: '# my first draft' } });
  expect(state.commits).toBe(0);
  fireEvent.change(screen.getByRole('combobox', { name: '选择训练题目' }), { target: { value: 'lc-283' } });
  await waitFor(() => expect(editor().value).toBe('# two scaffold'));
  fireEvent.change(editor(), { target: { value: '# separate second draft' } });
  fireEvent.change(screen.getByRole('combobox', { name: '选择训练题目' }), { target: { value: 'lc-1' } });
  await waitFor(() => expect(editor().value).toBe('# my first draft'));
  fireEvent.click(screen.getByRole('link', { name: '全屏训练' }));
  await screen.findByRole('link', { name: '回首页继续草稿' });
  expect(editor().value).toBe('# my first draft');
  fireEvent.click(screen.getByRole('button', { name: '查看题解' }));
  await screen.findByText(/# reference answer/);
  expect(editor().value).toBe('# my first draft');
  cleanup();
  mount('guest', '/coding/lc-283'); await getEditor();
  expect(editor().value).toBe('# separate second draft');
  fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKey('guest', 'data'))!).codingProblems.find((problem: { trainingTaskId?: string }) => problem.trainingTaskId === 'lc-283')?.drafts.Python.code).toBe('# separate second draft'));
  const data = JSON.parse(localStorage.getItem(storageKey('guest', 'data'))!);
  expect(data.codingAttempts).toHaveLength(0);
});

it('records a private problem and history atomically, counts unique completion, and preserves historical code', async () => {
  mount(); await getEditor();
  fireEvent.change(editor(), { target: { value: '# attempt code' } });
  fireEvent.click(screen.getByRole('button', { name: '记录练习' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByRole('combobox', { name: '完成情况' }), { target: { value: 'Completed' } });
  fireEvent.change(within(dialog).getByRole('textbox', { name: '复盘说明' }), { target: { value: '理解了补数查找' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '保存练习记录' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByText('已完成 1/2')).toBeTruthy();
  let data = JSON.parse(localStorage.getItem(storageKey('guest', 'data'))!);
  const problem = data.codingProblems.find((problem: { trainingTaskId?: string }) => problem.trainingTaskId === 'lc-1');
  expect(data.codingAttempts[0].problemId).toBe(problem.id);
  expect(data.codingAttempts[0].verification).toBe('not-run');
  fireEvent.change(editor(), { target: { value: '# later draft' } });
  fireEvent.click(screen.getByRole('button', { name: '练习历史（1）' }));
  fireEvent.click(screen.getByText('理解了补数查找').closest('details')!.querySelector('summary')!);
  expect(screen.getByText('# attempt code', { selector: 'code' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
  await waitFor(() => {
    data = JSON.parse(localStorage.getItem(storageKey('guest', 'data'))!);
    expect(data.codingProblems.find((problem: { trainingTaskId?: string }) => problem.trainingTaskId === 'lc-1').drafts.Python.code).toBe('# later draft');
  });
  expect(data.codingAttempts[0].userCode).toBe('# attempt code');
});

it('keeps guest and two account drafts separate, and never reports a failed account save as successful', async () => {
  mount(); await getEditor(); fireEvent.change(editor(), { target: { value: '# guest secret' } }); cleanup();
  mount('alice'); await getEditor(); expect(editor().value).toBe('# one scaffold');
  state.fail = true;
  fireEvent.change(editor(), { target: { value: '# alice private' } });
  fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
  await screen.findByText('保存失败 · 请重试');
  expect(JSON.parse(localStorage.getItem(storageKey('alice', 'data'))!).codingProblems).toHaveLength(0);
  cleanup(); state.fail = false;
  mount('bob'); await getEditor(); expect(editor().value).toBe('# one scaffold'); cleanup();
  mount('alice'); await getEditor(); expect(editor().value).toBe('# alice private');
  fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
  await screen.findByText('已保存到账号'); cleanup();
  mount(); await getEditor(); expect(editor().value).toBe('# guest secret');
});

it('restores the PyTorch track and clears stale pending drafts on explicit guest reset', async () => {
  mount(); await getEditor();
  fireEvent.click(screen.getByRole('tab', { name: 'Transformer / PyTorch' }));
  await waitFor(() => expect(editor().value).toBe('# torch scaffold'));
  fireEvent.change(editor(), { target: { value: '# torch draft' } });
  fireEvent.click(screen.getByRole('button', { name: /开始计时/ }));
  cleanup(); mount('guest', '/dashboard'); await getEditor();
  expect(editor().value).toBe('# torch draft');
  fireEvent.click(screen.getByRole('button', { name: 'Reset guest fixture' }));
  await waitFor(() => expect(editor().value).toBe('# one scaffold'));
  expect(JSON.parse(localStorage.getItem(storageKey('guest', 'data'))!).codingProblems.every((problem: { trainingTaskId?: string }) => !problem.trainingTaskId)).toBe(true);
});

it('keeps existing private problem URLs and saved training snapshot URLs readable', async () => {
  mount('guest', '/coding/seed-p-1'); await getEditor();
  fireEvent.change(editor(), { target: { value: '# legacy problem code' } });
  fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKey('guest', 'data'))!).codingProblems.find((problem: { id: string }) => problem.id === 'seed-p-1').drafts.Python.code).toBe('# legacy problem code'));
  cleanup(); mount(); await getEditor();
  fireEvent.change(editor(), { target: { value: '# indexed task code' } });
  fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
  let snapshotId = '';
  await waitFor(() => { snapshotId = JSON.parse(localStorage.getItem(storageKey('guest', 'data'))!).codingProblems.find((problem: { trainingTaskId?: string }) => problem.trainingTaskId === 'lc-1')?.id; expect(snapshotId).toBeTruthy(); });
  cleanup(); mount('guest', `/coding/${snapshotId}`); await getEditor();
  expect(editor().value).toBe('# indexed task code');
});

it.each([
  ['Java', 'Solution.java', 'class Solution { /* saved Java draft */ }', 'class Solution { int answer = 7; }'],
  ['C++', 'solution.cpp', 'class Solution { /* saved C++ draft */ };', 'class Solution { int answer = 7; };'],
])('preserves an existing %s private draft, download and attempt language', async (language, filename, savedCode, changedCode) => {
  const initial = createStudyData('guest');
  const problem = initial.codingProblems[0];
  const pythonDraft = { code: '# separate Python draft', updatedAt: '2026-09-01T00:00:00Z', elapsedSeconds: 12 };
  problem.language = language;
  problem.codeTemplate = '// a different initial scaffold';
  problem.drafts = { Python: pythonDraft, [language]: { code: savedCode, updatedAt: '2026-09-02T00:00:00Z', elapsedSeconds: 45 } };
  localStorage.setItem(storageKey('guest', 'data'), JSON.stringify(initial));
  mount('guest', `/coding/${problem.id}`);
  const codeEditor = await screen.findByRole('textbox', { name: `${language} 代码编辑器` }) as HTMLTextAreaElement;
  await waitFor(() => { expect(codeEditor.disabled).toBe(false); expect(codeEditor.value).toBe(savedCode); });
  expect(screen.getByText(`${filename} · ${language}`)).toBeTruthy();

  const downloads: string[] = [];
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return 'blob:training-download'; }
    static revokeObjectURL() { /* No browser allocation in this test. */ }
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloads.push(this.download); });
  fireEvent.click(screen.getByRole('button', { name: '下载代码' }));
  expect(downloads).toEqual([filename]);

  fireEvent.change(codeEditor, { target: { value: changedCode } });
  fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem(storageKey('guest', 'data'))!).codingProblems.find((item: { id: string }) => item.id === problem.id);
    expect(saved.language).toBe(language);
    expect(saved.drafts[language].code).toBe(changedCode);
    expect(saved.drafts.Python).toEqual(pythonDraft);
  });
  fireEvent.click(screen.getByRole('button', { name: '记录练习' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '保存练习记录' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  const final = JSON.parse(localStorage.getItem(storageKey('guest', 'data'))!);
  expect(final.codingProblems).toHaveLength(initial.codingProblems.length);
  expect(final.codingAttempts).toHaveLength(1);
  expect(final.codingAttempts[0]).toMatchObject({ problemId: problem.id, userCode: changedCode, language });
  expect(final.codingProblems.find((item: { id: string }) => item.id === problem.id).drafts.Python).toEqual(pythonDraft);
});

it('does not block public reading when accessing browser storage itself throws', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
  Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('Blocked', 'SecurityError'); } });
  try {
    state.identity = 'guest';
    render(<I18nProvider><ToastProvider><DataProvider uid={null}><TrainingBoundary identity="guest"><p>公开资料仍可阅读</p></TrainingBoundary></DataProvider></ToastProvider></I18nProvider>);
    expect(await screen.findByText('公开资料仍可阅读')).toBeTruthy();
  } finally { cleanup(); Object.defineProperty(window, 'localStorage', descriptor); }
});

it('includes unsaved and recovered drafts in export, and stops export if their account save fails', async () => {
  mount(); await getEditor();
  fireEvent.change(editor(), { target: { value: '# export before debounce' } });
  fireEvent.click(screen.getByRole('button', { name: 'Export fixture' }));
  await waitFor(() => expect(JSON.parse(screen.getByLabelText('backup').textContent!).codingProblems.find((problem: { trainingTaskId?: string }) => problem.trainingTaskId === 'lc-1').drafts.Python.code).toBe('# export before debounce'));
  fireEvent.change(editor(), { target: { value: '# recovery before reload' } });
  cleanup(); mount('guest', '/settings');
  await screen.findByText('Settings fixture');
  state.fail = true;
  fireEvent.click(screen.getByRole('button', { name: 'Export fixture' }));
  await waitFor(() => expect(screen.getAllByText('Simulated account save failure').length).toBeGreaterThan(0));
  expect(screen.getByLabelText('backup').textContent).toBe('');
  state.fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Export fixture' }));
  await waitFor(() => expect(JSON.parse(screen.getByLabelText('backup').textContent!).codingProblems.find((problem: { trainingTaskId?: string }) => problem.trainingTaskId === 'lc-1').drafts.Python.code).toBe('# recovery before reload'));
});

it('rejects a first-save operation prepared before reset instead of reinserting the old draft', async () => {
  mount(); await getEditor();
  let finishDigest!: (value: ArrayBuffer) => void;
  const digest = vi.spyOn(crypto.subtle, 'digest').mockImplementationOnce(() => new Promise(resolve => { finishDigest = resolve; }));
  fireEvent.change(editor(), { target: { value: '# must stay reset' } });
  fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
  await waitFor(() => expect(digest).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Reset guest fixture' }));
  await waitFor(() => expect(editor().value).toBe('# one scaffold'));
  await act(async () => { finishDigest(new Uint8Array(32).buffer); });
  expect(state.commits).toBe(0);
  expect(JSON.parse(localStorage.getItem(storageKey('guest', 'data'))!).codingProblems.every((problem: { trainingTaskId?: string }) => !problem.trainingTaskId)).toBe(true);
});
