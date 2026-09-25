import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Code2, Expand, Search } from 'lucide-react';
import { useAuth } from '../../app/AuthProvider';
import { useData } from '../../app/DataProvider';
import { useTraining } from '../../app/TrainingProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { loadTrainingCatalog } from '../../services/trainingCatalog';
import { personalTrainingTask, taskAttempts, trainingStatus, type WorkspaceTask } from '../../services/trainingWorkspace';
import { TrainingEditor } from './TrainingEditor';
import type { TrainingTask } from '../../content/training/types';

const field = 'min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';
export function TrainingWorkspace({ compact = false }: { compact?: boolean }) {
  const { t, language, label } = useI18n();
  const { user } = useAuth();
  const identity = user?.uid || 'guest';
  const { data, loading, error: workspaceError } = useData();
  const training = useTraining();
  const location = useLocation();
  const navigate = useNavigate();
  const { problemId } = useParams();
  const [catalog, setCatalog] = useState<TrainingTask[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setCatalogError(false);
    loadTrainingCatalog().then(value => { if (active) setCatalog(value); }, () => { if (active) setCatalogError(true); });
    return () => { active = false; };
  }, [retry]);
  const personal = useMemo(() => data.codingProblems.filter(problem => !problem.trainingTaskId).map(personalTrainingTask), [data.codingProblems]);
  const all: WorkspaceTask[] = useMemo(() => [...(catalog || []), ...personal], [catalog, personal]);
  const params = new URLSearchParams(location.search);
  const requestedId = compact ? params.get('task') : problemId || params.get('task');
  const selectedKey = requestedId || training.selectedId;
  const legacySnapshot = data.codingProblems.find(problem => problem.id === selectedKey);
  const requested = all.find(task => task.id === (legacySnapshot?.trainingTaskId || selectedKey));
  const trackValue = params.get('track');
  const track = ['hot100', 'pytorch', 'personal'].includes(trackValue || '') ? trackValue! : requested?.track || 'hot100';
  const trackTasks = all.filter(task => task.track === track);
  const query = params.get('tq') || '';
  const category = params.get('tc') || '';
  const difficulty = params.get('td') || '';
  const status = params.get('ts') || '';
  const statuses = useMemo(() => new Map(all.map(task => [task.id, trainingStatus(taskAttempts(task, identity, data.codingProblems, data.codingAttempts))])), [all, identity, data.codingProblems, data.codingAttempts]);
  const filtered = trackTasks.filter(task => (!query || `${task.title} ${task.titleEn || ''} ${task.number || ''} ${task.category}`.toLowerCase().includes(query.toLowerCase())) && (!category || task.category === category) && (!difficulty || task.difficulty === difficulty) && (!status || statuses.get(task.id) === status));
  const task = requested?.track === track ? requested : filtered[0];
  const title = (task: WorkspaceTask) => language === 'en' ? task.titleEn || task.title : task.title;
  const searchFor = (patch: Record<string, string>) => {
    const next = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(patch)) if (value) next.set(key, value); else next.delete(key);
    return next;
  };
  const choose = (taskId: string, nextTrack = track) => {
    const next = searchFor({ track: nextTrack, task: compact ? taskId : '' });
    if (nextTrack !== track) ['tq', 'tc', 'td', 'ts'].forEach(key => next.delete(key));
    training.select(taskId);
    navigate({ pathname: compact ? location.pathname : `/coding/${encodeURIComponent(taskId)}`, search: next.toString() });
  };
  const filter = (key: string, value: string) => navigate({ pathname: location.pathname, search: searchFor({ [key]: value }).toString() }, { replace: key === 'tq' });
  const completion = trackTasks.filter(item => statuses.get(item.id) === 'completed').length;
  const review = trackTasks.filter(item => statuses.get(item.id) === 'review').length;
  const total = trackTasks.length;
  const fullParams = searchFor({ task: '' });

  return <section aria-label={t('Code training workspace', '代码训练工作区')} className={`min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#101722] ${compact ? '' : 'mx-auto max-w-[1440px]'}`}>
    <header className="border-b border-slate-200 px-4 py-5 sm:px-6 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-xl font-bold"><Code2 className="h-5 w-5 text-indigo-500" />{t(compact ? 'Today’s code training' : 'Code training', compact ? '今日代码训练' : '代码训练')}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{t('Edit and record mode · Download your code and tests to run locally.', '编辑与记录模式 · 下载代码和测试文件，在本地运行验证。')}</p></div>
        {compact && task && <Link to={`/coding/${encodeURIComponent(task.id)}?${fullParams}`} className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-300"><Expand className="h-4 w-4" />{t('Full workspace', '全屏训练')}</Link>}
        {!compact && <Link to={`/dashboard?task=${encodeURIComponent(task?.id || '')}&track=${track}`} className="text-sm text-indigo-600 dark:text-indigo-300">{t('Continue on dashboard', '回首页继续草稿')}</Link>}
      </div>
      <div role="tablist" aria-label={t('Training tracks', '训练轨道')} className="mt-5 flex flex-wrap gap-2">
        {(['hot100', 'pytorch', ...(personal.length ? ['personal'] : [])] as const).map(item => <button key={item} role="tab" aria-selected={track === item} onClick={() => { const first = all.find(task => task.track === item); if (first) choose(first.id, item); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${track === item ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{item === 'hot100' ? 'LeetCode Hot100' : item === 'pytorch' ? 'Transformer / PyTorch' : t('My problems', '我的题目')}</button>)}
      </div>
      {catalog && <>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs leading-6 text-slate-500"><span>{t(`Completed ${completion}/${total}`, `已完成 ${completion}/${total}`)}</span><span>{t(`${review} to review`, `待复习 ${review}`)}</span><span>{t(`${total - completion - review} not started`, `未完成 ${total - completion - review}`)}</span><span>{t(`${trackTasks.filter(item => item.contentStatus === 'complete').length} complete learning packages`, `${trackTasks.filter(item => item.contentStatus === 'complete').length} 个完整训练包`)}</span></div>
        <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <label className={`col-span-2 flex items-center gap-2 sm:col-span-1 ${field}`}><Search className="h-4 w-4 shrink-0 text-slate-400" /><input aria-label={t('Search training tasks', '搜索训练题目')} value={query} onChange={event => filter('tq', event.target.value)} placeholder={t('Title or number', '题名或题号')} className="min-w-0 w-full bg-transparent outline-none" /></label>
          <select className={field} aria-label={t('Training category', '训练分类')} value={category} onChange={event => filter('tc', event.target.value)}><option value="">{t('All categories', '全部分类')}</option>{[...new Set(trackTasks.map(task => task.category))].map(value => <option key={value}>{value}</option>)}</select>
          <select className={field} aria-label={t('Training difficulty', '训练难度')} value={difficulty} onChange={event => filter('td', event.target.value)}><option value="">{t('All difficulties', '全部难度')}</option>{['Easy', 'Medium', 'Hard'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
          <select className={field} aria-label={t('Training progress', '训练进度')} value={status} onChange={event => filter('ts', event.target.value)}><option value="">{t('All progress', '全部进度')}</option><option value="unstarted">{t('Not started', '未完成')}</option><option value="review">{t('To review', '待复习')}</option><option value="completed">{t('Completed', '已完成')}</option></select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3"><label className="min-w-0 flex-1 text-xs font-medium">{t('Choose a task', '选择题目')}<select className={`${field} mt-1 block w-full font-medium`} aria-label={t('Choose training task', '选择训练题目')} value={task?.id || ''} onChange={event => choose(event.target.value)}>{task && !filtered.some(item => item.id === task.id) && <option value={task.id}>{title(task)} · {t('Current, outside filter', '当前题目，不在筛选中')}</option>}{filtered.map(item => <option key={item.id} value={item.id}>{item.number ? `${item.number}. ` : ''}{title(item)} · {label(item.difficulty)}</option>)}</select></label><span className="pt-4 text-xs text-slate-500">{t(`${filtered.length} matching tasks`, `${filtered.length} 道符合筛选`)}</span></div>
      </>}
    </header>
    {catalogError ? <div role="alert" className="p-6 text-sm">{t('The task index could not be loaded.', '题目目录加载失败。')}<button onClick={() => setRetry(value => value + 1)} className="ml-3 text-indigo-500">{t('Retry', '重试')}</button></div> : !catalog || loading ? <div role="status" className="p-8 text-sm text-slate-500">{t('Loading training workspace…', '正在加载训练工作区…')}</div> : workspaceError ? <p role="alert" className="p-6 text-rose-600">{t('Your private workspace is unavailable. Reload it before editing or recording.', '私人工作区暂不可用，请恢复工作区后再编辑和记录。')}</p> : requestedId && !requested ? <p role="alert" className="p-6">{t('This task is unavailable in the current workspace.', '当前工作区中没有这道题目。')}</p> : task ? <TrainingEditor key={task.id} task={task} compact={compact} /> : <p className="p-8 text-sm text-slate-500">{t('No tasks match these filters.', '没有符合这些条件的题目。')}</p>}
  </section>;
}
