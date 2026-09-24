import { useI18n } from '../../i18n/I18nProvider';
import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Moon,
  Sun,
  Plus,
  BookOpen,
  HelpCircle,
  Briefcase,
  Calendar,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Languages,
} from 'lucide-react';
import type { User } from 'firebase/auth';

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



export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onOpenCommandPalette,
  isDark,
  onToggleTheme,
  currentUser,
  onSignIn,
  onSignOut,
  onQuickAdd,
}) => {
  const { t, language, setLanguage } = useI18n();
  const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: t("Dashboard", "学习总览"), subtitle: t("Daily review queue, upcoming interviews & pipeline", "今日复习、近期面试与投递进度") },
    knowledge: { title: t("Knowledge Base", "知识库"), subtitle: t("Core LLM, Transformer, RAG & Agent system theory", "LLM、Transformer、RAG 与智能体核心知识") },
    questions: { title: t("Question Bank", "面试题库"), subtitle: t("Curated technical interview questions & 30s answers", "技术面试题与 30 秒精简回答") },
    review: { title: t("Spaced Review", "间隔复习"), subtitle: t("Anki-style spaced repetition flashcard training", "通过间隔复习巩固知识") },
    coding: { title: t("Coding Lab", "编程练习"), subtitle: t("From-scratch model algorithms & data structures", "从零实现模型算法与数据结构") },
    applications: { title: t("Job Applications CRM", "投递管理"), subtitle: t("Recruitment pipeline & status tracking", "跟踪求职机会与招聘进度") },
    interviews: { title: t("Interviews & Retrospective", "面试与复盘"), subtitle: t("Interview logs, questions & debriefs", "记录面试过程、问题与复盘") },
    copilot: { title: t("AI Copilot", "AI 助手"), subtitle: t("Deep technical explanations, answer grading & mock rounds", "技术讲解、回答点评与模拟面试") },
    settings: { title: t("Settings & Data", "设置与数据"), subtitle: t("Data backup, export, account & preferences", "数据备份、导出、账号与偏好设置") },
  };
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) {
        setQuickAddOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentInfo = VIEW_TITLES[currentView] || {
    title: 'AI Career OS',
    subtitle: t("AI Algorithm Engineering Operating System", "AI 算法学习与求职工作台"),
  };

  return (
    <header className="min-h-15 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 py-2 flex flex-wrap sm:flex-nowrap gap-2 items-center justify-between sticky top-0 z-20 transition-colors">
      {/* Title & Subtitle */}
      <div className="flex flex-col">
        <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {currentInfo.title}
        </h1>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
          {currentInfo.subtitle}
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <button
          type="button"
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          aria-label={t('Switch to Chinese', '切换为英文')}
          title={t('Switch to Chinese', '切换为英文')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Languages className="w-4 h-4" aria-hidden="true" />
          <span>{language === 'zh' ? 'English' : '中文'}</span>
        </button>
        {/* Cmd + K Global Search Button */}
        <button
          aria-label={t("Search workspace", "搜索工作区")}
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">{t("Search OS...", "搜索…")}</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 font-semibold border border-slate-300/60 dark:border-slate-700/60">
            ⌘K
          </kbd>
        </button>

        {/* Quick Add Menu */}
        <div className="relative" ref={quickAddRef}>
          <button
            aria-label={t("Add record", "新增记录")}
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("Add", "新增")}</span>
          </button>

          {quickAddOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  onQuickAdd('question');
                  setQuickAddOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <div className="font-semibold">{t("New Question", "新建问题")}</div>
                  <div className="text-[10px] text-slate-400">{t("Add to Question Bank", "添加到题库")}</div>
                </div>
              </button>
              <button
                onClick={() => {
                  onQuickAdd('article');
                  setQuickAddOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
              >
                <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
                <div>
                  <div className="font-semibold">{t("New Article", "新建文章")}</div>
                  <div className="text-[10px] text-slate-400">{t("Add to Knowledge Base", "添加到知识库")}</div>
                </div>
              </button>
              <button
                onClick={() => {
                  onQuickAdd('application');
                  setQuickAddOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
              >
                <Briefcase className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <div className="font-semibold">{t("New Application", "新建投递")}</div>
                  <div className="text-[10px] text-slate-400">{t("Track job opportunity", "记录求职机会")}</div>
                </div>
              </button>
              <button
                onClick={() => {
                  onQuickAdd('interview');
                  setQuickAddOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
              >
                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <div className="font-semibold">{t("New Interview Round", "新建面试轮次")}</div>
                  <div className="text-[10px] text-slate-400">{t("Log debrief & questions", "记录复盘与面试问题")}</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          title={isDark ? t("Switch to Light Theme", "切换浅色主题") : t("Switch to Deep Slate Dark Theme", "切换深色主题")}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 animate-in spin-in-90 duration-200" />
          )}
        </button>

        {/* User Auth Profile */}
        <div className="relative" ref={userMenuRef}>
          {currentUser ? (
            <div>
              <button
                aria-label={t("Account menu", "账号菜单")}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || t("User", "用户")}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-semibold">
                    {currentUser.displayName?.[0] || currentUser.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {currentUser.displayName || t("Engineer", "工程师")}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{t("Cloud Account", "云端账号")}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onSignOut();
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-left font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t("Sign Out", "退出登录")}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              aria-label={t("Sign In", "登录")}
              onClick={onSignIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 text-xs font-semibold hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("Sign In", "登录")}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
