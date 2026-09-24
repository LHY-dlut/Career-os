import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider, useAuth } from './app/AuthProvider';
import { DataProvider } from './app/DataProvider';
import { AppRoutes } from './app/AppRoutes';
import { I18nProvider, useI18n } from './i18n/I18nProvider';

function Workspace() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  if (loading) return <div role="status" className="p-12">{t('Restoring your session…', '正在恢复登录状态…')}</div>;
  return <DataProvider key={user?.uid || 'guest'} uid={user?.uid || null}><AppRoutes /></DataProvider>;
}
export default function App() {
  return <I18nProvider><ErrorBoundary><ToastProvider><AuthProvider><BrowserRouter><Workspace /></BrowserRouter></AuthProvider></ToastProvider></ErrorBoundary></I18nProvider>;
}
