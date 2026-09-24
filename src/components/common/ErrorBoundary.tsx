import { Component, type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
function ErrorFallback() {
  const { t } = useI18n();
  return <div role="alert" className="p-12"><h1>{t('Something went wrong.', '页面出现了问题。')}</h1><p>{t('Your saved data has not been reset.', '已保存的数据未被重置。')}</p><button onClick={() => window.location.reload()}>{t('Reload workspace', '重新加载工作区')}</button></div>;
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}
