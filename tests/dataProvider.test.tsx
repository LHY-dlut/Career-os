// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DataProvider, useData } from '../src/app/DataProvider';
import { ToastProvider } from '../src/components/common/Toast';
import { emptyDataset, type Repositories } from '../src/repositories/contracts';
import { createStudyData } from '../src/repositories/local';
import { getRepositories } from '../src/repositories';
import { I18nProvider } from '../src/i18n/I18nProvider';
vi.mock('../src/repositories', () => ({ getRepositories: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function Probe() {
  const { data, loading, error } = useData();
  return <div>{loading ? 'loading' : error || data.articles.map(a => a.title).join(',') || 'empty'}</div>;
}
const tree = (uid: string) => <I18nProvider><ToastProvider><DataProvider key={uid} uid={uid}><Probe /></DataProvider></ToastProvider></I18nProvider>;
it('ignores an old account load that finishes after switching identities', async () => {
  let resolveOld!: (data: ReturnType<typeof emptyDataset>) => void;
  const oldLoad = new Promise<ReturnType<typeof emptyDataset>>(resolve => { resolveOld = resolve; });
  vi.mocked(getRepositories).mockImplementation(async uid => ({ load: () => uid === 'alice' ? oldLoad : Promise.resolve(emptyDataset()) }) as Repositories);
  const rendered = render(tree('alice'));
  await waitFor(() => expect(getRepositories).toHaveBeenCalledWith('alice'));
  rendered.rerender(tree('bob'));
  await screen.findByText('empty');
  await act(async () => { resolveOld(createStudyData('alice')); });
  expect(screen.getByText('empty')).toBeTruthy();
  expect(screen.queryByText(/Self-Attention/)).toBeNull();
});
it('surfaces cloud failures without loading guest demo records', async () => {
  vi.mocked(getRepositories).mockResolvedValue({ load: () => Promise.reject(new Error('Permission denied')) } as Repositories);
  render(tree('alice'));
  expect(await screen.findByText('Permission denied')).toBeTruthy();
  expect(screen.queryByText(/Self-Attention/)).toBeNull();
});
