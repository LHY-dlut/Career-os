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

const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Daily review queue, upcoming interviews & pipeline' },
  knowledge: { title: 'Knowledge Base', subtitle: 'Core LLM, Transformer, RAG & Agent system theory' },
  questions: { title: 'Question Bank', subtitle: 'Curated technical interview questions & 30s answers' },
  review: { title: 'Spaced Review', subtitle: 'Anki-style spaced repetition flashcard training' },
  coding: { title: 'Coding Lab', subtitle: 'From-scratch model algorithms & data structures' },
  applications: { title: 'Job Applications CRM', subtitle: 'Recruitment pipeline & status tracking' },
  interviews: { title: 'Interviews & Retrospective', subtitle: 'Interview logs, questions & debriefs' },
  copilot: { title: 'AI Copilot', subtitle: 'Deep technical explanations, answer grading & mock rounds' },
  settings: { title: 'Settings & Data', subtitle: 'Data backup, export, account & preferences' },
};

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
    subtitle: 'AI Algorithm Engineering Operating System',
  };

  return (
    <header className="h-15 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
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
      <div className="flex items-center gap-2.5">
        {/* Cmd + K Global Search Button */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Search OS...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 font-semibold border border-slate-300/60 dark:border-slate-700/60">
            ⌘K
          </kbd>
        </button>

        {/* Quick Add Menu */}
        <div className="relative" ref={quickAddRef}>
          <button
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
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
                  <div className="font-semibold">New Question</div>
                  <div className="text-[10px] text-slate-400">Add to Question Bank</div>
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
                  <div className="font-semibold">New Article</div>
                  <div className="text-[10px] text-slate-400">Add to Knowledge Base</div>
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
                  <div className="font-semibold">New Application</div>
                  <div className="text-[10px] text-slate-400">Track job opportunity</div>
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
                  <div className="font-semibold">New Interview Round</div>
                  <div className="text-[10px] text-slate-400">Log debrief & questions</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Deep Slate Dark Theme'}
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
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
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
                      {currentUser.displayName || 'Engineer'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Cloud Account</span>
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
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 text-xs font-semibold hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
