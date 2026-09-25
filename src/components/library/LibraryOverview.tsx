import { ArrowLeft, ArrowRight, BookOpen, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LibraryCourse, LibraryCourseNode, LibraryResource, LibrarySource } from '../../content/library/types';
import { useI18n } from '../../i18n/I18nProvider';
import { libraryPath } from '../../services/learningLibrary';
import { getLibraryResourceLanguage, getLibraryResourceTitle } from '../../services/libraryLanguage';
import { courseNodeTitle, filterCourse, flattenCourse, libraryCourseLink, libraryStats, type LibraryBrowseMode } from '../../services/libraryCourses';
import { LibraryLanguageSelect, type LibraryLanguagePreference } from './LibraryLanguageSelect';
import { LibraryStatus } from './LibraryStatus';

export type LibraryFilterKey = 'source' | 'category' | 'q' | 'page' | 'lang' | 'course' | 'view' | 'tag';
interface Props {
  resources: LibraryResource[];
  sources: LibrarySource[];
  courses: LibraryCourse[];
  mode: LibraryBrowseMode;
  courseId: string;
  sourceId: string;
  category: string;
  tag: string;
  query: string;
  search: string;
  page: number;
  languagePreference: LibraryLanguagePreference;
  lastRead?: { id: string; search: string } | null;
  onFilter: (key: LibraryFilterKey, value: string) => void;
}
const PAGE_SIZE = 24;

export function LibraryOverview({ resources, sources, courses, mode, courseId, sourceId, category, tag, query, search, page, languagePreference, lastRead, onFilter }: Props) {
  const { t, language } = useI18n();
  const currentCourse = courses.find(course => course.id === courseId) || (mode === 'source' ? courses.find(course => course.sourceId === sourceId) : undefined);
  const courseIds = currentCourse ? flattenCourse(currentCourse) : null;
  const sourceResources = resources.filter(resource => (!sourceId || resource.sourceId === sourceId) && (!courseIds || courseIds.includes(resource.id)));
  const categories = [...new Set(sourceResources.map(resource => resource.category))];
  const tags = [...new Set(sourceResources.flatMap(resource => resource.tags))].filter(value => !['中文', 'English'].includes(value)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = sourceResources.filter(resource => (!category || resource.category === category) && (!tag || resource.tags.includes(tag)) && terms.every(term => `${resource.title} ${getLibraryResourceTitle(resource, language)} ${resource.category} ${resource.summary} ${resource.tags.join(' ')} ${sources.find(source => source.id === resource.sourceId)?.name || ''}`.toLocaleLowerCase().includes(term)));
  if (courseIds) filtered.sort((a, b) => courseIds.indexOf(a.id) - courseIds.indexOf(b.id));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activePage = Math.min(Math.max(page, 1), pageCount);
  const visible = filtered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const allowed = new Set(filtered.map(resource => resource.id));
  const availableCourses = courses.map(course => filterCourse(course, allowed)).filter(Boolean) as LibraryCourse[];
  const stats = libraryStats(filtered);
  const showList = Boolean(currentCourse || sourceId || category || tag || query.trim());
  const reading = lastRead && resources.find(resource => resource.id === lastRead.id || resource.alternateId === lastRead.id);
  const source = sources.find(item => item.id === sourceId);
  const listLink = (resource: LibraryResource, course = currentCourse) => course ? libraryCourseLink(resource.id, search, course, mode) : `${libraryPath(resource.id)}${search}`;
  const clearSearch = new URLSearchParams(search);
  ['source', 'category', 'tag', 'q', 'page', 'course'].forEach(key => clearSearch.delete(key));

  const outlineNode = (node: LibraryCourseNode) => {
    const resource = resources.find(item => item.id === node.resourceId);
    return <li key={node.id} className="min-w-0">
      {resource ? <Link to={listLink(resource)} className="group flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg py-3 pr-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-900"><h3 className="min-w-0 flex-1 break-words leading-6 font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{getLibraryResourceTitle(resource, language)}</h3><LibraryStatus resource={resource} /></Link> : <h3 className="py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{courseNodeTitle(node, language)}</h3>}
      {node.children.length > 0 && <ul className="ml-2 border-l border-slate-200 pl-4 dark:border-slate-800">{node.children.map(outlineNode)}</ul>}
    </li>;
  };
  const pageTree = currentCourse && filterCourse(currentCourse, new Set(visible.map(resource => resource.id)));

  return <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{t('Learning library', '学习资料库')}</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('Learn in order. Put it into practice.', '按章节学习，把理解写成代码。')}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">{mode === 'path' ? t('Follow a Career OS learning path across sources. Original articles, outlines and personal notes stay separate.', '按本站学习路线连接不同来源。原文、上游提纲、本站补充和自己的笔记分别保留。') : t('Follow the original course structure and published order. Unverified hierarchy stays unclassified.', '沿原作者课程层级与顺序阅读；没有可靠层级依据的条目保留在待归类。')}</p></div><Link to="/knowledge" className="inline-flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400"><BookOpen className="h-4 w-4" />{t('My notes', '我的笔记')}</Link></header>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div role="group" aria-label={t('Browse organization', '资料浏览方式')} className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">{(['path', 'source'] as const).map(value => <button key={value} aria-pressed={mode === value} onClick={() => onFilter('view', value === 'path' ? '' : 'source')} className={`rounded-lg px-4 py-2 text-xs font-medium ${mode === value ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-500'}`}>{value === 'path' ? t('Learning paths', '按学习路线') : t('Source courses', '按来源课程')}</button>)}</div>{reading && <Link to={`${libraryPath(reading.id)}${lastRead?.search || ''}`} className="inline-flex max-w-full items-center gap-2 truncate text-xs text-indigo-600 dark:text-indigo-400"><BookOpen className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{t('Continue on this device: ', '继续本机阅读：')}{getLibraryResourceTitle(reading, language)}</span><ArrowRight className="h-3.5 w-3.5 shrink-0" /></Link>}</div>
    <section aria-label={t('Library filters', '资料筛选')} className="mb-7 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-4"><div className="relative min-w-[180px] flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input aria-label={t('Search learning resources', '搜索学习资料')} value={query} onChange={event => onFilter('q', event.target.value)} placeholder={t('Search titles, descriptions and tags…', '搜索标题、简介与标签…')} className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900" /></div><label className="flex items-center gap-2 text-xs text-slate-500">{t('Source', '来源')}<select aria-label={t('Filter by source', '按来源筛选')} value={sourceId} onChange={event => onFilter('source', event.target.value)} className="max-w-[210px] rounded-lg border border-slate-200 bg-white px-2 py-2.5 dark:border-slate-800 dark:bg-slate-900"><option value="">{t('All sources', '全部来源')}</option>{!source && sourceId && <option value={sourceId}>{t('Unknown source', '未知来源')}</option>}{sources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><LibraryLanguageSelect value={languagePreference} onChange={value => onFilter('lang', value)} /><label className="flex items-center gap-2 text-xs text-slate-500">{t('Tag', '标签')}<select aria-label={t('Filter by tag', '按标签筛选')} value={tag} onChange={event => onFilter('tag', event.target.value)} className="max-w-[180px] rounded-lg border border-slate-200 bg-white px-2 py-2.5 dark:border-slate-800 dark:bg-slate-900"><option value="">{t('All tags', '全部标签')}</option>{tag && !tags.includes(tag) && <option value={tag}>{tag}</option>}{tags.map(value => <option key={value} value={value}>{value}</option>)}</select></label></div>
      <nav aria-label={t('Resource categories', '资料分类')} className="mt-4 flex flex-wrap gap-2"><button aria-pressed={!category} onClick={() => onFilter('category', '')} className={`rounded-full px-2.5 py-1 text-[11px] ${!category ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{t('All categories', '全部分类')}</button>{categories.map(value => <button key={value} aria-pressed={category === value} onClick={() => onFilter('category', value)} className={`rounded-full px-2.5 py-1 text-[11px] ${category === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{value}</button>)}</nav>
      <p className="mt-4 text-[10px] leading-5 text-slate-400">{languagePreference === 'all' ? t('All language editions are shown; matching editions count as one topic.', '显示全部语言版本；对应的中英文稿只计算为一个独立主题。') : t('Prefer the selected language; resources with only one edition remain readable.', '每个主题优先显示所选语言；只有单一版本的资料仍可阅读。')}</p>
    </section>
    <p aria-label={t('Content counts', '资料数量统计')} className="mb-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500"><span>{t(`${stats.topics} topics`, `${stats.topics} 个独立主题`)}</span><span>{t(`${stats.versions} editions shown`, `${stats.versions} 个可见版本`)}</span><span>{t(`${stats.complete} complete articles`, `${stats.complete} 篇完整文章`)}</span><span>{t(`${stats.outlines} outlines`, `${stats.outlines} 篇上游提纲`)}</span><span>{t(`${stats.external} source links`, `${stats.external} 个原文链接`)}</span><span>{t(`${stats.originals} original tutorials`, `${stats.originals} 篇本站补充`)}</span></p>

    {!currentCourse && !showList && <section aria-label={t('Course catalog', '课程目录')} className="grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2">{availableCourses.map((course, index) => {
      const ids = flattenCourse(course), first = resources.find(resource => resource.id === ids[0]);
      return <article key={course.id} className="min-w-0 border-t border-slate-200 py-5 dark:border-slate-800"><div className="flex items-start gap-3"><span className="pt-1 font-mono text-xs text-indigo-400">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><button onClick={() => onFilter('course', course.id)} className="text-left text-lg font-semibold leading-7 hover:text-indigo-600 dark:hover:text-indigo-400"><h2>{courseNodeTitle(course, language)}</h2></button><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{course.description}</p><ul className="my-4 space-y-2 border-l border-slate-200 pl-3 text-xs dark:border-slate-800">{course.children.slice(0, 4).map(section => <li key={section.id} className="flex items-start justify-between gap-3"><span className="min-w-0 break-words text-slate-600 dark:text-slate-400">{courseNodeTitle(section, language)}</span><span className="shrink-0 text-[10px] text-slate-400">{flattenCourse(section).length}</span></li>)}</ul><div className="flex flex-wrap items-center justify-between gap-3"><button onClick={() => onFilter('course', course.id)} className="text-xs text-slate-500 hover:text-indigo-600">{t(`View ${ids.length} entries`, `查看 ${ids.length} 个条目`)}</button>{first && <Link to={libraryCourseLink(first.id, search, course, mode)} className="inline-flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">{t('Start reading', '开始阅读')}<ArrowRight className="h-3.5 w-3.5" /></Link>}</div></div></div></article>;
    })}</section>}

    {showList && <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800"><div><h2 className="text-lg font-semibold">{currentCourse ? courseNodeTitle(currentCourse, language) : source?.name || t('Filtered resources', '筛选结果')} <span className="ml-1 text-xs font-normal text-slate-400">{filtered.length}</span></h2>{currentCourse && <p className="mt-2 text-xs leading-6 text-slate-500">{currentCourse.description}</p>}</div><Link to={`${libraryPath()}${clearSearch.size ? `?${clearSearch}` : ''}`} className="text-xs text-indigo-600 dark:text-indigo-400">{t('Clear filters', '清除筛选')}</Link></div>
      {visible.length ? <div aria-label={t('Resource list', '资料列表')}>{pageTree ? <ul className="space-y-4">{pageTree.children.map(outlineNode)}</ul> : <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">{visible.map(resource => <Link key={resource.id} to={listLink(resource)} className="group min-w-0 border-b border-slate-100 py-5 dark:border-slate-800"><div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400"><span>{sources.find(item => item.id === resource.sourceId)?.name}</span><span>· {resource.category}</span><LibraryStatus resource={resource} /></div><h3 className="break-words text-sm font-semibold leading-6 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{getLibraryResourceTitle(resource, language)}</h3><p className="mt-2 text-xs leading-6 text-slate-500">{language === 'zh' ? resource.summary.replace(/\bEnglish\b/g, '英文').replace(/Cheat Sheet/gi, '速查表') : resource.summary}</p>{resource.translationGroupId && <span className="mt-2 block text-[10px] text-slate-400">{getLibraryResourceLanguage(resource) === 'en' ? t('English edition', '英文版') : t('Chinese edition', '中文版')}</span>}</Link>)}</div>}</div> : <div className="py-14 text-center text-sm text-slate-500">{t('No matching resources. Try another keyword or clear the filters.', '没有匹配的资料。请尝试其他关键词或清除筛选。')}</div>}
      {pageCount > 1 && <nav aria-label={t('Resource pages', '资料分页')} className="mt-8 flex items-center justify-between text-xs"><button onClick={() => onFilter('page', String(activePage - 1))} disabled={activePage === 1} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-30 dark:border-slate-800"><ArrowLeft className="h-3.5 w-3.5" />{t('Previous', '上一页')}</button><span className="text-slate-500">{t(`Page ${activePage} of ${pageCount}`, `第 ${activePage} / ${pageCount} 页`)}</span><button onClick={() => onFilter('page', String(activePage + 1))} disabled={activePage === pageCount} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-30 dark:border-slate-800">{t('Next', '下一页')}<ArrowRight className="h-3.5 w-3.5" /></button></nav>}
    </section>}
  </div>;
}
