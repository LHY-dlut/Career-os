import React, { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Calendar, RotateCcw, CheckCircle2, Briefcase, Code2,
  BookOpen, ArrowRight, Layers, Network, BrainCircuit, Search, Bot, Database,
  Cpu, Languages, type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { getKnowledgeCategories, knowledgeCategoryPath, getCategoryDescription } from '../utils/knowledgeCatalog';
import type { KnowledgeArticle, Question, Application, Interview, ReviewHistory, CodingProblem, CodingAttempt } from '../types';
import { libraryResources, librarySources } from '../services/learningLibrary';
import { localizeStarterArticle } from '../services/starterArticleLocalization';
import { preferLibraryLanguage } from '../services/libraryLanguage';

const TrainingWorkspace = lazy(() => import('../components/training/TrainingWorkspace').then(module => ({ default: module.TrainingWorkspace })));

interface DashboardProps {
  questions: Question[];
  articles: KnowledgeArticle[];
  applications: Application[];
  interviews: Interview[];
  reviewHistory: ReviewHistory[];
  codingProblems: CodingProblem[];
  codingAttempts: CodingAttempt[];
  onNavigate: (view: string, id?: string) => void;
  onQuickAdd: (type: 'article' | 'question' | 'application' | 'interview') => void;
}

const categoryStyles: Record<string, { icon: LucideIcon; color: string }> = {
  '01 Transformer': { icon: Network, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300' },
  '02 LLM': { icon: BrainCircuit, color: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300' },
  '03 RAG': { icon: Search, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300' },
  '04 Agent': { icon: Bot, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300' },
  '05 Text-to-SQL': { icon: Database, color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-300' },
  '06 Machine Learning': { icon: Layers, color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300' },
  '07 Deep Learning': { icon: Cpu, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300' },
  '08 NLP': { icon: Languages, color: 'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300' },
};
const panelClass = 'min-w-0 rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#12161f]';
const textLinkClass = 'inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300';

export const Dashboard: React.FC<DashboardProps> = ({
  questions, articles: storedArticles, applications, interviews, reviewHistory, codingProblems, codingAttempts, onQuickAdd,
}) => {
  const { t, language, locale, label } = useI18n();
  const articles = React.useMemo(() => storedArticles.map(article => localizeStarterArticle(article, language)), [storedArticles, language]);
  const now = new Date();
  const dueQuestions = questions.filter(q => !q.nextReviewAt || new Date(q.nextReviewAt) <= now);
  const masteredQuestions = questions.filter(q => q.masteryLevel === 'Mastered');
  const upcomingInterviews = interviews
    .filter(inv => inv.result === 'Scheduled' && new Date(inv.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const todayReviewCount = reviewHistory.filter(review => new Date(review.reviewedAt).toDateString() === now.toDateString()).length;
  const knowledgeCategories = getKnowledgeCategories(articles);
  const updatedTimestamp = (article: KnowledgeArticle) => {
    const value = new Date(article.updatedAt).getTime();
    return Number.isFinite(value) ? value : 0;
  };
  const recentArticles = [...articles].sort((a, b) => updatedTimestamp(b) - updatedTimestamp(a)).slice(0, 3);
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? t('Date unavailable', '日期未记录') : date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const stages = [
    { name: 'Wishlist', color: 'text-zinc-500' }, { name: 'Applied', color: 'text-blue-500' },
    { name: 'Assessment', color: 'text-amber-500' }, { name: 'Interviewing', color: 'text-indigo-500' },
    { name: 'Offer', color: 'text-emerald-500' }, { name: 'Rejected', color: 'text-rose-500' },
  ];
  const categoryStats = ['Transformer', 'LLM', 'RAG', 'Agent', 'Inference', 'Machine Learning'].map(category => {
    const items = questions.filter(q => q.category.toLowerCase().includes(category.toLowerCase()));
    const mastered = items.filter(q => q.masteryLevel === 'Mastered').length;
    return { category, mastered, total: items.length, percentage: items.length ? Math.round(mastered / items.length * 100) : 0 };
  });
  const metrics = [
    { href: '/questions', icon: CheckCircle2, name: t('Question Bank', '面试题库'), count: questions.length, detail: t(`${masteredQuestions.length} mastered · ${questions.length ? Math.round(masteredQuestions.length / questions.length * 100) : 0}% mastery`, `已掌握 ${masteredQuestions.length} 道 · 掌握率 ${questions.length ? Math.round(masteredQuestions.length / questions.length * 100) : 0}%`), color: 'text-emerald-600 dark:text-emerald-400' },
    { href: '/review', icon: RotateCcw, name: t('Due for Review', '待复习题目'), count: dueQuestions.length, detail: t(`${todayReviewCount} reviews completed today`, `今天已完成 ${todayReviewCount} 次复习`), color: 'text-amber-600 dark:text-amber-400' },
    { href: '/applications', icon: Briefcase, name: t('Applications', '求职投递'), count: applications.length, detail: t(`${applications.filter(a => a.status === 'Interviewing').length} interviewing · ${applications.filter(a => a.status === 'Offer').length} offers`, `${applications.filter(a => a.status === 'Interviewing').length} 个面试中 · ${applications.filter(a => a.status === 'Offer').length} 份录用`), color: 'text-blue-600 dark:text-blue-400' },
    { href: '/interviews', icon: Calendar, name: t('Upcoming Interviews', '即将到来的面试'), count: upcomingInterviews.length, detail: upcomingInterviews[0] ? t(`Next: ${upcomingInterviews[0].companyName}`, `下一场：${upcomingInterviews[0].companyName}`) : t('No upcoming rounds', '暂无待面试轮次'), color: 'text-violet-600 dark:text-violet-400' },
  ];

  return (
    <div className="min-w-0 bg-white text-zinc-900 dark:bg-[#0c1017] dark:text-zinc-100">
      <section className="guide-hero relative flex items-center justify-center overflow-hidden border-b border-zinc-100 px-5 py-8 text-center dark:border-zinc-800/70 sm:px-8" aria-labelledby="guide-title">
        <div className="relative z-10 mx-auto w-full max-w-3xl">
          <div className="mb-3 inline-flex max-w-full items-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('Your guide to AI learning & careers', '个人 AI 学习与求职指南')}
          </div>
          <h1 id="guide-title" className="text-3xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            AI Career <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400">OS</span>
          </h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-zinc-700 dark:text-zinc-200">
            {t('Build your AI knowledge. Step into interviews with confidence.', '把 AI 知识，变成面试中的底气。')}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link to="/library" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              {t('Browse learning paths', '按路线学习')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/review" className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-indigo-300 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> {t('Review today', '今日复习')}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-7 sm:space-y-12 sm:px-8">
        <Suspense fallback={<div role="status" className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">{t('Loading code training…', '正在加载代码训练…')}</div>}><TrainingWorkspace compact /></Suspense>
        <section aria-labelledby="learning-library-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 id="learning-library-title" className="text-2xl font-bold">{t('Learning resources', '学习资料')}</h2><p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{t('Collected tutorials and original reading links. Pick a source to begin.', '收录教程与原文导航，选一个来源开始学习。')}</p></div><Link to="/library" className={textLinkClass}>{t('Browse the library', '进入资料库')}<ArrowRight className="size-4" /></Link></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{librarySources.map(source => { const records = preferLibraryLanguage(libraryResources.filter(resource => resource.sourceId === source.id), language); return <Link key={source.id} to={`/library?view=source&source=${encodeURIComponent(source.id)}`} className="rounded-xl border border-zinc-200 p-4 transition-colors hover:border-indigo-400 dark:border-zinc-800"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{source.name}</h3><ArrowRight className="size-4 shrink-0 text-indigo-500" /></div><p className="mt-2 text-xs text-zinc-500">{t(`${records.length} independent topics · view content status`, `${records.length} 个独立主题 · 查看内容状态`)}</p></Link>; })}</div>
        </section>
        <section aria-labelledby="knowledge-catalog-title">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">{t('Explore & learn', '知识地图')}</p>
              <h2 id="knowledge-catalog-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{t('Knowledge Library', '知识库')}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{t('Find a direction, connect the concepts, and build your own understanding.', '选一个方向，从理解概念开始，逐步建立自己的知识体系。')}</p>
            </div>
            <Link to="/knowledge" className={textLinkClass}>{t('Browse all articles', '浏览全部文章')} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {knowledgeCategories.map(category => {
              const style = categoryStyles[category] || { icon: BookOpen, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300' };
              const Icon = style.icon;
              const count = articles.filter(article => article.category === category).length;
              return (
                <Link key={category} to={knowledgeCategoryPath(category)} className="group flex min-w-0 flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 dark:border-zinc-800 dark:bg-[#12161f] dark:hover:border-indigo-700 dark:hover:shadow-none">
                  <span className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${style.color}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <h3 className="break-words text-lg font-semibold tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-300">{label(category).replace(/^\d+\s+/, '')}</h3>
                  <p className="mt-2 flex-1 text-sm leading-7 text-zinc-500 dark:text-zinc-400">{getCategoryDescription(category, language)}</p>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
                    <span className="text-zinc-400 dark:text-zinc-500">{t(`${count} ${count === 1 ? 'article' : 'articles'}`, `${count} 篇文章`)}</span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">{t('Explore', '开始探索')} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="recent-articles-title">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="recent-articles-title" className="text-2xl font-bold tracking-tight">{t('Recently updated', '最近更新')}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{t('Pick up the latest notes in your workspace.', '从最近整理的笔记，继续你的学习。')}</p>
            </div>
            <Link to="/knowledge" className={textLinkClass}>{t('View all', '查看全部')} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          {recentArticles.length ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {recentArticles.map(article => (
                <Link key={article.id} to={`/knowledge/${encodeURIComponent(article.id)}`} className="group flex min-w-0 flex-col rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 transition-colors hover:border-indigo-300 dark:border-zinc-800 dark:bg-[#12161f] dark:hover:border-indigo-700">
                  <span className="mb-3 text-xs font-medium text-indigo-600 dark:text-indigo-400">{label(article.category).replace(/^\d+\s+/, '')}</span>
                  <h3 className="break-words text-base font-semibold leading-7 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">{article.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{article.summary || t('Open this note to keep learning.', '打开笔记，继续学习。')}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-6 text-xs text-zinc-400 dark:text-zinc-500"><span>{formatDate(article.updatedAt)}</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 px-6 py-10 text-center dark:border-zinc-800">
              <BookOpen className="mx-auto mb-3 h-7 w-7 text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('Your first learning note starts here. Add an article to begin.', '这里将展示最近更新的笔记。添加第一篇文章，开启学习积累。')}</p>
              <button onClick={() => onQuickAdd('article')} className={`${textLinkClass} mt-4`}>{t('Add an article', '添加文章')} <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          )}
        </section>

        <section aria-labelledby="today-workspace-title" className="space-y-6 border-t border-zinc-100 pt-14 dark:border-zinc-800">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="today-workspace-title" className="text-2xl font-bold tracking-tight">{t('Your workspace today', '今日工作台')}</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{now.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })} <span className="mx-1" aria-hidden="true">·</span> {t('Keep learning and moving forward.', '让每一步准备都有迹可循。')}</p>
            </div>
            <Link to="/copilot" className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-2.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950"><Sparkles className="h-4 w-4" aria-hidden="true" />{t('AI Copilot', 'AI 助手')}</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map(metric => {
              const Icon = metric.icon;
              return <Link key={metric.href} to={metric.href} className={`${panelClass} transition-colors hover:border-indigo-300 dark:hover:border-indigo-700`}><div className="flex items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400"><span>{metric.name}</span><Icon className={`h-4 w-4 shrink-0 ${metric.color}`} aria-hidden="true" /></div><div className="mt-3 text-3xl font-bold tracking-tight">{metric.count}</div><p className="mt-2 break-words text-xs leading-5 text-zinc-500 dark:text-zinc-400">{metric.detail}</p></Link>;
            })}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <div className={panelClass}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="inline-flex items-center gap-2 text-base font-semibold"><Calendar className="h-4 w-4 text-indigo-500" aria-hidden="true" />{t('Upcoming interviews', '待面试安排')}</h3><Link to="/interviews" className={textLinkClass}>{t('View all', '查看全部')}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>
                {upcomingInterviews.length ? <div className="space-y-3">{upcomingInterviews.map(inv => <Link key={inv.id} to={`/interviews/${encodeURIComponent(inv.id)}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 transition-colors hover:border-indigo-200 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:border-indigo-800"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="break-words text-sm font-semibold">{inv.companyName}</span><span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">{t(`Round ${inv.roundNumber}`, `第 ${inv.roundNumber} 轮`)}</span></div><p className="mt-1 break-words text-sm text-zinc-500 dark:text-zinc-400">{inv.roundName} · {t(`${inv.durationMinutes} min`, `${inv.durationMinutes} 分钟`)}</p></div><div className="shrink-0 text-right text-xs leading-6 text-zinc-500 dark:text-zinc-400"><div>{new Date(inv.scheduledAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</div><div>{new Date(inv.scheduledAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div></div></Link>)}</div> : <p className="rounded-xl bg-zinc-50 px-4 py-6 text-sm leading-7 text-zinc-500 dark:bg-zinc-900/40 dark:text-zinc-400">{t('No upcoming interviews. Add a round when you hear from a recruiter.', '暂无待面试安排。收到招聘方通知后，可以添加新的面试轮次。')}</p>}
              </div>
              <div className={panelClass}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="inline-flex items-center gap-2 text-base font-semibold"><RotateCcw className="h-4 w-4 text-amber-500" aria-hidden="true" />{t(`Review queue (${dueQuestions.length})`, `今日待复习（${dueQuestions.length} 道）`)}</h3><Link to="/review" className={textLinkClass}>{t('Start review', '开始复习')}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>
                {dueQuestions.length ? <div className="space-y-3">{dueQuestions.slice(0, 4).map(question => <Link key={question.id} to={`/questions/${encodeURIComponent(question.id)}`} className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-zinc-100 p-4 transition-colors hover:border-indigo-200 dark:border-zinc-800 dark:hover:border-indigo-800"><div className="min-w-0"><p className="break-words text-sm font-medium">{question.title}</p><p className="mt-1 text-xs text-indigo-500 dark:text-indigo-400">{label(question.category)}</p><p className="mt-2 line-clamp-1 text-sm text-zinc-500 dark:text-zinc-400">{question.conciseAnswer}</p></div><span className={`shrink-0 rounded-md px-2 py-0.5 text-xs ${question.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : question.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'}`}>{label(question.difficulty)}</span></Link>)}</div> : <p className="rounded-xl bg-zinc-50 px-4 py-6 text-sm leading-7 text-zinc-500 dark:bg-zinc-900/40 dark:text-zinc-400">{t('All caught up. Your next review will appear here.', '已完成所有到期复习，下次待复习的题目会显示在这里。')}</p>}
              </div>
              <div className={panelClass}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="inline-flex items-center gap-2 text-base font-semibold"><Briefcase className="h-4 w-4 text-indigo-500" aria-hidden="true" />{t('Application pipeline', '求职进度概览')}</h3><Link to="/applications" className={textLinkClass}>{t('Manage', '管理投递')}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{stages.map(stage => <Link key={stage.name} to="/applications" className="rounded-xl bg-zinc-50 p-3 text-center transition-colors hover:bg-indigo-50 dark:bg-zinc-900/50 dark:hover:bg-indigo-950/40"><p className="text-xs text-zinc-500 dark:text-zinc-400">{label(stage.name)}</p><p className={`mt-2 text-2xl font-semibold ${stage.color}`}>{applications.filter(application => application.status === stage.name).length}</p></Link>)}</div>
              </div>
            </div>
            <div className="min-w-0 space-y-6">
              <div className={panelClass}>
                <h3 className="inline-flex items-center gap-2 text-base font-semibold"><Layers className="h-4 w-4 text-indigo-500" aria-hidden="true" />{t('Mastery by category', '各分类掌握情况')}</h3><p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t(`${masteredQuestions.length} of ${questions.length} questions mastered`, `已掌握 ${masteredQuestions.length} / ${questions.length} 道题`)}</p>
                <div className="mt-6 space-y-5">{categoryStats.map(item => <div key={item.category}><div className="mb-2 flex items-center justify-between gap-2 text-sm"><span>{label(item.category)}</span><span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{item.mastered}/{item.total} ({item.percentage}%)</span></div><div role="progressbar" aria-label={label(item.category)} aria-valuenow={item.percentage} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${item.percentage}%` }} /></div></div>)}</div>
              </div>
              <div className={panelClass}>
                <h3 className="inline-flex items-center gap-2 text-base font-semibold"><Code2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />{t('Coding practice', '编程练习推荐')}</h3><p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t(`${codingAttempts.length} attempts recorded`, `已记录 ${codingAttempts.length} 次练习`)}</p>
                {codingProblems[0] ? <div className="mt-5"><div className="flex items-start justify-between gap-2"><h4 className="min-w-0 break-words text-sm font-semibold leading-6">{codingProblems[0].title}</h4><span className="shrink-0 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{label(codingProblems[0].difficulty)}</span></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{codingProblems[0].problemDescription}</p><Link to={`/coding/${encodeURIComponent(codingProblems[0].id)}`} className={`${textLinkClass} mt-5`}>{t('Open in Coding Lab', '打开编程练习')}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div> : <div className="mt-5"><p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">{t('Add a problem and put your knowledge into practice.', '添加一道题目，把学到的知识变成代码。')}</p><Link to="/coding" className={`${textLinkClass} mt-4`}>{t('Open Coding Lab', '进入编程练习')}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
