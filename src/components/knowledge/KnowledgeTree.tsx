import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, FileText, Plus, Search, Upload } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { getKnowledgeCategories, knowledgeCategoryPath } from '../../utils/knowledgeCatalog';
import type { KnowledgeArticle } from '../../types';

interface KnowledgeTreeProps {
  articles: KnowledgeArticle[];
  currentArticle?: KnowledgeArticle;
  onCreate: () => void;
  onImport: () => void;
  onNavigate?: () => void;
}

export function KnowledgeTree({ articles, currentArticle, onCreate, onImport, onNavigate }: KnowledgeTreeProps) {
  const { t, label } = useI18n();
  const [query, setQuery] = useState('');
  const categories = useMemo(() => getKnowledgeCategories(articles), [articles]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [currentArticle?.category || '']: true });
  useEffect(() => {
    if (currentArticle) setExpanded(previous => ({ ...previous, [currentArticle.category]: true }));
  }, [currentArticle?.category]);
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return <nav aria-label={t('Knowledge document navigation', '知识文档导航')} className="flex h-full min-h-0 flex-col text-sm">
    <div className="px-4 pb-4 pt-5">
      <Link to="/knowledge" onClick={onNavigate} className="mb-5 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
        <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" />{t('Knowledge library', '知识文库')}
      </Link>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <input value={query} onChange={event => setQuery(event.target.value)} aria-label={t('Search document navigation', '搜索文档目录')} placeholder={t('Find a document…', '查找文档…')} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200" />
      </div>
    </div>
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-5">
      {categories.map(category => {
        const categoryArticles = articles.filter(article => article.category === category);
        const matchesCategory = label(category).toLocaleLowerCase().includes(normalizedQuery);
        const visibleArticles = categoryArticles.filter(article => matchesCategory || `${article.title} ${article.tags.join(' ')}`.toLocaleLowerCase().includes(normalizedQuery));
        if (normalizedQuery && !matchesCategory && !visibleArticles.length) return null;
        const open = normalizedQuery ? true : Boolean(expanded[category]);
        return <section key={category}>
          <div className="flex items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70">
            <button type="button" aria-expanded={open} aria-label={t(`Toggle ${label(category)} documents`, `展开或收起${label(category)}文档`)} onClick={() => setExpanded(previous => ({ ...previous, [category]: !open }))} className="rounded-md p-2 text-slate-400 hover:text-sky-600">
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
            </button>
            <Link to={knowledgeCategoryPath(category)} onClick={onNavigate} className={`min-w-0 flex-1 break-words py-2 text-xs font-semibold ${category === currentArticle?.category ? 'text-sky-700 dark:text-sky-400' : 'text-slate-600 dark:text-slate-300'}`}>
              {label(category)}
            </Link>
            <span className="pr-3 text-[10px] tabular-nums text-slate-400">{categoryArticles.length}</span>
          </div>
          {open && <div className="mb-2 ml-3 border-l border-slate-200 pl-2 dark:border-slate-800">
            {visibleArticles.length ? visibleArticles.map(article => <Link key={article.id} to={`/knowledge/${encodeURIComponent(article.id)}`} onClick={onNavigate} aria-current={article.id === currentArticle?.id ? 'page' : undefined} className={`my-0.5 flex items-start gap-2 rounded-md px-2.5 py-2 text-xs leading-5 transition-colors ${article.id === currentArticle?.id ? 'bg-sky-50 font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'}`}>
              <FileText className="mt-1 h-3 w-3 shrink-0 opacity-60" /><span className="min-w-0 break-words">{article.title}</span>
            </Link>) : <p className="px-2.5 py-2 text-xs text-slate-400">{t('No documents yet', '暂无文档')}</p>}
          </div>}
        </section>;
      })}
      {normalizedQuery && !articles.some(article => `${label(article.category)} ${article.title} ${article.tags.join(' ')}`.toLocaleLowerCase().includes(normalizedQuery)) && !categories.some(category => label(category).toLocaleLowerCase().includes(normalizedQuery)) && <p className="px-3 py-6 text-xs text-slate-500">{t('No matching documents.', '没有匹配的文档。')}</p>}
    </div>
    <div className="flex gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
      <button onClick={onImport} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"><Upload className="h-3.5 w-3.5" />{t('Import', '导入')}</button>
      <button onClick={onCreate} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950"><Plus className="h-3.5 w-3.5" />{t('New article', '新建文章')}</button>
    </div>
  </nav>;
}
