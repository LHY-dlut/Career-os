import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Root } from 'mdast';

export function createHeadingSlugger() {
  const used = new Set<string>();
  return (text: string) => {
    const base = `heading-${text.normalize('NFKC').toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '') || 'section'}`;
    let slug = base, count = 2;
    while (used.has(slug)) slug = `${base}-${count++}`;
    used.add(slug);
    return slug;
  };
}
function headings(tree: Root) {
  const slug = createHeadingSlugger();
  const result: Array<{ id: string; text: string; level: number }> = [];
  visit(tree, 'heading', node => {
    const text = toString(node);
    const id = slug(text);
    node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
    result.push({ id, text, level: node.depth });
  });
  return result;
}
export function remarkHeadingIds() { return (tree: Root) => { headings(tree); }; }
export function extractHeadings(content: string) {
  return headings(unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(content));
}
