import { useI18n } from '../../i18n/I18nProvider';
import { NavLink } from 'react-router-dom';
import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  RotateCcw,
  Code2,
  Briefcase,
  CalendarDays,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Terminal,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  reviewDueCount: number;
  activeInterviewsCount: number;
  masteredCount: number;
  totalQuestions: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  collapsed,
  onToggleCollapse,
  reviewDueCount,
  activeInterviewsCount,
  masteredCount,
  totalQuestions,
}) => {
  const { t } = useI18n();
  const navItems = [
    {
      id: 'dashboard',
      label: t("Dashboard", "学习总览"),
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'knowledge',
      label: t("Knowledge Base", "知识库"),
      icon: BookOpen,
      badge: null,
    },
    {
      id: 'questions',
      label: t("Question Bank", "面试题库"),
      icon: HelpCircle,
      badge: totalQuestions > 0 ? `${totalQuestions}` : null,
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60',
    },
    {
      id: 'review',
      label: t("Spaced Review", "间隔复习"),
      icon: RotateCcw,
      badge: reviewDueCount > 0 ? t(`${reviewDueCount} due`, `${reviewDueCount} 待复习`) : null,
      badgeColor: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/80',
    },
    {
      id: 'coding',
      label: t("Coding Lab", "编程练习"),
      icon: Code2,
      badge: null,
    },
    {
      id: 'applications',
      label: t("Applications CRM", "投递管理"),
      icon: Briefcase,
      badge: null,
    },
    {
      id: 'interviews',
      label: t("Interviews & Retro", "面试与复盘"),
      icon: CalendarDays,
      badge: activeInterviewsCount > 0 ? `${activeInterviewsCount}` : null,
      badgeColor: 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80',
    },
    {
      id: 'copilot',
      label: t("AI Copilot", "AI 助手"),
      icon: Sparkles,
      badge: 'AI',
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800/80',
    },
    {
      id: 'settings',
      label: t("Settings & Data", "设置与数据"),
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-all duration-200 z-30 select-none shrink-0 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-15 flex items-center px-4 border-b border-slate-200 dark:border-slate-800 justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
              <Terminal className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                AI Career OS
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{t("Algorithm & LLM Prep", "算法与大模型求职准备")}</span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
            <Terminal className="w-4.5 h-4.5" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={collapsed ? t("Expand sidebar", "展开侧边栏") : t("Collapse sidebar", "收起侧边栏")}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.id}
              to={`/${item.id}`}
              aria-label={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold border border-sky-200/80 dark:border-sky-800/60 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
              } ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                }`}
              />

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                        item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Spaced Mastery Widget at bottom */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 m-2 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800/60 text-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span>{t("Interview Readiness", "面试准备进度")}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
              {totalQuestions > 0 ? Math.round((masteredCount / totalQuestions) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{
                width: `${totalQuestions > 0 ? (masteredCount / totalQuestions) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{t(`${masteredCount} Mastered`, `已掌握 ${masteredCount} 题`)}</span>
            <span>{t(`${totalQuestions} Total`, `共 ${totalQuestions} 题`)}</span>
          </div>
        </div>
      )}
    </aside>
  );
};
