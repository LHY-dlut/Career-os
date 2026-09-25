import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, FileText, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LibraryResource, LibrarySource } from '../../content/library/types';
import { useI18n } from '../../i18n/I18nProvider';
import { libraryPath } from '../../services/learningLibrary';
import { getLibraryResourceTitle, getLibraryResourceLanguage } from '../../services/libraryLanguage';
import { LibraryLanguageSelect, type LibraryLanguagePreference } from './LibraryLanguageSelect';

interface Props {
  resources: LibraryResource[];
  sources: LibrarySource[];
  sourceId: string;
  category: string;
  query: string;
  search: string;
  page: number;
  languagePreference: LibraryLanguagePreference;
  onFilter: (key: 'source' | 'category' | 'q' | 'page' | 'lang', value: string) => void;
}

const PAGE_SIZE = 24;

export function LibraryOverview({ resources, sources, sourceId, category, query, search, page, languagePreference, onFilter }: Props) {
  const { t, language } = useI18n();
  const sourceResources = resources.filter(resource => !sourceId || resource.sourceId === sourceId);
  const categories = [...new Set(sourceResources.map(resource => resource.category))];
  const searchTerms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = sourceResources.filter(resource => (!category || resource.category === category) && searchTerms.every(term => `${getLibraryResourceTitle(resource, language)} ${resource.title} ${resource.category} ${resource.tags.join(' ')} ${resource.summary} ${sources.find(source => source.id === resource.sourceId)?.name || ''}`.toLocaleLowerCase().includes(term)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activePage = Math.min(Math.max(page, 1), pageCount);
  const visible = filtered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const currentSource = sources.find(source => source.id === sourceId);
  const articleCount = resources.filter(resource => resource.kind === 'article').length;

  return <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
    <header className="mb-10 flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-3xl"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">{t('Read. Practice. Remember.', '阅读 · 实践 · 积累')}</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('Your learning library, everywhere.', '把学习资料，随身带走。')}</h1><p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">{t('Explore AI, infrastructure, algorithms, and interview preparation. Read available articles here, follow original sources, and keep your own learning notes.', '集中学习 AI、基础设施、算法与面试准备。站内阅读已收录的文章，前往原站继续探索，把理解写成自己的笔记。')}</p><p className="mt-3 text-xs text-slate-400">{t(`${sources.length} sources · ${articleCount} local articles · ${resources.length - articleCount} reading links`, `${sources.length} 个来源 · ${articleCount} 篇站内文章 · ${resources.length - articleCount} 个原站阅读入口`)}</p></div>
      <Link to="/knowledge" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"><BookOpen className="h-4 w-4" />{t('My notes', '我的笔记')}<ArrowRight className="h-4 w-4" /></Link>
    </header>

    <section aria-label={t('Learning sources', '学习资料来源')} className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{sources.map(source => {
      const list = resources.filter(resource => resource.sourceId === source.id);
      const local = list.filter(resource => resource.kind === 'article').length;
      return <button key={source.id} onClick={() => onFilter('source', sourceId === source.id ? '' : source.id)} aria-pressed={sourceId === source.id} className={`flex min-w-0 flex-col rounded-2xl border p-5 text-left transition-colors ${sourceId === source.id ? 'border-indigo-400 bg-indigo-50/70 dark:border-indigo-700 dark:bg-indigo-950/30' : 'border-slate-200 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-indigo-700'}`}><div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"><BookOpen className="h-4 w-4" /></div><h2 className="break-words text-base font-semibold">{source.name}</h2><p className="mt-2 flex-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{source.description}</p><p className="mt-5 border-t border-slate-200/70 pt-3 text-xs text-indigo-600 dark:border-slate-800 dark:text-indigo-400">{t(`${list.length} resources · ${local} local articles`, `${list.length} 篇资料 · ${local} 篇站内可读`)}</p></button>;
    })}</section>

    <section aria-label={t('Browse learning resources', '浏览学习资料')}>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input aria-label={t('Search learning resources', '搜索学习资料')} value={query} onChange={event => onFilter('q', event.target.value)} placeholder={t('Search titles, descriptions, and tags…', '搜索标题、简介与标签…')} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900" /></div>
        <label className="flex min-w-0 items-center gap-2 text-xs text-slate-500"><span className="shrink-0">{t('Source', '来源')}</span><select aria-label={t('Filter by source', '按来源筛选')} value={sourceId} onChange={event => onFilter('source', event.target.value)} className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs dark:border-slate-800 dark:bg-slate-900"><option value="">{t('All sources', '全部来源')}</option>{!currentSource && sourceId && <option value={sourceId}>{t('Unknown source', '未知来源')}</option>}{sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label>
        <LibraryLanguageSelect value={languagePreference} onChange={value => onFilter('lang', value)} />
      </div>
      <nav aria-label={t('Resource categories', '资料分类')} className="mb-7 flex flex-wrap gap-2"><button aria-pressed={!category} onClick={() => onFilter('category', '')} className={`rounded-full border px-3 py-1.5 text-xs ${!category ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'}`}>{t('All categories', '全部分类')}</button>{categories.map(value => <button key={value} aria-pressed={category === value} onClick={() => onFilter('category', value)} className={`rounded-full border px-3 py-1.5 text-xs ${category === value ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-500 hover:border-indigo-300 dark:border-slate-800 dark:text-slate-400'}`}>{value}</button>)}</nav>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800"><h2 className="text-base font-semibold">{currentSource?.name || t('Learning resources', '学习资料')}<span className="ml-2 text-xs font-normal text-slate-400">{filtered.length}</span></h2>{(sourceId || category || query) && <Link to={`${libraryPath()}${languagePreference ? `?lang=${languagePreference}` : ''}`} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">{t('Clear filters', '清除筛选')}</Link>}</div>
      {visible.length ? <div aria-label={t('Resource list', '资料列表')} className="grid grid-cols-1 gap-x-8 md:grid-cols-2">{visible.map(resource => <Link key={resource.id} to={`${libraryPath(resource.id)}${search}`} className="group flex min-w-0 items-start gap-3 border-b border-slate-100 py-5 dark:border-slate-800/80">{resource.kind === 'article' ? <FileText className="mt-1 h-4 w-4 shrink-0 text-indigo-500" /> : <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-slate-400" />}<div className="min-w-0 flex-1"><div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400"><span>{sources.find(source => source.id === resource.sourceId)?.name}</span><span>·</span><span>{resource.category}</span></div><h3 className="break-words text-sm font-semibold leading-6 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{getLibraryResourceTitle(resource, language)}</h3>{resource.summary && <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{language === 'zh' ? resource.summary.replace(/\bEnglish\b/g, '英文').replace(/Cheat Sheet/gi, '速查表') : resource.summary}</p>}<div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px]"><span className={resource.kind === 'article' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>{resource.kind === 'article' ? t('Read here', '站内阅读') : t('Read at source', '原站阅读')}</span>{resource.translationGroupId && <span className="text-slate-400">{getLibraryResourceLanguage(resource) === 'en' ? t('English version', '英文版') : t('Chinese version', '中文版')}</span>}{resource.tags.slice(0, 3).map(tag => <span key={tag} className="text-slate-400">#{tag === 'English' ? t('English', '英文') : tag}</span>)}</div></div><ArrowRight className="mt-2 h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-indigo-500" /></Link>)}</div> : <div className="py-16 text-center"><Search className="mx-auto mb-4 h-7 w-7 text-slate-300" /><h3 className="text-sm font-medium">{t('No matching resources', '没有匹配的资料')}</h3><p className="mt-2 text-xs leading-6 text-slate-500">{t('Try another keyword or clear the source and category filters.', '换一个关键词，或清除来源和分类筛选。')}</p></div>}
      {pageCount > 1 && <nav aria-label={t('Resource pages', '资料分页')} className="mt-8 flex items-center justify-between gap-3 text-xs"><button onClick={() => onFilter('page', String(activePage - 1))} disabled={activePage === 1} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-30 dark:border-slate-800"><ArrowLeft className="h-3.5 w-3.5" />{t('Previous', '上一页')}</button><span className="text-slate-500">{t(`Page ${activePage} of ${pageCount}`, `第 ${activePage} / ${pageCount} 页`)}</span><button onClick={() => onFilter('page', String(activePage + 1))} disabled={activePage === pageCount} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-30 dark:border-slate-800">{t('Next', '下一页')}<ArrowRight className="h-3.5 w-3.5" /></button></nav>}
    </section>
  </div>;
}
