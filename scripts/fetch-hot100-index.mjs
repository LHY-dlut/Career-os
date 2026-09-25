/** Refresh public Hot100 list/signature facts only; never fetch statements or solutions. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, 'output/hot100');
const destination = path.join(root, 'public/training/hot100/official-index.json');
const planUrl = 'https://leetcode.cn/studyplan/top-100-liked/';
const endpoint = 'https://leetcode.cn/graphql/';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
mkdirSync(cache, { recursive: true });
mkdirSync(path.dirname(destination), { recursive: true });

function retrieve(url, output, queryFile) {
  const args = ['--location', '--max-time', '30', '--compressed', '--silent', '--show-error'];
  if (process.env.HOT100_HTTP_PROXY) args.push('--proxy', process.env.HOT100_HTTP_PROXY);
  if (queryFile) args.push('--header', 'Content-Type: application/json', '--header', `Referer: ${planUrl}`, '--data-binary', `@${queryFile}`);
  args.push('--output', output, '--write-out', '%{http_code}', url);
  const status = execFileSync(process.platform === 'win32' ? 'curl.exe' : 'curl', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  ensure(status === '200', `Official source returned HTTP ${status}`);
  return readFileSync(output);
}

const page = retrieve(planUrl, path.join(cache, 'official-page.html'));
const embedded = page.toString('utf8').match(/<script[^>]*__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/);
ensure(embedded, 'Official page has no readable embedded plan snapshot; stop rather than invent a list.');
const nextData = JSON.parse(embedded[1]);
const plan = nextData.props?.pageProps?.dehydratedState?.queries?.find(entry => entry.state?.data?.studyPlanV2Detail)?.state.data.studyPlanV2Detail;
ensure(plan?.slug === 'top-100-liked', 'Unexpected official study plan.');
const groups = plan.planSubGroups.map((group, groupIndex) => ({
  order: groupIndex + 1, name: group.name, slug: group.slug,
  questions: group.questions.map(question => ({
    number: Number(question.questionFrontendId), title: question.translatedTitle,
    titleEn: question.title, slug: question.titleSlug,
    difficulty: question.difficulty[0] + question.difficulty.slice(1).toLowerCase(),
  })),
}));
const questions = groups.flatMap(group => group.questions);
ensure(questions.length === 100 && new Set(questions.map(question => question.number)).size === 100, 'Official plan is not 100 unique questions; manual review required.');
ensure(questions.every(question => Number.isInteger(question.number) && question.title && /^[a-z0-9-]+$/.test(question.slug)), 'Invalid official question identity.');
const requests = [];
for (let offset = 0; offset < questions.length; offset += 10) {
  const batch = questions.slice(offset, offset + 10);
  const query = { query: `query CareerOsHot100Signatures { ${batch.map(question => `q${question.number}: question(titleSlug: ${JSON.stringify(question.slug)}) { questionFrontendId titleSlug metaData codeSnippets { langSlug code } }`).join(' ')} }` };
  const requestBytes = Buffer.from(JSON.stringify(query));
  const requestFile = path.join(cache, `query-${offset / 10 + 1}.json`);
  writeFileSync(requestFile, requestBytes);
  const response = retrieve(endpoint, path.join(cache, `response-${offset / 10 + 1}.json`), requestFile);
  const result = JSON.parse(response.toString('utf8'));
  ensure(!result.errors, `Official signature query ${offset / 10 + 1} failed.`);
  for (const question of batch) {
    const record = result.data?.[`q${question.number}`];
    ensure(record?.titleSlug === question.slug && Number(record.questionFrontendId) === question.number && record.metaData, `Signature identity mismatch: ${question.number}`);
    const metadata = JSON.parse(record.metaData);
    const allowed = ['name', 'params', 'return', 'classname', 'constructor', 'methods', 'systemdesign'];
    question.signature = Object.fromEntries(allowed.filter(key => Object.hasOwn(metadata, key)).map(key => [key, metadata[key]]));
    const python = record.codeSnippets?.find(snippet => snippet.langSlug === 'python3')?.code;
    ensure(typeof python === 'string', `No official Python3 scaffold: ${question.number}`);
    // metaData can describe serialized judge inputs (e.g. pos/intersectVal), so
    // the actual public Python declarations are the callable contract.
    question.pythonDeclarations = python.split(/\r?\n/).filter(line => /^\s*(?:class [A-Za-z_]\w*(?:\([^)]*\))?:|def [A-Za-z_]\w*\([^\n]*\)(?:\s*->\s*[^:]+)?:)\s*$/.test(line)).map(line => line.trimEnd());
    ensure(question.pythonDeclarations.some(line => /^\s*def /.test(line)), `Python declarations could not be extracted: ${question.number}`);
  }
  requests.push({ querySha256: sha256(requestBytes), responseSha256: sha256(response), questionNumbers: batch.map(question => question.number) });
  console.log(`Verified public signatures: ${Math.min(offset + 10, questions.length)}/100`);
  if (offset + 10 < questions.length) await new Promise(resolve => setTimeout(resolve, 400));
}
const retrievedAt = new Date().toISOString();
writeFileSync(destination, `${JSON.stringify({ source: { planUrl, metadataEndpoint: endpoint, verifiedAt: retrievedAt.slice(0, 10), retrievedAt, pageSha256: sha256(page), pageBuildId: nextData.buildId, questionCount: questions.length, groupCount: groups.length }, requests, groups }, null, 2)}\n`);
console.log('Saved official index and signature facts. Training explanations, reference code and tests are not downloaded.');
