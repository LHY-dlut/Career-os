import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Search, Moon, Sun, Plus, BookOpen, HelpCircle, Briefcase, Calendar, LogIn, LogOut, Languages, Menu, X, Settings, ChevronDown, ArrowUpRight } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useI18n } from '../../i18n/I18nProvider';
import { Dialog } from '../common/Dialog';

interface NavbarProps {
  currentView: string;
  onOpenCommandPalette: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  currentUser: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onQuickAdd: (type: 'article' | 'question' | 'application' | 'interview') => void;
}

export function Navbar({ currentView, onOpenCommandPalette, isDark, onToggleTheme, currentUser, onSignIn, onSignOut, onQuickAdd }: NavbarProps) {
  const { t, language, setLanguage } = useI18n();
  const [menu, setMenu] = useState<'career' | 'add' | 'account' | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const links = [
    { view: 'dashboard', title: t('Dashboard', '学习总览') },
    { view: 'library', title: t('Library', '学习资料') },
    { view: 'knowledge', title: t('Knowledge', '知识库') },
    { view: 'questions', title: t('Questions', '面试题库') },
    { view: 'coding', title: t('Coding', '编程练习') },
    { view: 'review', title: t('Review', '间隔复习') },
    { view: 'copilot', title: t('AI Copilot', 'AI 助手') },
  ];
  const careerLinks = [{ view: 'applications', title: t('Applications', '投递管理'), icon: Briefcase }, { view: 'interviews', title: t('Interviews', '面试与复盘'), icon: Calendar }];
  const addItems = [
    { type: 'article' as const, title: t('New Article', '新建文章'), icon: BookOpen },
    { type: 'question' as const, title: t('New Question', '新建问题'), icon: HelpCircle },
    { type: 'application' as const, title: t('New Application', '新建投递'), icon: Briefcase },
    { type: 'interview' as const, title: t('New Interview Round', '新建面试轮次'), icon: Calendar },
  ];
  useEffect(() => { setMenu(null); setMobileOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    const dismiss = (event: MouseEvent) => { if (!headerRef.current?.contains(event.target as Node)) setMenu(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(null); };
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', dismiss); document.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);
  const iconButton = 'grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors';
  const dropdown = 'absolute right-0 top-full mt-3 min-w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900';
  const dropdownItem = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800';
  const openSearch = () => { setMobileOpen(false); onOpenCommandPalette(); };

  return <>
    <header ref={headerRef} className="z-40 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-2 px-3 sm:px-6 lg:h-[72px] lg:px-8">
        <Link to="/dashboard" aria-label={t('AI Career OS home', 'AI Career OS 首页')} className="shrink-0 text-base font-extrabold tracking-tight sm:text-xl">
          <span className="bg-gradient-to-r from-blue-600 to-violet-500 bg-clip-text text-transparent dark:from-sky-400 dark:to-violet-400">AI Career OS</span>
        </Link>
        <nav aria-label={t('Main navigation', '主导航')} className="hidden items-center gap-0.5 xl:flex">
          {links.map(item => <NavLink key={item.view} to={`/${item.view}`} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'}`}>{item.title}</NavLink>)}
          <div className="relative">
            <button aria-expanded={menu === 'career'} aria-controls="career-navigation" onClick={() => setMenu(menu === 'career' ? null : 'career')} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-medium ${['applications', 'interviews'].includes(currentView) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>{t('Career', '求职管理')}<ChevronDown className="size-3.5" /></button>
            {menu === 'career' && <div id="career-navigation" className={dropdown}>{careerLinks.map(item => <NavLink className={dropdownItem} to={`/${item.view}`} key={item.view} onClick={() => setMenu(null)}><item.icon className="size-4" />{item.title}</NavLink>)}</div>}
          </div>
        </nav>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')} aria-label={t('Switch to Chinese', '切换为英文')} title={t('Switch to Chinese', '切换为英文')} className="flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"><Languages className="hidden size-4 sm:block" /><span>{language === 'zh' ? 'English' : '中文'}</span></button>
          <button onClick={openSearch} aria-label={t('Search workspace', '搜索工作区')} title={t('Search workspace (Ctrl / ⌘ K)', '搜索工作区（Ctrl / ⌘ K）')} className={iconButton}><Search className="size-[18px]" /></button>
          <button onClick={onToggleTheme} aria-label={isDark ? t('Switch to Light Theme', '切换浅色主题') : t('Switch to Dark Theme', '切换深色主题')} className={iconButton}>{isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}</button>
          <div className="relative hidden sm:block">
            <button onClick={() => setMenu(menu === 'add' ? null : 'add')} aria-label={t('Add record', '新增记录')} aria-expanded={menu === 'add'} aria-controls="quick-add" className={iconButton}><Plus className="size-[18px]" /></button>
            {menu === 'add' && <div id="quick-add" className={dropdown}>{addItems.map(item => <button key={item.type} className={dropdownItem} onClick={() => { setMenu(null); onQuickAdd(item.type); }}><item.icon className="size-4" />{item.title}</button>)}</div>}
          </div>
          <Link to="/settings" aria-label={t('Settings & Data', '设置与数据')} className={`hidden sm:grid ${iconButton}`}><Settings className="size-[18px]" /></Link>
          <div className="relative hidden sm:block">
            {currentUser ? <>
              <button onClick={() => setMenu(menu === 'account' ? null : 'account')} aria-label={t('Account menu', '账号菜单')} aria-expanded={menu === 'account'} className={iconButton}><span className="grid size-7 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950">{currentUser.displayName?.[0] || 'U'}</span></button>
              {menu === 'account' && <div className={dropdown}><div className="max-w-64 border-b border-slate-100 px-3 py-2 dark:border-slate-800"><p className="truncate text-sm font-semibold">{currentUser.displayName || t('Signed-in User', '已登录用户')}</p><p className="truncate text-xs text-slate-500">{currentUser.email}</p></div><button onClick={() => { setMenu(null); onSignOut(); }} className={dropdownItem}><LogOut className="size-4" />{t('Sign Out', '退出登录')}</button></div>}
            </> : <button onClick={onSignIn} aria-label={t('Sign In', '登录')} className={iconButton}><LogIn className="size-[18px]" /></button>}
          </div>
          <button onClick={() => { setMenu(null); setMobileOpen(true); }} aria-label={t('Open navigation', '打开导航')} aria-expanded={mobileOpen} className={`${iconButton} xl:hidden`}><Menu className="size-5" /></button>
        </div>
      </div>
    </header>
    {mobileOpen && <Dialog onClose={() => setMobileOpen(false)} aria-label={t('Navigation menu', '导航菜单')} className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget) setMobileOpen(false); }}>
      <div className="h-full w-80 max-w-[88vw] overflow-y-auto overscroll-contain border-l border-slate-200 bg-white px-5 py-4 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-5 flex items-center justify-between"><span className="font-bold">AI Career OS</span><button aria-label={t('Close navigation', '关闭导航')} className={iconButton} onClick={() => setMobileOpen(false)}><X className="size-5" /></button></div>
        <nav aria-label={t('Mobile navigation', '移动导航')} className="space-y-1">{[...links, ...careerLinks, { view: 'settings', title: t('Settings & Data', '设置与数据') }].map(item => <NavLink key={item.view} to={`/${item.view}`} onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center justify-between rounded-xl px-3 py-3 text-sm ${isActive ? 'bg-blue-50 font-semibold text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'}`}>{item.title}<ArrowUpRight className="size-4 opacity-40" /></NavLink>)}</nav>
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800"><p className="mb-2 px-3 text-xs font-semibold text-slate-400">{t('QUICK ADD', '快速新增')}</p>{addItems.map(item => <button key={item.type} className={dropdownItem} onClick={() => { setMobileOpen(false); onQuickAdd(item.type); }}><item.icon className="size-4" />{item.title}</button>)}</div>
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800"><p className="px-3 pb-2 text-xs text-slate-400">{currentUser ? currentUser.displayName || currentUser.email : t('Guest workspace · This browser', '访客工作区 · 当前浏览器')}</p><button className={dropdownItem} onClick={() => { setMobileOpen(false); currentUser ? onSignOut() : onSignIn(); }}>{currentUser ? <LogOut className="size-4" /> : <LogIn className="size-4" />}{currentUser ? t('Sign Out', '退出登录') : t('Sign In with Google', '使用 Google 登录')}</button></div>
      </div>
    </Dialog>}
  </>;
}
