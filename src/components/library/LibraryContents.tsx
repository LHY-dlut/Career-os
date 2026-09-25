import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { libraryPath } from '../../services/learningLibrary';
import type { extractHeadings } from '../../utils/markdownHeadings';

interface Props {
  resourceId: string;
  search: string;
  headings: ReturnType<typeof extractHeadings>;
  activeHeading: string;
  onSelect: (id: string) => void;
}

export function LibraryContents({ resourceId, search, headings, activeHeading, onSelect }: Props) {
  const { t } = useI18n();
  const groups: { heading: Props['headings'][number] | null; children: Props['headings'] }[] = [];
  for (const heading of headings) {
    if (heading.level <= 3) groups.push({ heading, children: [] });
    else {
      if (!groups.length) groups.push({ heading: null, children: [] });
      groups[groups.length - 1].children.push(heading);
    }
  }
  const entry = (heading: Props['headings'][number]) => <Link key={heading.id} to={`${libraryPath(resourceId)}${search}#${encodeURIComponent(heading.id)}`} onClick={() => onSelect(heading.id)} aria-current={heading.id === activeHeading ? 'location' : undefined} className={`-ml-px block break-words border-l-2 py-1.5 pr-2 leading-5 ${heading.level <= 2 ? 'pl-3' : 'pl-6'} ${activeHeading === heading.id ? 'border-indigo-500 font-semibold text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-indigo-600 dark:text-slate-400'}`}>{heading.text}</Link>;
  return <nav aria-label={t('Article contents', '资料章节目录')} className="text-xs">
    <p className="mb-4 font-semibold text-slate-800 dark:text-slate-200">{t('On this page', '本文目录')}</p>
    {headings.length ? <div className="border-l border-slate-200 dark:border-slate-800">
      {groups.map((group, index) => <div key={group.heading?.id || `details-${index}`}>{group.heading && entry(group.heading)}{group.children.length > 0 && <details className="ml-3" open={group.children.some(heading => heading.id === activeHeading)}><summary className="cursor-pointer py-1.5 pl-3 text-[10px] text-slate-400">{t(`${group.children.length} deeper sections`, `${group.children.length} 个详细小节`)}</summary>{group.children.map(entry)}</details>}</div>)}
    </div> : <p className="leading-6 text-slate-400">{t('No section headings in this resource.', '这篇资料没有章节标题。')}</p>}
  </nav>;
}
