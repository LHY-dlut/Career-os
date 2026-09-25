import { useI18n } from '../../i18n/I18nProvider';
import { Dialog } from './Dialog';
import { filterLibrary } from '../../services/learningLibrary';
import { getLibraryResourceTitle } from '../../services/libraryLanguage';
import { localizeStarterArticle } from '../../services/starterArticleLocalization';
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  HelpCircle,
  Code2,
  Briefcase,
  Calendar,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import type {
  KnowledgeArticle,
  Question,
  CodingProblem,
  Application,
  Interview,
} from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  articles: KnowledgeArticle[];
  questions: Question[];
  codingProblems: CodingProblem[];
  applications: Application[];
  interviews: Interview[];
  onNavigate: (view: string, id?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  articles,
  questions,
  codingProblems,
  applications,
  interviews,
  onNavigate,
}) => {
  const { t, label, language } = useI18n();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();
  const filteredLibrary = cleanQuery ? filterLibrary(query, '', '', language).slice(0, 4).map(resource => ({ ...resource, title: getLibraryResourceTitle(resource, language) })) : [];

  const filteredArticles = articles
    .map(article => localizeStarterArticle(article, language))
    .filter(
      (a) =>
        a.title.toLowerCase().includes(cleanQuery) ||
        a.category.toLowerCase().includes(cleanQuery) || label(a.category).toLowerCase().includes(cleanQuery) ||
        a.tags.some((t) => t.toLowerCase().includes(cleanQuery))
    )
    .slice(0, 4);

  const filteredQuestions = questions
    .filter(
      (q) =>
        q.title.toLowerCase().includes(cleanQuery) ||
        q.category.toLowerCase().includes(cleanQuery) || label(q.category).toLowerCase().includes(cleanQuery) ||
        q.tags.some((t) => t.toLowerCase().includes(cleanQuery))
    )
    .slice(0, 4);

  const filteredCoding = codingProblems
    .filter(
      (p) =>
        p.title.toLowerCase().includes(cleanQuery) ||
        p.category.toLowerCase().includes(cleanQuery) || label(p.category).toLowerCase().includes(cleanQuery)
    )
    .slice(0, 3);

  const filteredApps = applications
    .filter(
      (app) =>
        app.company.toLowerCase().includes(cleanQuery) ||
        app.position.toLowerCase().includes(cleanQuery)
    )
    .slice(0, 3);

  const filteredInterviews = interviews.filter(i => `${i.companyName} ${i.position} ${i.roundName}`.toLowerCase().includes(cleanQuery)).slice(0, 3);

  const hasResults =
    filteredLibrary.length > 0 || filteredArticles.length > 0 ||
    filteredQuestions.length > 0 ||
    filteredCoding.length > 0 ||
    filteredApps.length > 0 || filteredInterviews.length > 0;

  return (
    <Dialog onClose={() => onClose()} aria-label={t("Search workspace", "搜索工作区")} className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
          <Search className="w-5 h-5 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search knowledge articles, questions, coding, CRM...", "搜索知识、题目、编程与投递…")}
            aria-label={t("Search workspace", "搜索工作区")}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                const result = filteredLibrary[0] ? ['library', filteredLibrary[0].id] : filteredArticles[0] ? ['knowledge', filteredArticles[0].id] : filteredQuestions[0] ? ['questions', filteredQuestions[0].id] : filteredCoding[0] ? ['coding', filteredCoding[0].id] : filteredApps[0] ? ['applications', filteredApps[0].id] : filteredInterviews[0] ? ['interviews', filteredInterviews[0].id] : null;
                if (result) { onNavigate(result[0], result[1]); onClose(); }
              }
            }}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder-zinc-400"
          />
          <button aria-label={t("Close", "关闭")}
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          ><X className="w-4 h-4" /></button>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {!cleanQuery && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2">{t("Quick Navigation", "快速导航")}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: t("Today Dashboard", "今日总览"), icon: Sparkles, view: 'dashboard' },
                  { label: t('Learning Library', '学习资料库'), icon: BookOpen, view: 'library' },
                  { label: t("Knowledge Base", "知识库"), icon: BookOpen, view: 'knowledge' },
                  { label: t("Question Bank", "面试题库"), icon: HelpCircle, view: 'questions' },
                  { label: t("Spaced Review", "间隔复习"), icon: Sparkles, view: 'review' },
                  { label: t("Coding Lab", "编程练习"), icon: Code2, view: 'coding' },
                  { label: t("Applications CRM", "投递管理"), icon: Briefcase, view: 'applications' },
                ].map((item) => (
                  <button
                    key={item.view}
                    onClick={() => {
                      onNavigate(item.view);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-left"
                  >
                    <item.icon className="w-4 h-4 text-indigo-500" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {cleanQuery && !hasResults && (
            <div className="py-8 text-center text-sm text-zinc-500">
              {t(`No matching records found for "${query}".`, `未找到与“${query}”匹配的记录。`)}
            </div>
          )}

          {/* Articles Section */}
          {filteredLibrary.length > 0 && <section aria-label={t('Learning library results', '学习资料搜索结果')}><h3 className="mb-1 px-2 text-[11px] font-semibold text-zinc-400">{t('Learning library', '学习资料库')}</h3>{filteredLibrary.map(resource => <button key={resource.id} onClick={() => { onNavigate('library', resource.id); onClose(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30"><BookOpen className="size-4 shrink-0 text-indigo-500" /><span className="min-w-0 flex-1 truncate">{resource.title}</span><span className="shrink-0 text-[10px] text-zinc-400">{resource.kind === 'article' ? t('Collected', '站内教程') : t('Original site', '原文导航')}</span></button>)}</section>}
          {filteredArticles.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 mb-1">
                {t(`Knowledge Articles (${filteredArticles.length})`, `知识文章（${filteredArticles.length}）`)}
              </div>
              <div className="space-y-1">
                {filteredArticles.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => {
                      onNavigate('knowledge', art.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {art.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                        {label(art.category)}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Questions Section */}
          {filteredQuestions.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 mb-1">
                {t(`Question Bank (${filteredQuestions.length})`, `面试题库（${filteredQuestions.length}）`)}
              </div>
              <div className="space-y-1">
                {filteredQuestions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      onNavigate('questions', q.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {q.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
                        {label(q.difficulty)}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Coding Section */}
          {filteredCoding.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 mb-1">
                {t(`Coding Problems (${filteredCoding.length})`, `编程题（${filteredCoding.length}）`)}
              </div>
              <div className="space-y-1">
                {filteredCoding.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onNavigate('coding', p.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Code2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {p.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                        {label(p.category)}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Applications Section */}
          {filteredApps.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 mb-1">
                {t(`Job Applications (${filteredApps.length})`, `投递记录（${filteredApps.length}）`)}
              </div>
              <div className="space-y-1">
                {filteredApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      onNavigate('applications', app.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Briefcase className="w-4 h-4 text-purple-500 shrink-0" />
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {app.company} – {app.position}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 shrink-0">
                        {label(app.status)}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {filteredInterviews.length > 0 && <section className="px-5 py-3 text-xs border-t border-zinc-200 dark:border-zinc-800"><h3 className="text-zinc-400 uppercase mb-2">{t("Interviews", "面试记录")}</h3>{filteredInterviews.map(interview => <button key={interview.id} className="block w-full text-left rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => { onNavigate('interviews', interview.id); onClose(); }}>{interview.companyName} · {interview.roundName}</button>)}</section>}
        {/* Footer info */}
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>{t("Navigate with mouse or enter", "使用鼠标或回车打开")}</span>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px]">
              ESC
            </kbd>
            <span>{t("to close", "关闭")}</span>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
