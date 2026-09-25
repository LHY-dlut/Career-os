import { useI18n } from '../i18n/I18nProvider';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { CommandPalette } from '../components/common/CommandPalette';
import { useAuth } from '../app/AuthProvider';
import { useData } from '../app/DataProvider';
import { pathFor } from '../app/navigation';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../components/common/Toast';

export function AppLayout() {
  const { t, label, translateMessage } = useI18n();
  const { user, signIn, signOut } = useAuth();
  const { data, loading, error, refresh, reset } = useData();
  const { isDark, toggleTheme } = useTheme(user?.uid || 'guest');
  const { showToast } = useToast();
  const [searchOpen, setSearchOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const view = location.pathname.split('/')[1] || 'dashboard';
  const isGuide = view === 'dashboard' || view === 'knowledge';
  const pageTitles: Record<string, string> = { questions: 'Question Bank', review: 'Spaced Review', coding: 'Coding Lab', applications: 'Applications CRM', interviews: 'Interviews & Retro', copilot: 'AI Copilot', settings: 'Settings & Data' };
  useEffect(() => { if (!location.hash) mainRef.current?.scrollTo?.(0, 0); }, [location.pathname, location.search]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(open => !open); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return <div className="h-dvh bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white">{t('Skip to main content', '跳到主要内容')}</a>
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Navbar currentView={view} onOpenCommandPalette={() => setSearchOpen(true)} currentUser={user} onSignIn={signIn} onSignOut={signOut} isDark={isDark} onToggleTheme={toggleTheme} onQuickAdd={type => navigate(`/${{ article: 'knowledge', question: 'questions', application: 'applications', interview: 'interviews' }[type]}?new=1`)} />
      <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-4 py-1.5 text-center text-[11px] text-slate-500 dark:border-slate-800/70 dark:bg-slate-900/40 dark:text-slate-400">
        {user ? t('Cloud workspace · Saved to your account', '云端工作区 · 数据保存到你的账号') : t('Guest workspace · Saved in this browser', '访客工作区 · 数据保存在当前浏览器')}
      </div>
      {!isGuide && <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950"><div className="mx-auto max-w-7xl"><h1 className="text-lg font-bold">{pageTitles[view] ? label(pageTitles[view]) : t('Page not found', '页面不存在')}</h1></div></div>}
      <main ref={mainRef} id="main-content" tabIndex={-1} className={`flex-1 min-h-0 overflow-y-auto ${isGuide ? 'bg-white dark:bg-[#090d16]' : 'bg-slate-50 dark:bg-[#090d16]'}`}>
        {loading ? <div role="status" className="p-12 text-center">{t("Loading your workspace…", "正在加载工作区…")}</div> : error ? <div role="alert" className="p-10 space-y-4"><p>{t('Could not load your workspace: ', '无法加载工作区：')}{translateMessage(error)}</p><button className="px-4 py-2 rounded-lg bg-sky-600 text-white" onClick={() => void refresh()}>{t("Retry", "重试")}</button>{!user && <button className="ml-3 underline" onClick={() => { if (confirm(t("Replace this guest workspace with starter study materials? Export any recoverable data first.", "用入门学习资料替换此访客工作区？请先导出仍可恢复的数据。"))) void reset().catch(cause => showToast(cause.message || t("Reset failed.", "重置失败。"), 'error')); }}>{t('Reset local demo data', '重置本地示例数据')}</button>}</div> : <Outlet />}
      </main>
    </div>
    <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} {...data} onNavigate={(v, id) => navigate(pathFor(v, id))} />
  </div>;
}
