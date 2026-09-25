import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Download, Save, Eye, History, Lightbulb, Pause, Play, X } from 'lucide-react';
import { useAuth } from '../../app/AuthProvider';
import { useData } from '../../app/DataProvider';
import { useTrainingDraft } from '../../app/TrainingProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { Dialog } from '../common/Dialog';
import { useToast } from '../common/Toast';
import { loadTrainingText, taskAttempts, type WorkspaceTask } from '../../services/trainingWorkspace';
import { generateId } from '../../utils/id';
import { libraryResources } from '../../services/learningLibrary';
import { getLibraryResourceTitle } from '../../services/libraryLanguage';
import type { CodingAttempt } from '../../types';

const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:border-indigo-400 disabled:opacity-50 dark:border-slate-700';
const input = 'w-full rounded-lg border border-slate-200 bg-transparent p-2 dark:border-slate-700';
function sourceFilename(language: string) {
  const normalized = language.trim().toLowerCase();
  if (/^python\s*\d*$/.test(normalized)) return 'solution.py';
  if (/^(c\+\+|cpp)\s*\d*$/.test(normalized)) return 'solution.cpp';
  if (/^java\s*\d*$/.test(normalized)) return 'Solution.java';
  const extensions = new Map([['c', 'c'], ['c#', 'cs'], ['csharp', 'cs'], ['javascript', 'js'], ['typescript', 'ts'], ['go', 'go'], ['rust', 'rs'], ['kotlin', 'kt'], ['swift', 'swift'], ['ruby', 'rb'], ['php', 'php']]);
  return `solution.${extensions.get(normalized) || 'txt'}`;
}
function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: filename.endsWith('.py') ? 'text/x-python;charset=utf-8' : 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function TrainingEditor({ task, compact }: { task: WorkspaceTask; compact: boolean }) {
  const { t, language, locale, label } = useI18n();
  const filename = sourceFilename(task.language);
  const { user } = useAuth();
  const { data } = useData();
  const { showToast } = useToast();
  const training = useTrainingDraft(task);
  const { draft, entry } = training;
  const [leftTab, setLeftTab] = useState<'task' | 'history'>('task');
  const [hints, setHints] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [solutionError, setSolutionError] = useState('');
  const [recording, setRecording] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [status, setStatus] = useState<CodingAttempt['status']>('Partial');
  const [rating, setRating] = useState(3);
  const [minutes, setMinutes] = useState(0);
  const [notes, setNotes] = useState('');
  const [errorReason, setErrorReason] = useState('');
  const [verification, setVerification] = useState<NonNullable<CodingAttempt['verification']>>('not-run');
  const recordId = useRef('');
  const [running, setRunning] = useState(false);
  const [, tick] = useState(0);
  const timer = useRef({ base: draft.elapsedSeconds, start: 0 });
  const editor = useRef<HTMLTextAreaElement>(null);
  const latest = useRef({ draft, update: training.update }); latest.current = { draft, update: training.update };
  const elapsed = () => timer.current.start ? timer.current.base + Math.floor((Date.now() - timer.current.start) / 1000) : latest.current.draft.elapsedSeconds;
  const flushClock = () => {
    const value = elapsed();
    latest.current.update(task, latest.current.draft.code, value);
    timer.current = { base: value, start: running ? Date.now() : 0 };
  };
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => tick(value => value + 1), 1000);
    const checkpoint = setInterval(flushClock, 15000);
    return () => { clearInterval(interval); clearInterval(checkpoint); };
  }, [running]);
  useEffect(() => () => {
    if (timer.current.start) latest.current.update(task, latest.current.draft.code, timer.current.base + Math.floor((Date.now() - timer.current.start) / 1000));
  }, [task.id]);
  const attempts = taskAttempts(task, user?.uid || 'guest', data.codingProblems, data.codingAttempts);
  const toggleTimer = () => {
    if (running) { const value = elapsed(); timer.current = { base: value, start: 0 }; training.update(task, draft.code, value); }
    else timer.current = { base: draft.elapsedSeconds, start: Date.now() };
    setRunning(value => !value);
  };
  const saveDraft = async () => {
    if (!entry) return;
    if (running) flushClock();
    // A template becomes a private snapshot only on an explicit save or edit.
    if (entry.status === 'clean') training.update(task, draft.code, elapsed());
    try { await training.save(task); showToast(t('Draft saved.', '草稿已保存。'), 'success'); } catch { /* The provider exposes the failure and keeps recovery. */ }
  };
  const openSolution = async () => {
    if (solutionOpen) { setSolutionOpen(false); return; }
    setSolutionOpen(true);
    if (solution !== null) return;
    if (task.referenceSolution) { setSolution(task.referenceSolution); return; }
    if (!task.referencePath) return;
    setSolutionLoading(true); setSolutionError('');
    try { setSolution(await loadTrainingText(task.referencePath)); }
    catch { setSolutionError(t('Reference could not be loaded. Close and retry.', '参考实现加载失败，请关闭后重试。')); }
    finally { setSolutionLoading(false); }
  };
  const saveAttempt = async () => {
    if (savingAttempt) return;
    setSavingAttempt(true);
    const seconds = elapsed();
    training.update(task, draft.code, seconds);
    try {
      await training.save(task, { id: recordId.current, attemptedAt: new Date().toISOString(), userCode: draft.code, durationMinutes: minutes, status, selfRating: rating, notes, errorReason, verification });
      setRecording(false); setNotes(''); setErrorReason('');
      showToast(t('Practice saved with your code. Completion is self-reported.', '练习与本次代码已保存，完成情况由你本人记录。'), 'success');
    } catch { /* Keep the form and code on failure. */ }
    finally { setSavingAttempt(false); }
  };
  const statusText = entry?.status === 'saved' ? t(user ? 'Saved to your account' : 'Saved in this browser', user ? '已保存到账号' : '已保存在本机') : entry?.status === 'saving' ? t('Saving…', '正在保存…') : entry?.status === 'dirty' ? t(user ? 'Recovery on this device · account save pending' : 'Recovery on this device · saving draft', user ? '本机可恢复 · 等待账号保存' : '本机可恢复 · 正在保存草稿') : entry?.status === 'error' ? t('Save failed · retry below', '保存失败 · 请重试') : t('Scaffold · no practice recorded', '初始骨架 · 尚无练习记录');
  return <>
    <div className="grid min-w-0 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
      <div className={`min-w-0 border-b border-slate-200 p-4 sm:p-6 lg:border-b-0 lg:border-r dark:border-slate-800 ${compact ? 'lg:max-h-[620px]' : 'lg:max-h-[800px]'} overflow-y-auto`}>
        <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{label(task.difficulty)}</span><span className="text-slate-500">{task.category}</span><span className="text-slate-500">{task.contentStatus === 'complete' ? t('Full learning package', '完整训练包') : t('Index & scaffold', '索引与骨架')}</span></div>
        <h3 className="mt-3 text-xl font-bold leading-snug">{task.number ? `${task.number}. ` : ''}{language === 'en' ? task.titleEn || task.title : task.title}</h3>
        <div className="my-4 flex gap-3 border-b border-slate-100 pb-3 text-sm dark:border-slate-800"><button aria-pressed={leftTab === 'task'} onClick={() => setLeftTab('task')} className={leftTab === 'task' ? 'font-semibold text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}>{t('Task', '题目要求')}</button><button aria-pressed={leftTab === 'history'} onClick={() => setLeftTab('history')} className={`inline-flex items-center gap-1 ${leftTab === 'history' ? 'font-semibold text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}><History className="h-4 w-4" />{t(`History (${attempts.length})`, `练习历史（${attempts.length}）`)}</button></div>
        {leftTab === 'task' ? <div className="space-y-5 text-sm leading-7">
          <MarkdownRenderer content={task.description} />
          {task.contentStatus === 'index' && task.track !== 'personal' && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{t('This entry provides the verified index and an editable scaffold. The original learning package and tests are not included yet; read the official problem before implementing.', '此题已核验目录并提供可编辑骨架；本站原创讲解和测试包尚未补齐，请先打开官方题目阅读要求。')}</p>}
          {task.inputOutput && <div><h4 className="font-semibold">{t('Inputs, outputs & shapes', '输入输出与 shape')}</h4><MarkdownRenderer content={task.inputOutput} /></div>}
          {task.examples && <div><h4 className="font-semibold">{t('Independent examples', '本站示例')}</h4><MarkdownRenderer content={task.examples} /></div>}
          {task.complexityAnalysis && <p><strong>{t('Complexity: ', '复杂度：')}</strong>{task.complexityAnalysis}</p>}
          {task.hints.length > 0 && <><button onClick={() => setHints(value => !value)} className={button}><Lightbulb className="h-4 w-4" />{hints ? t('Hide hints', '隐藏提示') : t('Show hints', '查看提示')}</button>{hints && <ol className="list-decimal space-y-2 pl-5">{task.hints.map((hint, i) => <li key={i}>{hint}</li>)}</ol>}</>}
          {task.keyPitfalls.length > 0 && <details><summary className="cursor-pointer font-medium">{t('Common mistakes', '易错点')}</summary><ul className="mt-2 list-disc space-y-1 pl-5">{task.keyPitfalls.map((pitfall, i) => <li key={i}>{pitfall}</li>)}</ul></details>}
          {task.interviewQuestions.length > 0 && <details><summary className="cursor-pointer font-medium">{t('Interview self-check', '面试自测')}</summary><ul className="mt-2 list-disc space-y-1 pl-5">{task.interviewQuestions.map((question, i) => <li key={i}>{question}</li>)}</ul></details>}
          {task.relatedResourceIds.length > 0 && <div><h4 className="font-semibold">{t('Related reading', '关联教程')}</h4><ul className="space-y-1">{task.relatedResourceIds.map(id => { const resource = libraryResources.find(item => item.id === id); return resource ? <li key={id}><Link to={`/library/${encodeURIComponent(id)}`} className="text-indigo-600 underline dark:text-indigo-300">{getLibraryResourceTitle(resource, language)}</Link></li> : null; })}</ul></div>}
        </div> : <div className="space-y-3">{!attempts.length && <p className="text-sm text-slate-500">{t('No recorded attempts. Draft saves do not create practice records.', '还没有练习记录。保存草稿不会生成练习记录。')}</p>}{attempts.map(attempt => <details key={attempt.id} className="rounded-xl border border-slate-200 p-3 text-xs leading-6 dark:border-slate-700"><summary className="cursor-pointer"><span className="font-semibold">{label(attempt.status)}</span> · {new Date(attempt.attemptedAt).toLocaleString(locale)}<span className="block text-slate-500">{attempt.durationMinutes} {t('min', '分钟')} · {attempt.selfRating}/5 · {attempt.verification === 'leetcode-accepted-reported' ? t('Official acceptance (self-reported)', '原站通过（本人记录）') : attempt.verification === 'local-samples-reported' ? t('Local samples (self-reported)', '本地样例（本人记录）') : t('No execution recorded', '未记录执行结果')}</span></summary>{attempt.errorReason && <p className="mt-2">{t('Mistake: ', '错误原因：')}{attempt.errorReason}</p>}{attempt.notes && <p className="mt-2 whitespace-pre-wrap">{attempt.notes}</p>}<pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-slate-200"><code>{attempt.userCode}</code></pre></details>)}</div>}
      </div>
      <div className="min-w-0 bg-[#0c1422] text-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 text-xs"><span className="font-mono">{filename} · {task.language}</span><button onClick={toggleTimer} className="inline-flex items-center gap-2 rounded px-2 py-1 text-slate-300 hover:bg-slate-800">{running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{running ? t('Pause timer', '暂停计时') : t('Start timer', '开始计时')}<Clock className="h-3.5 w-3.5" />{Math.floor(elapsed() / 60)}:{String(elapsed() % 60).padStart(2, '0')}</button></div>
        <textarea ref={editor} aria-label={t(task.language + ' code editor', task.language + ' 代码编辑器')} value={draft.code} disabled={!entry} maxLength={200000} onChange={event => training.update(task, event.target.value, elapsed())} onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); const start = event.currentTarget.selectionStart; const end = event.currentTarget.selectionEnd; training.update(task, `${draft.code.slice(0, start)}    ${draft.code.slice(end)}`, elapsed()); requestAnimationFrame(() => editor.current?.setSelectionRange(start + 4, start + 4)); } }} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" className={`block w-full resize-y overflow-auto bg-transparent p-4 font-mono text-[13px] leading-6 text-slate-100 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${compact ? 'min-h-[330px] lg:h-[430px]' : 'min-h-[430px] lg:h-[610px]'}`} />
        <div aria-live="polite" className="border-t border-slate-700 px-4 py-3 text-xs leading-6 text-slate-400"><p>{statusText}</p>{entry?.error && <p role="alert" className="text-rose-300">{t('Saving needs attention: ', '保存需要处理：')}{entry.error}</p>}<p>{t(user ? 'Drafts belong to this account. A pending local recovery copy is not a completed cloud save.' : 'Guest drafts and practice records stay in this browser. Export a backup to keep a copy.', user ? '草稿属于当前账号；本机恢复缓存不表示账号保存已成功。' : '访客草稿与练习记录保存在当前浏览器，可导出备份留存。')}</p></div>
      </div>
    </div>
    <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
      <button onClick={() => void saveDraft()} disabled={!entry || entry.status === 'saving'} className={`${button} bg-indigo-600 text-white hover:bg-indigo-700`}><Save className="h-4 w-4" />{t('Save draft', '保存草稿')}</button>
      <button onClick={() => { recordId.current = generateId(); setMinutes(Number((elapsed() / 60).toFixed(1))); setRecording(true); }} disabled={!entry} className={button}>{t('Record practice', '记录练习')}</button>
      {(task.referencePath || task.referenceSolution) && <button onClick={() => void openSolution()} className={button}><Eye className="h-4 w-4" />{solutionOpen ? t('Hide solution', '隐藏题解') : t('Show solution', '查看题解')}</button>}
      <button onClick={() => download(draft.code, filename)} className={button}><Download className="h-4 w-4" />{t('Download code', '下载代码')}</button>
      {task.testPath && <a href={task.testPath} download="test_solution.py" className={button}>{t('Download tests', '下载测试文件')}</a>}
      {task.sourceUrl && <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer" className={button}>{task.track === 'hot100' ? t('Practice on LeetCode', '原站做题') : t('Official reference', '官方参考')}</a>}
      {task.testPath && <details className="w-full pt-2 text-xs leading-6 text-slate-500"><summary className="cursor-pointer font-medium">{t('How to run locally', '本地运行说明')}</summary><p className="mt-2">{t('Save solution.py and test_solution.py in the same folder, then run:', '将 solution.py 和 test_solution.py 放在同一目录，然后运行：')}</p>{task.track === 'pytorch' && <pre className="my-2 overflow-x-auto rounded bg-slate-100 p-2 dark:bg-slate-900">python -m pip install torch --index-url https://download.pytorch.org/whl/cpu</pre>}<pre className="my-2 overflow-x-auto rounded bg-slate-100 p-2 dark:bg-slate-900">python -m unittest -v test_solution</pre><p>{t('These are public learning examples, not a full judge. Local sample success does not mean LeetCode Accepted.', '这些是公开教学用例，不是完整判题系统。本地样例通过不等于 LeetCode Accepted。')}</p></details>}
    </footer>
    {solutionOpen && <div className="border-t border-slate-200 p-4 sm:p-6 dark:border-slate-800"><h4 className="font-semibold">{t('Reference implementation · your draft stays above', '参考实现 · 你的草稿保留在上方')}</h4>{solutionLoading ? <p role="status">{t('Loading…', '正在加载…')}</p> : solutionError ? <p role="alert" className="text-rose-600">{solutionError}</p> : <pre className="mt-3 max-h-[500px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-200"><code>{solution}</code></pre>}</div>}
    {recording && <Dialog onClose={() => { if (!savingAttempt) setRecording(false); }} aria-label={t('Record coding practice', '记录编程练习')} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold">{t('Record practice', '记录练习')}</h3><button disabled={savingAttempt} aria-label={t('Close', '关闭')} onClick={() => setRecording(false)}><X className="h-5 w-5" /></button></div><form onSubmit={event => { event.preventDefault(); void saveAttempt(); }} className="space-y-3 text-sm">
      <p className="text-xs leading-6 text-slate-500">{t('This saves your own assessment and current code, not an automatically judged result.', '保存你本人的自评和当前代码，不生成自动判题结果。')}</p>
      <label className="block">{t('Completion', '完成情况')}<select className={input} value={status} onChange={event => setStatus(event.target.value as CodingAttempt['status'])}>{['Partial', 'Struggled', 'Completed', 'Abandoned'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3"><label>{t('Minutes', '用时（分钟）')}<input className={input} type="number" min="0" step="0.1" required value={minutes} onChange={event => setMinutes(Number(event.target.value))} /></label><label>{t('Self-rating', '自我评分')}<select className={input} value={rating} onChange={event => setRating(Number(event.target.value))}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></label></div>
      <label className="block">{t('Execution evidence (self-reported)', '执行情况（本人记录）')}<select className={input} value={verification} onChange={event => setVerification(event.target.value as typeof verification)}><option value="not-run">{t('Not run / not recorded', '未运行 / 未记录')}</option>{task.testPath && <option value="local-samples-reported">{t('I passed the local samples', '我已通过本地样例')}</option>}{task.track === 'hot100' && <option value="leetcode-accepted-reported">{t('I received LeetCode Accepted', '我已在力扣获得 Accepted')}</option>}</select></label>
      <label className="block">{t('Mistake or difficulty', '错误原因或卡点')}<input className={input} value={errorReason} onChange={event => setErrorReason(event.target.value)} maxLength={2000} /></label>
      <label className="block">{t('Reflection', '复盘说明')}<textarea className={`${input} min-h-24`} value={notes} onChange={event => setNotes(event.target.value)} maxLength={10000} /></label>
      {entry?.status === 'error' && <p role="alert" className="text-rose-600">{entry.error}</p>}
      <button disabled={savingAttempt} className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50">{savingAttempt ? t('Saving…', '正在保存…') : t('Save practice record', '保存练习记录')}</button>
    </form></div></Dialog>}
  </>;
}
