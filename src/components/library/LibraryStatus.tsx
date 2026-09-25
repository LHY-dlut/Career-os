import type { LibraryResource } from '../../content/library/types';
import { useI18n } from '../../i18n/I18nProvider';
import { getContentStatus } from '../../services/libraryCourses';

export function LibraryStatus({ resource }: { resource: LibraryResource }) {
  const { t } = useI18n();
  const status = getContentStatus(resource);
  const labels = {
    complete: t('Full article', '完整文章'), outline: t('Upstream outline', '上游提纲'), external: t('Original-site link', '原文链接'),
    'original-complete': t('Career OS tutorial', '本站补充教程'), 'original-draft': t('Career OS draft', '本站草稿'), 'file-error': t('File unavailable', '文件异常'),
  };
  return <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status === 'outline' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' : status === 'external' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : status === 'file-error' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' : status === 'original-complete' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>{labels[status]}</span>;
}
