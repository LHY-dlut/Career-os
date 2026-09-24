import { parseDocument, stringify } from 'yaml';
import type { KnowledgeArticle, KnowledgeCategory } from '../types';
export interface ParsedMarkdownResult { title: string; category: KnowledgeCategory | string; subcategory: string; tags: string[]; summary: string; contentMarkdown: string }
export function parseMarkdownWithFrontmatter(rawText: string, fileName?: string): ParsedMarkdownResult {
  const normalized = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/.exec(normalized);
  let metadata: Record<string, unknown> = {};
  let contentMarkdown = normalized;
  if (match) {
    const document = parseDocument(match[1], { uniqueKeys: true });
    if (document.errors.length) throw new Error('Invalid Markdown frontmatter.');
    const parsed = document.toJS({ maxAliasCount: 0 });
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Frontmatter must be an object.');
    metadata = parsed;
    contentMarkdown = match[2].trim();
  }
  const field = (name: string) => typeof metadata[name] === 'string' ? metadata[name] as string : '';
  const title = field('title') || contentMarkdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || fileName?.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]+/g, ' ').trim() || 'Imported Markdown Note';
  const sample = `${title} ${contentMarkdown}`.toLowerCase();
  const inferred = /\brag\b|retriev|vector db/.test(sample) ? '03 RAG' : /\bagent\b|tool use/.test(sample) ? '04 Agent' : /\bsql\b|text-to-sql/.test(sample) ? '05 Text-to-SQL' : /\bllm\b|pretraining|\bsft\b|\bdpo\b/.test(sample) ? '02 LLM' : '01 Transformer';
  const tags = Array.isArray(metadata.tags) ? metadata.tags.filter((tag): tag is string => typeof tag === 'string') : field('tags').split(',').map(t => t.trim()).filter(Boolean);
  return { title, category: field('category') || inferred, subcategory: field('subcategory'), tags: tags.length ? tags : ['Imported'], summary: field('summary') || contentMarkdown.split(/\n\s*\n/).find(p => p && !p.startsWith('#'))?.replace(/[#*`_]/g, '').slice(0, 160) || `Imported note on ${title}`, contentMarkdown };
}
export function serializeArticleToMarkdown(article: KnowledgeArticle): string {
  return `---\n${stringify({ title: article.title, category: article.category, subcategory: article.subcategory || '', tags: article.tags, summary: article.summary, updatedAt: article.updatedAt })}---\n\n${article.contentMarkdown.trim()}\n`;
}
export function downloadMarkdownFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
