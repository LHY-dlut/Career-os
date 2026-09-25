import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Download, FileText, Plus, Search, Upload } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { getCategoryDescription, getKnowledgeCategories, knowledgeCategoryPath } from '../../utils/knowledgeCatalog';
import type { KnowledgeArticle } from '../../types';

interface KnowledgeOverviewProps {
  articles: KnowledgeArticle[];
  filteredArticles: KnowledgeArticle[];
  selectedCategory: string | null;
  searchQuery: string;
  onSearch: (query: string) => void;
  onImport: () => void;
  onCreate: () => void;
  onExport: (article: KnowledgeArticle) => void;
  onExportAll: () => void;
}

export function KnowledgeOverview({ articles, filteredArticles, selectedCategory, searchQuery, onSearch, onImport, onCreate, onExport, onExportAll }: KnowledgeOverviewProps) {
  const { t, language, locale, label } = useI18n();
  const categories = getKnowledgeCategories(articles);
  return <div className="mx-auto max-w-[1240px] px-5 py-10 sm:px-9 lg:py-14">
    <header className="mb-9 flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-end dark:border-slate-800">
      <div className="max-w-2xl">
        <Link to="/knowledge" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-sky-700 dark:text-sky-400"><BookOpen className="h-4 w-4" />{t('KNOWLEDGE LIBRARY', '知识文库')}</Link>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">{selectedCategory ? label(selectedCategory).replace(/^\d+\s+/, '') : t('Build understanding, one concept at a time.', '把知识连成体系。')}</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">{selectedCategory ? getCategoryDescription(selectedCategory, language) : t('A reading space for AI engineering. Explore topics, revisit fundamentals, and grow your own technical notes.', '从基础原理到工程实践，按主题阅读、回顾，并持续积累属于自己的技术笔记。')}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={onImport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"><Upload className="h-3.5 w-3.5" />{t('Import Markdown', '导入 Markdown')}</button>
        <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-3.5 py-2.5 text-xs font-medium text-white hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500"><Plus className="h-3.5 w-3.5" />{t('New article', '新建文章')}</button>
      </div>
    </header>

    <div className="mb-8 flex flex-col gap-5">
      <div className="relative max-w-2xl">
        <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
        <input aria-label={t('Search knowledge articles', '搜索知识文章')} value={searchQuery} onChange={event => onSearch(event.target.value)} placeholder={t('Search titles, concepts, or tags…', '搜索标题、概念或标签…')} className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-10 text-sm text-slate-800 outline-none transition-colors focus:border-sky-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:focus:bg-slate-900" />
        {searchQuery && <button aria-label={t('Clear search', '清空搜索')} onClick={() => onSearch('')} className="absolute right-3 top-2.5 rounded px-1.5 py-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">×</button>}
      </div>
      <nav aria-label={t('Knowledge categories', '知识分类')} className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
        <Link to="/knowledge" aria-current={!selectedCategory ? 'page' : undefined} className={`border-b-2 py-1.5 ${!selectedCategory ? 'border-sky-600 font-semibold text-sky-700 dark:text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}>{t('All topics', '全部主题')}</Link>
        {categories.map(category => <Link key={category} to={knowledgeCategoryPath(category)} aria-current={selectedCategory === category ? 'page' : undefined} className={`border-b-2 py-1.5 ${selectedCategory === category ? 'border-sky-600 font-semibold text-sky-700 dark:text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}>{label(category).replace(/^\d+\s+/, '')}</Link>)}
      </nav>
    </div>

    {!selectedCategory && !searchQuery.trim() && <section aria-label={t('Explore knowledge topics', '浏览知识主题')} className="mb-12 grid grid-cols-1 gap-x-7 sm:grid-cols-2 xl:grid-cols-3">
      {categories.map((category, index) => {
        const count = articles.filter(article => article.category === category).length;
        return <Link key={category} to={knowledgeCategoryPath(category)} className="group flex gap-4 border-t border-slate-200 py-5 dark:border-slate-800">
          <span className="pt-1 font-mono text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold text-slate-800 group-hover:text-sky-700 dark:text-slate-200 dark:group-hover:text-sky-400">{label(category).replace(/^\d+\s+/, '')}</h2><ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-sky-600" /></div>
            <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{getCategoryDescription(category, language)}</p>
            <p className="mt-3 text-[11px] text-slate-400">{t(`${count} articles`, `${count} 篇文章`)}</p>
          </div>
        </Link>;
      })}
    </section>}

    <section aria-label={t('Article list', '文章列表')}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{searchQuery.trim() ? t('Search results', '搜索结果') : selectedCategory ? t('In this topic', '本主题文章') : t('All articles', '全部文章')}<span className="ml-2 text-xs font-normal text-slate-400">{filteredArticles.length}</span></h2>
        <button onClick={onExportAll} disabled={!articles.length} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-700 disabled:opacity-40 dark:hover:text-sky-400"><Download className="h-3.5 w-3.5" />{t('Export all', '导出全部')}</button>
      </div>
      {filteredArticles.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
        {filteredArticles.map(article => <article key={article.id} className="group flex items-start gap-4 py-5 sm:gap-6">
          <FileText className="mt-1 hidden h-4 w-4 shrink-0 text-slate-300 sm:block dark:text-slate-600" />
          <Link to={`/knowledge/${encodeURIComponent(article.id)}`} className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-6 text-slate-800 transition-colors group-hover:text-sky-700 dark:text-slate-200 dark:group-hover:text-sky-400">{article.title}</h3>
            {article.summary && <p className="mt-1.5 line-clamp-2 max-w-3xl text-xs leading-6 text-slate-500 dark:text-slate-400">{article.summary}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400"><span>{label(article.category)}</span><span>{t('Updated', '更新于')} {new Date(article.updatedAt).toLocaleDateString(locale)}</span>{article.tags.slice(0, 3).map(tag => <span key={tag}>#{tag}</span>)}</div>
          </Link>
          <button onClick={() => onExport(article)} aria-label={t(`Export ${article.title}`, `导出${article.title}`)} title={t('Export Markdown', '导出 Markdown')} className="rounded-md p-2 text-slate-300 hover:bg-slate-100 hover:text-sky-700 focus-visible:text-sky-700 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-sky-400"><Download className="h-3.5 w-3.5" /></button>
        </article>)}
      </div> : <div className="py-14 text-center">
        <BookOpen className="mx-auto mb-4 h-8 w-8 text-slate-300 dark:text-slate-700" />
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{searchQuery.trim() ? t('No matching articles', '没有匹配的文章') : t('This topic is ready for your first note.', '从第一篇笔记开始积累。')}</h3>
        <p className="mt-2 text-xs text-slate-400">{searchQuery.trim() ? t('Try a different title or tag, or explore another topic.', '尝试其他标题或标签，或切换知识主题。') : t('Import your Markdown notes or write a new article.', '导入已有的 Markdown 笔记，或新建一篇文章。')}</p>
        <button onClick={searchQuery.trim() ? () => onSearch('') : onCreate} className="mt-5 text-xs font-medium text-sky-700 hover:underline dark:text-sky-400">{searchQuery.trim() ? t('Clear search', '清空搜索') : t('Write an article', '开始写作')} →</button>
      </div>}
    </section>
  </div>;
}
