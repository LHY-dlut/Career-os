// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { DataProvider, useData } from '../src/app/DataProvider';
import { createLocalRepositories } from '../src/repositories/local';
import { applyMutations, emptyDataset, type Dataset, type Repositories } from '../src/repositories/contracts';

const getRepositories = vi.fn();
const showToast = vi.hoisted(() => vi.fn());
vi.mock('../src/repositories', () => ({ getRepositories: (...args: unknown[]) => getRepositories(...args) }));
vi.mock('../src/components/common/Toast', () => ({ useToast: () => ({ showToast }) }));

function Status() {
  const { loading, migration, data, importGuest } = useData();
  return <div><span>{loading ? 'loading' : migration}</span><span data-testid="articles">{data.articles.length}</span><button onClick={() => void importGuest()}>Import</button></div>;
}

describe('account sign-in guest import', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    Object.defineProperty(globalThis.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    getRepositories.mockReset();
  });

  it('automatically imports edited guest records into an empty account and keeps the local copy', async () => {
    const guest = createLocalRepositories(localStorage);
    const starter = await guest.load();
    await guest.entities.articles.save({ ...starter.articles[0], title: 'My edited lesson' });
    let cloud: Dataset = emptyDataset();
    const repository: Repositories = { mode: 'cloud', identity: 'alice', entities: {} as Repositories['entities'], load: async () => cloud, commit: async changes => { cloud = applyMutations(cloud, changes); } };
    getRepositories.mockResolvedValue(repository);
    render(<DataProvider uid="alice"><Status /></DataProvider>);
    await waitFor(() => expect(screen.getByText('complete')).toBeTruthy());
    expect(cloud.articles.some(article => article.title === 'My edited lesson' && article.userId === 'alice')).toBe(true);
    expect((await guest.load()).articles.some(article => article.title === 'My edited lesson' && article.userId === 'guest')).toBe(true);
  });

  it('waits for a merge action when the account already has records', async () => {
    const guest = createLocalRepositories(localStorage);
    const starter = await guest.load();
    await guest.entities.articles.save({ ...starter.articles[0], title: 'Guest edit' });
    const existing = { ...starter.articles[0], id: 'cloud-only', title: 'Account edit', userId: 'alice' };
    let cloud: Dataset = { ...emptyDataset(), articles: [existing] };
    const commit = vi.fn(async changes => { cloud = applyMutations(cloud, changes); });
    getRepositories.mockResolvedValue({ mode: 'cloud', identity: 'alice', load: async () => cloud, commit });
    render(<DataProvider uid="alice"><Status /></DataProvider>);
    await waitFor(() => expect(screen.getByText('available')).toBeTruthy());
    expect(commit).not.toHaveBeenCalled();
    screen.getByRole('button', { name: 'Import' }).click();
    await waitFor(() => expect(screen.getByText('complete')).toBeTruthy());
    expect(cloud.articles.some(article => article.id === 'cloud-only' && article.title === 'Account edit')).toBe(true);
    expect(cloud.articles.some(article => article.title === 'Guest edit')).toBe(true);
  });
});
