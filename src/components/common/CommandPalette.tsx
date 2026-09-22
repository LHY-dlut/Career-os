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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();

  const filteredArticles = articles
    .filter(
      (a) =>
        a.title.toLowerCase().includes(cleanQuery) ||
        a.category.toLowerCase().includes(cleanQuery) ||
        a.tags.some((t) => t.toLowerCase().includes(cleanQuery))
    )
    .slice(0, 4);

  const filteredQuestions = questions
    .filter(
      (q) =>
        q.title.toLowerCase().includes(cleanQuery) ||
        q.category.toLowerCase().includes(cleanQuery) ||
        q.tags.some((t) => t.toLowerCase().includes(cleanQuery))
    )
    .slice(0, 4);

  const filteredCoding = codingProblems
    .filter(
      (p) =>
        p.title.toLowerCase().includes(cleanQuery) ||
        p.category.toLowerCase().includes(cleanQuery)
    )
    .slice(0, 3);

  const filteredApps = applications
    .filter(
      (app) =>
        app.company.toLowerCase().includes(cleanQuery) ||
        app.position.toLowerCase().includes(cleanQuery)
    )
    .slice(0, 3);

  const hasResults =
    filteredArticles.length > 0 ||
    filteredQuestions.length > 0 ||
    filteredCoding.length > 0 ||
    filteredApps.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
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
            placeholder="Search knowledge articles, questions, coding, CRM..."
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder-zinc-400"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {!cleanQuery && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2">
                Quick Navigation
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Today Dashboard', icon: Sparkles, view: 'dashboard' },
                  { label: 'Knowledge Base', icon: BookOpen, view: 'knowledge' },
                  { label: 'Question Bank', icon: HelpCircle, view: 'questions' },
                  { label: 'Spaced Review', icon: Sparkles, view: 'review' },
                  { label: 'Coding Lab', icon: Code2, view: 'coding' },
                  { label: 'Applications CRM', icon: Briefcase, view: 'applications' },
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
              No matching records found for "{query}".
            </div>
          )}

          {/* Articles Section */}
          {filteredArticles.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 mb-1">
                Knowledge Articles ({filteredArticles.length})
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
                        {art.category}
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
                Question Bank ({filteredQuestions.length})
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
                        {q.difficulty}
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
                Coding Problems ({filteredCoding.length})
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
                        {p.category}
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
                Job Applications ({filteredApps.length})
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
                        {app.status}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>Navigate with mouse or enter</span>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px]">
              ESC
            </kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
