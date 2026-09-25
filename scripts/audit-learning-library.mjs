/** Read-only content inspection. No source prose is generated or changed.
 * node scripts/audit-learning-library.mjs [--online]
 * For restricted networks on Node 24: HTTPS_PROXY=... node --use-env-proxy ... --online
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';

const root = process.cwd();
const json = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const maybeJson = async (file, fallback) => { try { return await json(file); } catch { return fallback; } };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const imported = await json('src/content/library/imported-catalog.json');
const linked = await json('src/content/library/linked-catalog.json');
const original = await maybeJson('src/content/library/supplemental-catalog.json', []);
const records = [...imported, ...linked, ...original];
const provenance = await json('public/library/licenses/provenance.json');
const review = await json('src/content/library/content-review.json');
const onlineFile = 'output/library-content-online.json';
const online = process.argv.includes('--online');
const priorOnline = await maybeJson(onlineFile, { resources: [] });
const results = [];
const seen = new Set();

for (const resource of records) {
  if (seen.has(resource.id)) throw new Error(`Duplicate resource id: ${resource.id}`);
  seen.add(resource.id);
  const prov = provenance.resources.find(item => item.id === resource.id);
  const item = { id: resource.id, sourceId: resource.sourceId, sourceUrl: resource.sourceUrl, sourcePath: prov?.path || resource.sourcePath || null, contentPath: resource.contentPath || null, status: resource.kind === 'link' ? 'external' : resource.contentStatus || review[resource.id]?.status || 'unreviewed', evidence: review[resource.id]?.evidence || (resource.kind === 'link' ? '目录仅有原站入口，无全文转载授权；没有本地Markdown路径。' : resource.contentEvidence || '本站原创独立教程；内容验证见教程与训练报告。'), local: 'not-applicable', build: 'not-applicable', upstream: 'not-applicable', online: null };
  if (resource.kind === 'article') {
    try {
      const bytes = await fs.readFile(path.join(root, 'public', resource.contentPath));
      const text = bytes.toString('utf8');
      if (!text.trim() || /^\s*(<!doctype\s+html|<html[\s>])/i.test(text)) throw new Error('Empty file or HTML fallback');
      item.sha256 = sha(bytes); item.bytes = bytes.length;
      item.local = prov && item.sha256 !== prov.storedSha256 ? 'hash-mismatch' : 'ok';
      const ast = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(text);
      const headings = []; let codeBlocks = 0, mathBlocks = 0;
      visit(ast, node => { if (node.type === 'heading') headings.push(toString(node)); if (node.type === 'code') codeBlocks++; if (node.type === 'math') mathBlocks++; });
      item.structure = { headings: headings.length, codeBlocks, mathBlocks, sampleHeadings: headings.filter(h => !/目录|contents/i.test(h)).slice(1, 4) };
      if (prov) {
        try {
          const upstream = await fs.readFile(path.join(root, 'output/library-upstream', resource.sourceId, `${prov.upstreamGitBlob}.txt`));
          item.upstream = gitBlob(upstream) === prov.upstreamGitBlob ? 'verified-git-blob' : 'hash-mismatch';
        } catch { item.upstream = 'cache-unavailable'; }
      } else item.upstream = 'original';
      try { item.build = sha(await fs.readFile(path.join(root, 'dist', resource.contentPath))) === item.sha256 ? 'ok' : 'hash-mismatch'; } catch { item.build = 'missing'; }
    } catch (error) { item.local = 'missing-or-invalid'; item.status = 'file-error'; item.error = error.message; }
    if (item.local !== 'ok') item.status = 'file-error';
  }
  results.push(item);
}

if (online) {
  const queue = results.filter(item => imported.some(resource => resource.id === item.id));
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        const response = await fetch(`https://career-os-lhy-dlut.web.app${item.contentPath}`, { signal: AbortSignal.timeout(25000) });
        const bytes = Buffer.from(await response.arrayBuffer());
        const type = response.headers.get('content-type') || '';
        item.online = { checkedAt: new Date().toISOString(), status: response.status, contentType: type, matchesLocal: sha(bytes) === item.sha256, htmlFallback: type.includes('text/html') || /^\s*<!doctype html/i.test(bytes.toString('utf8')) };
      } catch (error) { item.online = { checkedAt: new Date().toISOString(), error: error.cause?.code || error.name }; }
    }
  }));
  await fs.mkdir(path.join(root, 'output'), { recursive: true });
  await fs.writeFile(path.join(root, onlineFile), JSON.stringify({ baseUrl: 'https://career-os-lhy-dlut.web.app', resources: results.filter(item => item.online).map(item => ({ id: item.id, ...item.online })) }, null, 2));
} else {
  for (const item of results) item.online = priorOnline.resources.find(previous => previous.id === item.id) || null;
}

const counts = Object.fromEntries([...new Set(results.map(item => item.status))].map(status => [status, results.filter(item => item.status === status).length]));
const topicCount = new Set(records.map(resource => `${resource.sourceId}:${resource.translationGroupId || resource.id}`)).size;
const report = { checkedAt: new Date().toISOString(), counts, topics: topicCount, versions: records.length, resources: results };
await fs.writeFile(path.join(root, 'src/content/library/content-health.json'), JSON.stringify(results.map(item => ({ id: item.id, contentStatus: item.status, contentEvidence: item.evidence, sourcePath: item.sourcePath || undefined })), null, 2) + '\n');
await fs.writeFile(path.join(root, 'output/library-content-audit.json'), JSON.stringify(report, null, 2) + '\n');
const safe = value => String(value || '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
const rows = results.map(item => {
  const deployed = item.online ? item.online.error ? `未核验：${item.online.error}` : `${item.online.status}${item.online.htmlFallback ? ' HTML回退' : ''} / ${item.online.matchesLocal ? 'SHA匹配' : 'SHA不匹配'}` : item.upstream === 'original' ? '本轮未部署' : '未核验';
  const structures = item.structure ? `；AST：${item.structure.headings}标题/${item.structure.codeBlocks}代码/${item.structure.mathBlocks}公式；${item.structure.sampleHeadings.join('、')}` : '';
  return `| ${item.id} | ${item.sourceId} | ${safe(item.contentPath)} | ${item.status} | ${safe(item.evidence + structures)} | ${item.local} / ${item.build} / ${deployed} | [固定来源](${item.sourceUrl})；${safe(item.sourcePath)}；${item.upstream} |`;
});
const latestOnline = results.flatMap(item => item.online?.checkedAt ? [item.online.checkedAt] : []).sort().at(-1) || '未核验';
const doc = `# 学习资料逐项诊断\n\n生成时间：${report.checkedAt}。线上静态正文读取时间：${latestOnline}。本轮没有部署生产。\n\n## 判定方法\n\n逐项读取目录、public正文、dist构建与可访问的线上响应；用SHA-256核对发布副本，用固定来源缓存的Git blob校验原始文件。AST结构仅提供检查线索，不按字数裁定完整性。内容形态复核结果保存在独立content-review.json，重新导入不会覆盖它。\n\n- complete：已有实质解释、推导/实例/代码或完整导学；指原文教学形态完整，不代表逐条技术事实已经复现实验。\n- outline：原作者文件明确是“本章简介/章节结构/学习目标/本章小节”的规划与概述，缺少承诺的推导和实验实现；保留原文并导航到同章已有正文或本站补充。\n- external：仅原站导航；未取得全文转载授权，非文件缺失。\n- original-complete：独立署名的本站补充教程；不改写上游正文。original-draft为未验收草稿。\n- file-error：本地缺失、HTML回退或SHA异常；不能伪装成教程。运行时下载错误另显示重试状态。\n\n## 当前数量\n\n共${records.length}个资源版本、${topicCount}个独立主题。${Object.entries(counts).map(([key, value]) => `${key}：${value}`).join('；')}。\n\n旧“151篇全文”实际包含上游提纲；正文短并不等于部署失败。来源课程分组现使用固定来源frontmatter的category/chapter/order及provenance路径，完整子文章可直接展开。\n\n## 核心学习链处理\n\nTensor/PyTorch、Attention、MHA/Mask、RoPE、Decoder、GQA/KV Cache已存在上游长教程，但尚无与本站14项训练对齐的独立小规模CPU验证链；本轮在保留上游全文的基础上增加独立补充单元与稳定训练链接，不续写覆盖原作者提纲。目录中未有可靠上游层级的条目置于“待归类”，不臆造来源结构。\n\n## 逐资源记录\n\n本地/构建/线上栏分开记录；新教程在构建前可显示missing，本轮未部署项不假称线上可用。\n\n| resourceId | 来源 | 正文路径 | 内容状态 | 内容证据与处理 | 本地 / 构建 / 线上 | 原路径 / 完整性证据 |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`;
await fs.writeFile(path.join(root, 'docs/CONTENT_GAPS.md'), doc);
console.log(JSON.stringify({ checkedAt: report.checkedAt, counts, topics: topicCount, versions: records.length, localErrors: results.filter(item => item.local === 'missing-or-invalid' || item.local === 'hash-mismatch').length, buildErrors: results.filter(item => ['missing', 'hash-mismatch'].includes(item.build)).length, onlineMatched: results.filter(item => item.online?.matchesLocal).length, onlineChecked: results.filter(item => item.online).length }));
if (results.some(item => item.status === 'unreviewed' || item.status === 'file-error')) process.exitCode = 1;
