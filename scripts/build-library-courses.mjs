/** Derive source navigation from pinned metadata; never writes manual learning paths. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';

const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const readPinned = async (cachePath, url, expectedBlob) => {
  let bytes;
  try { bytes = await fs.readFile(cachePath); } catch {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Could not read pinned navigation: ${response.status} ${url}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (hash !== expectedBlob) throw new Error(`Unverified source navigation: ${url}`);
  await fs.mkdir(cachePath.slice(0, cachePath.lastIndexOf('/')), { recursive: true });
  await fs.writeFile(cachePath, bytes);
  return bytes;
};
const catalog = await readJson('src/content/library/imported-catalog.json');
const linked = await readJson('src/content/library/linked-catalog.json');
const sources = [...await readJson('src/content/library/imported-sources.json'), ...await readJson('src/content/library/linked-sources.json')];
const provenance = await readJson('public/library/licenses/provenance.json');
const categories = [ ['learning-path', 'AI Infra 学习路线'], ['prerequisites', 'AI Infra 前置基础'], ['cuda-optimization', 'CUDA 编程与算子优化'], ['distributed-training', '分布式训练'], ['inference-optimization', '推理优化'], ['performance-analysis', '性能分析'] ];
const leaf = (resource, order) => ({ id: `source-node-${resource.id}`, title: resource.title, resourceId: resource.id, order, children: [] });
const natural = (a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-CN', { numeric: true });
const metadata = [];
for (const resource of catalog.filter(resource => resource.sourceId === 'aiinfra-guide')) {
  const prov = provenance.resources.find(item => item.id === resource.id);
  const revision = sources.find(source => source.id === resource.sourceId).revision;
  const bytes = await readPinned(`output/library-upstream/${resource.sourceId}/${prov.upstreamGitBlob}.txt`, `https://raw.githubusercontent.com/caomaolufei/AIInfraGuide/${revision}/${prov.path.split('/').map(encodeURIComponent).join('/')}`, prov.upstreamGitBlob);
  const match = bytes.toString('utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const data = match ? parse(match[1]) : {};
  metadata.push({ resource, data, sourcePath: prov.path });
}
const aiSource = sources.find(source => source.id === 'aiinfra-guide');
const aiCourse = { id: 'source-aiinfra-guide', title: aiSource.name, description: '按原作者分类、章号、chapter 与 order 字段编排；章节提纲与详细子文章分别保留。', mode: 'source', sourceId: aiSource.id, order: 0, evidence: `https://github.com/caomaolufei/AIInfraGuide/blob/${aiSource.revision}/src/utils/chapterGrouping.ts`, children: [] };
for (const [key, title] of categories) {
  const items = metadata.filter(item => item.data.category === key);
  if (!items.length) continue;
  const chapters = items.filter(item => /^第\d+章/.test(item.data.title || ''));
  const regular = items.filter(item => !chapters.includes(item));
  const chapterNumbers = new Set(chapters.map(item => Number(item.data.title.match(/^第(\d+)章/)[1])));
  const ungrouped = regular.filter(item => !chapterNumbers.has(item.data.chapter));
  const children = ungrouped.map(item => leaf(item.resource, item.data.order || 0)).sort(natural);
  for (const chapter of chapters.sort((a, b) => Number(a.data.title.match(/^第(\d+)章/)[1]) - Number(b.data.title.match(/^第(\d+)章/)[1]))) {
    const number = Number(chapter.data.title.match(/^第(\d+)章/)[1]);
    children.push({ ...leaf(chapter.resource, number * 1000), children: regular.filter(item => item.data.chapter === number).map(item => leaf(item.resource, item.data.order || 0)).sort(natural) });
  }
  aiCourse.children.push({ id: `aiinfra-${key}`, title, order: aiCourse.children.length, children });
}

const arisSource = sources.find(source => source.id === 'aris-ai-offer');
const arisCourse = { id: 'source-aris-ai-offer', title: arisSource.name, description: '按固定版本主页的真实分组和卡片顺序阅读，每个主题保留中英文版本。', mode: 'source', sourceId: arisSource.id, order: 1, evidence: `https://github.com/wanshuiyin/ARIS-in-AI-Offer/blob/${arisSource.revision}/docs/index.html`, children: [] };
const expectedArisIndex = '8ac7c59af94bfdf062fc162ee9cb0b039c672d9f';
const arisBytes = await readPinned('output/library-upstream/aris-index.txt', `https://raw.githubusercontent.com/wanshuiyin/ARIS-in-AI-Offer/${arisSource.revision}/docs/index.html`, expectedArisIndex);
const arisIndex = arisBytes.toString('utf8');
const decode = value => value.replaceAll('&amp;', '&').replace(/<[^>]+>/g, '').trim();
for (const section of arisIndex.matchAll(/<section class="cat" data-cat="([^"]+)">([\s\S]*?)<\/section>/g)) {
  const title = section[2].match(/<span class="s-cn">([^<]+)<\/span>/)?.[1];
  const titleEn = section[2].match(/<span class="s-en">([^<]+)<\/span>/)?.[1];
  const children = [];
  for (const card of section[2].matchAll(/<article class="card" data-id="([^"]+)"/g)) {
    const resource = catalog.find(item => item.id === `aris-ai-offer-${card[1].replaceAll('_', '-')}`);
    if (resource) children.push(leaf(resource, children.length));
  }
  if (children.length) arisCourse.children.push({ id: `aris-${section[1]}`, title: decode(title || section[1]), titleEn: decode(titleEn || title || section[1]), order: arisCourse.children.length, children });
}

const courses = [aiCourse, arisCourse];
// The reviewed public Kamacoder index lists these real thematic sections. No body is copied.
const kamaSource = sources.find(source => source.id === 'kamacoder');
if (kamaSource) {
  const categoryOrder = ['学习路线', 'AI 编程', 'RAG', '模型训练', 'Agent 工程', 'Transformer', '真实面试'];
  courses.push({ id: 'source-kamacoder', title: kamaSource.name, mode: 'source', sourceId: kamaSource.id, order: 2, description: '按原站大模型面经汇总的专题组织，仅保留原站阅读入口。', evidence: 'https://notes.kamacoder.com/interview/llm/', children: categoryOrder.flatMap((category, order) => {
    const children = linked.filter(item => item.sourceId === kamaSource.id && item.category === category).map(leaf);
    return children.length ? [{ id: `kama-section-${order}`, title: category, order, children }] : [];
  }) });
}
for (const source of sources.filter(source => !courses.some(course => course.sourceId === source.id))) {
  const children = linked.filter(item => item.sourceId === source.id).map(leaf);
  courses.push({ id: `source-${source.id}`, title: source.name, mode: 'source', sourceId: source.id, order: courses.length, evidence: source.url, description: '仅收录经核查的原站入口。', children });
}
const collect = node => [...(node.resourceId ? [node.resourceId] : []), ...node.children.flatMap(collect)];
for (const source of sources) {
  const course = courses.find(item => item.sourceId === source.id);
  const present = new Set(collect(course));
  const missing = [...catalog, ...linked].filter(item => item.sourceId === source.id && item.language !== 'en' && !present.has(item.id));
  if (missing.length) course.children.push({ id: `${course.id}-unclassified`, title: '待归类', titleEn: 'Unclassified', order: 9999, children: missing.map(leaf) });
}
await fs.writeFile('src/content/library/source-courses.json', JSON.stringify(courses, null, 2) + '\n');
await fs.writeFile('src/content/library/source-structure.json', JSON.stringify(metadata.map(({ resource, data, sourcePath }) => ({ id: resource.id, sourcePath, category: data.category, order: data.order || 0, chapter: data.chapter })), null, 2) + '\n');
console.log(JSON.stringify({ courses: courses.length, aiinfraResources: collect(aiCourse).length, arisTopics: collect(arisCourse).length }));
