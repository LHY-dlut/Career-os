/**
 * Rebuild the licensed learning library from two reviewed, immutable revisions.
 * No upstream code is imported/executed. Only allowlisted UTF-8 Markdown, JSON
 * metadata, README licensing evidence and the ARIS MIT license are fetched.
 * Usage: node scripts/import-learning-library.mjs
 * Metadata only (no downloads/content writes): node scripts/import-learning-library.mjs --metadata-only
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'public/library');
const CACHE = path.join(ROOT, 'output/library-upstream');
const CHECKED_AT = '2026-09-25';
const MAX_BYTES = 2 * 1024 * 1024;
const arisTitlesZh = JSON.parse(await readFile(path.join(ROOT, 'src/content/library/aris-titles-zh.json'), 'utf8'));
const SOURCES = [
  {
    id: 'aiinfra-guide', repo: 'caomaolufei/AIInfraGuide',
    revision: 'a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1',
    name: 'AIInfraGuide', author: '草帽路飞（caomaolufei）及 AIInfraGuide contributors',
    url: 'https://caomaolufei.github.io/AIInfraGuide/',
    select: (file) => /^docs\/guides\/.+\.md$/.test(file),
    description: 'AI Infra 学习路线、前置知识、CUDA、分布式训练与推理优化；含上游章节提纲。',
  },
  {
    id: 'aris-ai-offer', repo: 'wanshuiyin/ARIS-in-AI-Offer',
    revision: '22e73822f8636ee3b52de1da6f6d2e03d1f51d4e',
    name: 'ARIS-in-AI-Offer', author: 'Ruofeng Yang（杨若峰）及 ARIS contributors',
    url: 'https://wanshuiyin.github.io/ARIS-in-AI-Offer/',
    select: (file) => /^docs\/tutorials\/[^/]+_tutorial(?:_en)?\.md$/.test(file),
    description: '35 个 AI 面试主题的中文和英文教程，保留公式推导、代码与面试问答。',
  },
];
const categories = {
  'learning-path': '学习路线', prerequisites: '前置知识',
  'cuda-optimization': 'CUDA 与算子优化', 'distributed-training': '分布式训练',
  'inference-optimization': '推理优化', 'performance-analysis': '性能分析', course: '学习路线',
};
const routes = { 'learning-path': 'guides', prerequisites: 'prerequisites', 'cuda-optimization': 'cuda', 'distributed-training': 'distributed', 'inference-optimization': 'inference', 'performance-analysis': 'performance' };
const mitText = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.\n`;

function encoded(file) { return file.split('/').map(encodeURIComponent).join('/'); }
function blobUrl(source, file) { return `https://github.com/${source.repo}/blob/${source.revision}/${encoded(file)}`; }
function rawUrl(source, file) { return `https://raw.githubusercontent.com/${source.repo}/${source.revision}/${encoded(file)}`; }
function blobHash(buffer) { return createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex'); }
function idFor(source, file) {
  const slug = source.id === 'aris-ai-offer' ? path.posix.basename(file, '.md').replaceAll('_', '-') : createHash('sha256').update(file).digest('hex').slice(0, 16);
  return `${source.id}-${slug}`;
}
function withLanguageMetadata(catalog) {
  const ids = new Set(catalog.map((resource) => resource.id));
  return catalog.map((resource) => {
    if (!['aiinfra-guide', 'aris-ai-offer'].includes(resource.sourceId)) throw new Error(`Unexpected imported source: ${resource.sourceId}`);
    // Regenerate optional fields too, so removing a translation cannot leave a stale alternate.
    const { language: _language, translationGroupId: _group, alternateId: _alternate, titleZh: _titleZh, ...original } = resource;
    if (resource.sourceId === 'aiinfra-guide') return { ...original, language: 'zh' };
    const language = resource.id.endsWith('-en') ? 'en' : 'zh';
    const translationGroupId = resource.id.replace(/-en$/, '');
    const topic = translationGroupId.replace(/^aris-ai-offer-/, '').replace(/-tutorial$/, '');
    const titleZh = arisTitlesZh[topic];
    if (typeof titleZh !== 'string' || !titleZh.trim()) throw new Error(`Missing reviewed Chinese display title for ARIS topic: ${topic}`);
    const alternateId = language === 'en' ? translationGroupId : `${translationGroupId}-en`;
    return { ...original, language, translationGroupId, ...(ids.has(alternateId) ? { alternateId } : {}), titleZh };
  });
}
async function download(url, maxBytes = MAX_BYTES) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !['api.github.com', 'raw.githubusercontent.com'].includes(parsed.hostname)) throw new Error('Unexpected download host');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'Career-OS-licensed-library-import', Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${parsed.pathname}`);
      if (Number(response.headers.get('content-length') || 0) > maxBytes) throw new Error('Source exceeds byte limit');
      const chunks = []; let length = 0;
      for await (const chunk of response.body) { length += chunk.length; if (length > maxBytes) throw new Error('Source exceeds byte limit'); chunks.push(chunk); }
      return Buffer.concat(chunks);
    } catch (error) { if (attempt === 2) throw error; }
  }
}
async function sourceTree(source) {
  const buffer = await download(`https://api.github.com/repos/${source.repo}/git/trees/${source.revision}?recursive=1`);
  const tree = JSON.parse(buffer.toString('utf8'));
  if (tree.sha !== source.revision || tree.truncated) throw new Error(`Incomplete/wrong revision tree: ${source.id}`);
  return new Map(tree.tree.filter((item) => item.type === 'blob').map((item) => [item.path, item]));
}
async function sourceFile(source, tree, file) {
  const entry = tree.get(file);
  if (!entry || entry.size > MAX_BYTES || entry.mode === '120000') throw new Error(`Invalid source file ${file}`);
  const cachePath = path.join(CACHE, source.id, `${entry.sha}.txt`);
  let buffer;
  try { buffer = await readFile(cachePath); } catch { buffer = await download(rawUrl(source, file)); }
  if (blobHash(buffer) !== entry.sha) throw new Error(`Source blob integrity failed: ${file}`);
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, buffer);
  return buffer.toString('utf8').replaceAll('\r\n', '\n');
}
async function concurrent(items, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => { while (next < items.length) { const item = items[next++]; await fn(item); } }));
}
function splitFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  return match ? { meta: parseYaml(match[1]) || {}, body: markdown.slice(match[0].length) } : { meta: {}, body: markdown };
}
function arisCategory(file) {
  if (/agent/.test(file)) return 'Agent 智能体';
  if (/rlhf|reasoning|lora|kl_divergence|llm_opd/.test(file)) return '后训练与推理';
  if (/world_models/.test(file)) return '具身智能与世界模型';
  if (/vlm/.test(file)) return '多模态';
  if (/diffusion|generation|flow_matching|vae/.test(file)) return '生成模型';
  if (/attention|moe|kv_cache|long_context|quantization|distributed|inference|pretraining|transformer/.test(file)) return 'LLM 架构与系统';
  return '机器学习基础';
}
function normalizeUrl(url) { try { return decodeURI(url).replace(/\/$/, '').toLowerCase(); } catch { return url.replace(/\/$/, '').toLowerCase(); } }
function astroSlug(file) { return file.toLowerCase().replace(/\.md$/, '').replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_\-/]/gu, ''); }
function addAlias(aliases, url, id) { aliases.set(normalizeUrl(url), id); }
function headingKey(value) {
  try { value = decodeURIComponent(value); } catch { /* Preserve malformed upstream fragment for matching. */ }
  return value.replace(/^#(?:heading-)?/, '').normalize('NFKC').toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
}
function headingAliases(markdown) {
  const aliases = new Map();
  const used = new Set();
  const ast = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(markdown);
  visit(ast, 'heading', (node) => {
    // Same heading contract as src/utils/markdownHeadings.ts; retain upstream
    // handwritten table-of-contents links when hosting in Career OS.
    const key = headingKey(toString(node));
    const base = `heading-${key || 'section'}`;
    let id = base; let count = 2;
    while (used.has(id)) id = `${base}-${count++}`;
    used.add(id);
    if (!aliases.has(key)) aliases.set(key, id);
    else aliases.set(`${key}-${count - 2}`, id);
    aliases.set(id, id);
  });
  return aliases;
}
function hasTitle(markdown) {
  return unified().use(remarkParse).parse(markdown).children.some((node) => node.type === 'heading' && node.depth === 1);
}
// These four handwritten upstream TOC destinations no longer match the
// headings in the pinned revision. Match the verified chapter, preserving
// the original link label and all teaching text.
const correctedUpstreamAnchors = {
  'docs/guides/模块二-CUDA编程与算子优化/4.1-CUDA GEMM算子性能优化.md': {
    '#4-Thread-Block-tiling': 'heading-4-thread-block-级-tiling-优化',
    '#5-线程分块寄存器级数据复用': 'heading-5-thread-级-tiling-优化寄存器级数据复用',
  },
  'docs/guides/模块一-前置知识/gpu/gpu-basics.md': {
    '#4-tensor-core-ai-加速的核心引擎': 'heading-4-tensor-coreai-加速的核心引擎',
  },
  'docs/guides/模块一-前置知识/transformer/Transformer架构快速入门.md': {
    '#7-完整的-transformer-decoder-block': 'heading-7-详解-transformer-decoder-block',
  },
};
function rewriteHash(hash, record) {
  if (!hash) return '';
  const corrected = record?.source.id === 'aiinfra-guide' ? correctedUpstreamAnchors[record.file]?.[hash] : undefined;
  if (corrected) {
    if (![...record.headings.values()].includes(corrected)) throw new Error(`Corrected upstream heading is missing: ${record.file} ${hash}`);
    return `#${corrected}`;
  }
  const key = headingKey(hash);
  // GitHub-style fragments preserve double hyphens left by punctuation;
  // Career OS collapses the corresponding whitespace before adding its prefix.
  const heading = record?.headings?.get(key) || record?.headings?.get(key.replace(/-+/g, '-'));
  return heading ? `#${heading}` : hash;
}
function resolveReference(url, record, aliases, image = false) {
  if (!url || /^(?:mailto:|tel:|data:)/i.test(url)) return url;
  if (url.startsWith('#')) return rewriteHash(url, record);
  const hashAt = url.indexOf('#');
  const base = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  let absolute;
  if (/^https?:\/\//i.test(base)) absolute = base;
  else if (base.startsWith('//')) absolute = `https:${base}`;
  else if (base.startsWith('/')) {
    // AIInfraGuide image roots refer to the published site, not repo root.
    const root = new URL(record.source.url).origin;
    absolute = new URL(base, root).href;
  } else absolute = new URL(base, rawUrl(record.source, record.file)).href;
  const destination = aliases.get(normalizeUrl(absolute));
  if (!image && destination) return `/library/${destination}${rewriteHash(hash, records.find((item) => item.id === destination))}`;
  return `${absolute}${hash}`;
}
function transformReferences(body, record, aliases) {
  const ast = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(body);
  const edits = [];
  visit(ast, (node) => {
    if (['link', 'image', 'definition'].includes(node.type)) {
      const replacement = resolveReference(node.url, record, aliases, node.type === 'image');
      if (replacement === node.url) return;
      const start = node.position.start.offset;
      const raw = body.slice(start, node.position.end.offset);
      // Locate only the destination; never rewrite the link label or code.
      const destinationStart = node.type === 'definition' ? raw.indexOf(':') + 1 : raw.lastIndexOf('](') + 2;
      const offset = raw.indexOf(node.url, destinationStart);
      if (offset < 0) throw new Error(`Unrecognized link destination in ${record.file}`);
      edits.push({ start: start + offset, end: start + offset + node.url.length, value: replacement });
    }
    if (node.type === 'html') {
      // Preserve inline figures in a renderer that intentionally ignores raw HTML.
      const raw = node.value;
      const replacement = raw.replace(/<img\b[^>]*>/gi, (tag) => {
        const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
        if (!src) return tag;
        const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] || '原文插图';
        return `![${alt.replaceAll('[', '\\[').replaceAll(']', '\\]')}](${resolveReference(src, record, aliases, true)})`;
      });
      if (replacement !== raw) edits.push({ start: node.position.start.offset, end: node.position.end.offset, value: replacement });
    }
  });
  for (const edit of edits.sort((a, b) => b.start - a.start)) body = body.slice(0, edit.start) + edit.value + body.slice(edit.end);
  return body;
}

if (process.argv.includes('--metadata-only')) {
  const catalogPath = path.join(ROOT, 'src/content/library/imported-catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  await writeFile(catalogPath, `${JSON.stringify(withLanguageMetadata(catalog), null, 2)}\n`);
  console.log(`Updated language metadata for ${catalog.length} articles; original titles, IDs, Markdown and provenance unchanged.`);
  process.exit(0);
}

await mkdir(path.join(OUTPUT, 'licenses'), { recursive: true });
const records = [];
const importedSources = [];
for (const source of SOURCES) {
  const tree = await sourceTree(source);
  const readme = await sourceFile(source, tree, 'README.md');
  const licenseUrl = source.id === 'aiinfra-guide' ? `${blobUrl(source, 'README.md')}#license` : blobUrl(source, 'LICENSE');
  if (source.id === 'aiinfra-guide') {
    if (!/## License\s+MIT(?:\s|$)/.test(readme)) throw new Error('AIInfraGuide MIT declaration changed');
    await writeFile(path.join(OUTPUT, 'licenses/aiinfra-guide-README.md'), readme);
    await writeFile(path.join(OUTPUT, 'licenses/aiinfra-guide-MIT.txt'), `AIInfraGuide — MIT\n\nUpstream: ${licenseUrl}\nRevision: ${source.revision}\nAuthor attribution: ${source.author}\n\nThe pinned upstream README declares MIT but supplies no separate LICENSE file or copyright line.\nThe following is the standard MIT permission notice accompanying that declaration; it is not represented as an upstream LICENSE file. Original README evidence is retained alongside this file.\n\n${mitText}`);
  } else {
    const license = await sourceFile(source, tree, 'LICENSE');
    if (!license.startsWith('MIT License') || !license.includes('Copyright (c) 2026 Ruofeng Yang')) throw new Error('ARIS MIT license changed');
    await writeFile(path.join(OUTPUT, 'licenses/aris-ai-offer-MIT.txt'), license);
  }
  const manifest = source.id === 'aris-ai-offer' ? JSON.parse(await sourceFile(source, tree, 'tools/tutorials_render_manifest.json')) : {};
  const files = [...tree.keys()].filter(source.select).sort();
  await concurrent(files, async (file) => {
    const markdown = await sourceFile(source, tree, file);
    const { meta, body } = splitFrontmatter(markdown);
    const title = meta.title || manifest[file.replace(/\.md$/, '.html')]?.title || body.match(/^# ([^\n]+)/m)?.[1] || path.posix.basename(file, '.md');
    const category = source.id === 'aiinfra-guide' ? categories[meta.category] || 'AI Infra' : arisCategory(file);
    records.push({ source, file, title, category, body, meta, id: idFor(source, file), sha: tree.get(file).sha });
  });
  importedSources.push({ id: source.id, name: source.name, url: source.url, author: source.author, license: 'MIT', licenseUrl, revision: source.revision, checkedAt: CHECKED_AT, description: source.description });
  console.log(`${source.id}: ${files.length} Markdown documents, immutable revision ${source.revision}`);
}

const aliases = new Map();
for (const record of records) {
  const { source, file, id, meta } = record;
  record.headings = headingAliases((hasTitle(record.body) ? '' : `# ${record.title}\n\n`) + record.body);
  for (const revision of [source.revision, 'main']) {
    addAlias(aliases, `https://raw.githubusercontent.com/${source.repo}/${revision}/${encoded(file)}`, id);
    addAlias(aliases, `https://github.com/${source.repo}/blob/${revision}/${encoded(file)}`, id);
  }
  if (source.id === 'aris-ai-offer') {
    addAlias(aliases, new URL(file.slice(5).replace(/\.md$/, '.html'), source.url).href, id);
    addAlias(aliases, rawUrl(source, file.replace(/\.md$/, '.html')), id);
  } else if (routes[meta.category]) {
    addAlias(aliases, `${source.url}${routes[meta.category]}/${astroSlug(file.slice('docs/guides/'.length))}/`, id);
  }
}
records.sort((a, b) => {
  const sourceOrder = a.source.id.localeCompare(b.source.id);
  if (sourceOrder) return sourceOrder;
  if (a.source.id === 'aris-ai-offer') {
    const topicOrder = a.file.replace(/_en\.md$/, '.md').localeCompare(b.file.replace(/_en\.md$/, '.md'), 'zh-CN');
    if (topicOrder) return topicOrder;
    return Number(/_en\.md$/.test(a.file)) - Number(/_en\.md$/.test(b.file));
  }
  return a.file.localeCompare(b.file, 'zh-CN');
});
const catalog = [];
const provenance = [];
let totalBytes = 0;
let imageCount = 0;
for (const record of records) {
  const { source, file, id, title, category, body, meta } = record;
  const sourceUrl = blobUrl(source, file);
  const licensePath = `/library/licenses/${source.id}-MIT.txt`;
  const titleLine = hasTitle(body) ? '' : `# ${title}\n\n`;
  const attribution = `> 来源：[${source.name}](${sourceUrl}) · 作者：${source.author} · [MIT 许可](${licensePath})\n\n`;
  const transformed = transformReferences(body, record, aliases);
  const content = `${titleLine}${attribution}${transformed}`;
  await writeFile(path.join(OUTPUT, `${id}.md`), content);
  totalBytes += Buffer.byteLength(content);
  imageCount += (transformed.match(/!\[/g) || []).length;
  const languageTag = /_en\.md$/.test(file) ? 'English' : '中文';
  const tags = source.id === 'aiinfra-guide' && Array.isArray(meta.tags) ? meta.tags.filter((tag) => typeof tag === 'string').slice(0, 8) : [category, languageTag];
  catalog.push({ id, sourceId: source.id, title, category, tags, summary: `${category} · ${languageTag} · ${source.name}`, kind: 'article', sourceUrl, contentPath: `/library/${id}.md` });
  provenance.push({ id, sourceId: source.id, path: file, upstreamGitBlob: record.sha, storedSha256: createHash('sha256').update(content).digest('hex'), bytes: Buffer.byteLength(content) });
}
await writeFile(path.join(ROOT, 'src/content/library/imported-catalog.json'), `${JSON.stringify(withLanguageMetadata(catalog), null, 2)}\n`);
await writeFile(path.join(ROOT, 'src/content/library/imported-sources.json'), `${JSON.stringify(importedSources, null, 2)}\n`);
await writeFile(path.join(OUTPUT, 'licenses/provenance.json'), `${JSON.stringify({ checkedAt: CHECKED_AT, transformation: 'frontmatter-to-catalog; attribution; local article links and matching heading anchors; absolute image/reference links; HTML img to Markdown; no code execution', resources: provenance }, null, 2)}\n`);
console.log(`Imported ${catalog.length} documents, ${totalBytes} UTF-8 bytes; ${imageCount} image references remain external. No upstream executable or third-party image is copied.`);
