import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Navbar } from '../components/layout/Navbar';
import { CommandPalette } from '../components/common/CommandPalette';
import { useAuth } from '../app/AuthProvider';
import { useData } from '../app/DataProvider';
import { pathFor } from '../app/navigation';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../components/common/Toast';

export function AppLayout() {
  const { user, signIn, signOut } = useAuth();
  const { data, loading, error, refresh, reset } = useData();
  const { isDark, toggleTheme } = useTheme(user?.uid || 'guest');
  const { showToast } = useToast();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const view = location.pathname.split('/')[1] || 'dashboard';
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(open => !open); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return <div className="h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex transition-colors duration-150">
    <Sidebar currentView={view} onNavigate={v => navigate(pathFor(v))} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} reviewDueCount={data.questions.filter(q => !q.nextReviewAt || new Date(q.nextReviewAt) <= new Date()).length} activeInterviewsCount={data.interviews.filter(i => i.result === 'Scheduled').length} masteredCount={data.questions.filter(q => q.masteryLevel === 'Mastered').length} totalQuestions={data.questions.length} />
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Navbar currentView={view} onOpenCommandPalette={() => setSearchOpen(true)} currentUser={user} onSignIn={signIn} onSignOut={signOut} isDark={isDark} onToggleTheme={toggleTheme} onQuickAdd={type => navigate(`/${{ article: 'knowledge', question: 'questions', application: 'applications', interview: 'interviews' }[type]}?new=1`)} />
      <div className="px-6 py-1.5 text-xs border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
        {user ? 'Cloud workspace · Changes are saved to your account' : 'Guest workspace · Saved in this browser · Starter study materials, your own progress'}
      </div>
      <main id="main-content" className="flex-1 min-h-0 overflow-y-auto">
        {loading ? <div role="status" className="p-12 text-center">Loading your workspace…</div> : error ? <div role="alert" className="p-10 space-y-4"><p>Could not load your workspace: {error}</p><button className="px-4 py-2 rounded-lg bg-sky-600 text-white" onClick={() => void refresh()}>Retry</button>{!user && <button className="ml-3 underline" onClick={() => { if (confirm('Replace this guest workspace with starter study materials? Export any recoverable data first.')) void reset().catch(cause => showToast(cause.message || 'Reset failed.', 'error')); }}>Reset local demo data</button>}</div> : <Outlet />}
      </main>
    </div>
    <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} {...data} onNavigate={(v, id) => navigate(pathFor(v, id))} />
  </div>;
}
