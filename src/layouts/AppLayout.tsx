import { useI18n } from '../i18n/I18nProvider';
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
  const { t, translateMessage } = useI18n();
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
        {user ? t("Cloud workspace · Changes are saved to your account", "云端工作区 · 修改保存到你的账号") : t("Guest workspace · Saved in this browser · Starter study materials, your own progress", "访客工作区 · 数据保存在此浏览器 · 从入门资料开始积累自己的进度")}
      </div>
      <main id="main-content" className="flex-1 min-h-0 overflow-y-auto">
        {loading ? <div role="status" className="p-12 text-center">{t("Loading your workspace…", "正在加载工作区…")}</div> : error ? <div role="alert" className="p-10 space-y-4"><p>{t('Could not load your workspace: ', '无法加载工作区：')}{translateMessage(error)}</p><button className="px-4 py-2 rounded-lg bg-sky-600 text-white" onClick={() => void refresh()}>{t("Retry", "重试")}</button>{!user && <button className="ml-3 underline" onClick={() => { if (confirm(t("Replace this guest workspace with starter study materials? Export any recoverable data first.", "用入门学习资料替换此访客工作区？请先导出仍可恢复的数据。"))) void reset().catch(cause => showToast(cause.message || t("Reset failed.", "重置失败。"), 'error')); }}>{t('Reset local demo data', '重置本地示例数据')}</button>}</div> : <Outlet />}
      </main>
    </div>
    <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} {...data} onNavigate={(v, id) => navigate(pathFor(v, id))} />
  </div>;
}
