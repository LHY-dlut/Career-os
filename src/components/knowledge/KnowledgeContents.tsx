import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { extractHeadings } from '../../utils/markdownHeadings';

interface KnowledgeContentsProps {
  articleId: string;
  headings: ReturnType<typeof extractHeadings>;
  activeHeading: string;
  onSelect: (id: string) => void;
}

export function KnowledgeContents({ articleId, headings, activeHeading, onSelect }: KnowledgeContentsProps) {
  const { t } = useI18n();
  return <nav aria-label={t('On this page', '本文目录')} className="text-xs">
    <p className="mb-4 font-semibold text-slate-900 dark:text-slate-200">{t('On this page', '本文目录')}</p>
    {headings.length ? <div className="space-y-1 border-l border-slate-200 dark:border-slate-800">
      {headings.map(heading => <Link key={heading.id} to={`/knowledge/${encodeURIComponent(articleId)}#${encodeURIComponent(heading.id)}`} onClick={() => onSelect(heading.id)} aria-current={heading.id === activeHeading ? 'location' : undefined} className={`-ml-px block break-words border-l-2 py-1.5 pr-1 leading-5 transition-colors ${heading.id === activeHeading ? 'border-sky-500 font-medium text-sky-700 dark:text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'} ${heading.level <= 1 ? 'pl-3' : heading.level === 2 ? 'pl-5' : 'pl-7'}`}>
        {heading.text}
      </Link>)}
    </div> : <p className="leading-5 text-slate-400">{t('This article has no section headings.', '这篇文章尚未添加章节标题。')}</p>}
  </nav>;
}
