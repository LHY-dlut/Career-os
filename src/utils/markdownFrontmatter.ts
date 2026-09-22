import type { KnowledgeArticle, KnowledgeCategory } from '../types';

export interface ParsedMarkdownResult {
  title: string;
  category: KnowledgeCategory;
  subcategory: string;
  tags: string[];
  summary: string;
  contentMarkdown: string;
}

const VALID_CATEGORIES: KnowledgeCategory[] = [
  '01 Transformer',
  '02 LLM',
  '03 RAG',
  '04 Agent',
  '05 Text-to-SQL',
  '06 Machine Learning',
  '07 Deep Learning',
  '08 NLP',
];

/**
 * Parses markdown text with optional YAML-style frontmatter:
 * ---
 * title: Example Title
 * category: 01 Transformer
 * tags: [Attention, CUDA]
 * summary: A brief summary
 * ---
 * # Content here...
 */
export function parseMarkdownWithFrontmatter(
  rawText: string,
  fileName?: string
): ParsedMarkdownResult {
  let title = '';
  let category: KnowledgeCategory = '01 Transformer';
  let subcategory = '';
  let tags: string[] = ['Imported'];
  let summary = '';
  let contentMarkdown = rawText.trim();

  // 1. Check for YAML frontmatter block
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = rawText.match(frontmatterRegex);

  if (match) {
    const yamlBlock = match[1];
    contentMarkdown = match[2].trim();

    const lines = yamlBlock.split('\n');
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const key = line.slice(0, colonIdx).trim().toLowerCase();
      let value = line.slice(colonIdx + 1).trim();

      // Strip quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key === 'title') {
        title = value;
      } else if (key === 'category') {
        const found = VALID_CATEGORIES.find(
          (c) => c.toLowerCase() === value.toLowerCase() || c.includes(value)
        );
        if (found) category = found;
      } else if (key === 'subcategory') {
        subcategory = value;
      } else if (key === 'summary') {
        summary = value;
      } else if (key === 'tags') {
        // Support [tag1, tag2] or comma separated
        const cleaned = value.replace(/^\[|\]$/g, '');
        tags = cleaned
          .split(',')
          .map((t) => t.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
    }
  }

  // 2. If title wasn't in frontmatter, look for first H1 header in markdown
  if (!title) {
    const h1Match = contentMarkdown.match(/^#\s+(.+)$/m);
    if (h1Match) {
      title = h1Match[1].trim();
    }
  }

  // 3. If still no title, fallback to filename
  if (!title && fileName) {
    title = fileName
      .replace(/\.(md|markdown|txt)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
  }

  if (!title) {
    title = 'Imported Markdown Note';
  }

  // 4. If no summary, extract first paragraph or snippet
  if (!summary) {
    const paragraphs = contentMarkdown
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p && !p.startsWith('#'));
    if (paragraphs.length > 0) {
      summary = paragraphs[0].replace(/[#*`_]/g, '').slice(0, 160) + '...';
    } else {
      summary = `Imported note on ${title}`;
    }
  }

  // 5. Infer category from content/title if default
  if (category === '01 Transformer') {
    const lowerContent = (title + ' ' + contentMarkdown).toLowerCase();
    if (lowerContent.includes('rag') || lowerContent.includes('retriev') || lowerContent.includes('vector db')) {
      category = '03 RAG';
    } else if (lowerContent.includes('agent') || lowerContent.includes('react') || lowerContent.includes('tool use')) {
      category = '04 Agent';
    } else if (lowerContent.includes('sql') || lowerContent.includes('text-to-sql') || lowerContent.includes('spider')) {
      category = '05 Text-to-SQL';
    } else if (lowerContent.includes('llm') || lowerContent.includes('pretraining') || lowerContent.includes('sft') || lowerContent.includes('dpo')) {
      category = '02 LLM';
    }
  }

  return {
    title,
    category,
    subcategory,
    tags: tags.length > 0 ? tags : ['Imported'],
    summary,
    contentMarkdown,
  };
}

/**
 * Serializes a KnowledgeArticle into clean Markdown with YAML frontmatter.
 */
export function serializeArticleToMarkdown(article: KnowledgeArticle): string {
  const frontmatterLines: string[] = [
    '---',
    `title: "${article.title.replace(/"/g, '\\"')}"`,
    `category: "${article.category}"`,
  ];

  if (article.subcategory) {
    frontmatterLines.push(`subcategory: "${article.subcategory.replace(/"/g, '\\"')}"`);
  }

  frontmatterLines.push(`tags: [${article.tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(', ')}]`);
  frontmatterLines.push(`summary: "${article.summary.replace(/"/g, '\\"')}"`);
  frontmatterLines.push(`updatedAt: "${article.updatedAt || new Date().toISOString()}"`);
  frontmatterLines.push('---');
  frontmatterLines.push('');

  // If content doesn't already start with an H1 matching title, optionally add or preserve as is
  let content = article.contentMarkdown.trim();
  if (!content.startsWith('# ')) {
    content = `# ${article.title}\n\n` + content;
  }

  return frontmatterLines.join('\n') + content + '\n';
}

/**
 * Triggers a browser download of a markdown file.
 */
export function downloadMarkdownFile(filename: string, content: string): void {
  const safeFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
