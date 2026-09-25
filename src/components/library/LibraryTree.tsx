import { BookOpen, ExternalLink, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LibraryResource, LibrarySource } from '../../content/library/types';
import { useI18n } from '../../i18n/I18nProvider';
import { libraryPath } from '../../services/learningLibrary';

interface Props {
  resources: LibraryResource[];
  source: LibrarySource;
  current: LibraryResource;
  search: string;
  onNavigate?: () => void;
}

export function LibraryTree({ resources, source, current, search, onNavigate }: Props) {
  const { t } = useI18n();
  const categories = [...new Set(resources.map(resource => resource.category))];
  return <nav aria-label={t('Source document navigation', '来源文档导航')} className="text-xs">
    <Link onClick={onNavigate} to={`${libraryPath()}${search}`} className="mb-6 flex items-center gap-2 font-medium text-indigo-600 dark:text-indigo-400"><BookOpen className="h-4 w-4" />{t('Back to learning library', '返回学习资料库')}</Link>
    <p className="mb-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">{source.name}</p>
    <p className="mb-5 text-slate-400">{t(`${resources.length} resources`, `${resources.length} 篇资料`)}</p>
    <div className="space-y-3">{categories.map(category => <details key={`${source.id}:${category}`} open={category === current.category ? true : undefined} className="group">
      <summary className="cursor-pointer py-1.5 font-medium leading-5 text-slate-700 dark:text-slate-300">{category}</summary>
      <div className="ml-1 mt-1 space-y-1 border-l border-slate-200 pl-2 dark:border-slate-800">{resources.filter(resource => resource.category === category).map(resource => <Link key={resource.id} to={`${libraryPath(resource.id)}${search}`} onClick={onNavigate} aria-current={resource.id === current.id ? 'page' : undefined} className={`flex items-start gap-2 rounded-lg px-2 py-2 leading-5 ${resource.id === current.id ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'}`}>{resource.kind === 'article' ? <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />}<span className="min-w-0 break-words">{resource.title}</span></Link>)}</div>
    </details>)}</div>
  </nav>;
}
