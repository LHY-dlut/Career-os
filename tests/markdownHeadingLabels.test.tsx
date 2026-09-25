// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MarkdownRenderer } from '../src/components/common/MarkdownRenderer';
import { I18nProvider } from '../src/i18n/I18nProvider';

afterEach(cleanup);

it('translates displayed headings without breaking original anchors or changing code', () => {
  const content = '# Original title\n\n[Jump](#heading-original-title)\n\n```text\n# Original title\n```';
  const view = (labels?: Record<string, string>) => <I18nProvider><MarkdownRenderer content={content} headingLabels={labels} /></I18nProvider>;
  const page = render(view({ 'heading-original-title': '中文标题' }));
  expect(screen.getByRole('heading', { name: '中文标题' }).id).toBe('heading-original-title');
  expect(screen.getByRole('link', { name: 'Jump' }).getAttribute('href')).toBe('#heading-original-title');
  expect(screen.getByText('# Original title', { selector: 'code' })).toBeTruthy();
  page.rerender(view());
  expect(screen.getByRole('heading', { name: 'Original title' }).id).toBe('heading-original-title');
});
