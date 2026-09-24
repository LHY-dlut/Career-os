import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider, useAuth } from './app/AuthProvider';
import { DataProvider } from './app/DataProvider';
import { AppRoutes } from './app/AppRoutes';

function Workspace() {
  const { user, loading } = useAuth();
  if (loading) return <div role="status" className="p-12">Restoring your session…</div>;
  return <DataProvider key={user?.uid || 'guest'} uid={user?.uid || null}><AppRoutes /></DataProvider>;
}
export default function App() {
  return <ErrorBoundary><ToastProvider><AuthProvider><BrowserRouter><Workspace /></BrowserRouter></AuthProvider></ToastProvider></ErrorBoundary>;
}
