import { useI18n } from '../../i18n/I18nProvider';

export type LibraryLanguagePreference = '' | 'zh' | 'en' | 'all';

export function LibraryLanguageSelect({ value, onChange }: { value: LibraryLanguagePreference; onChange: (value: LibraryLanguagePreference) => void }) {
  const { t } = useI18n();
  return <label className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
    <span className="shrink-0">{t('Resource language', '资料语言')}</span>
    <select aria-label={t('Resource language', '资料语言')} value={value} onChange={event => onChange(event.target.value as LibraryLanguagePreference)} className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs dark:border-slate-800 dark:bg-slate-900">
      <option value="">{t('Follow interface', '跟随界面')}</option>
      <option value="zh">{t('Chinese', '中文')}</option>
      <option value="en">{t('English', '英文')}</option>
      <option value="all">{t('All versions', '全部版本')}</option>
    </select>
  </label>;
}
