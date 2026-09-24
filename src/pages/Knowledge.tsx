import { Dialog } from '../components/common/Dialog';
import { extractHeadings } from '../utils/markdownHeadings';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Edit3,
  Trash2,
  Download,
  Upload,
  Sparkles,
  ChevronRight,
  Tag,
  Clock,
  Share2,
  Check,
  FileText,
  X,
  FileDown,
  Layers,
  ChevronDown,
  Globe,
  ExternalLink,
  Loader2,
  Copy,
} from 'lucide-react';
import type { KnowledgeArticle, KnowledgeCategory } from '../types';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { useToast } from '../components/common/Toast';
import { generateId } from '../utils/id';
import {
  serializeArticleToMarkdown,
  downloadMarkdownFile,
} from '../utils/markdownFrontmatter';
import { MarkdownImportModal } from '../components/knowledge/MarkdownImportModal';
import { requestSearchResearch, GroundingSource } from '../services/aiCopilot';
import { useAICapabilities } from '../hooks/useAICapabilities';

interface KnowledgeProps {
  articles: KnowledgeArticle[];
  selectedArticleId?: string;
  onSaveArticle: (article: KnowledgeArticle) => Promise<void>;
  onDeleteArticle: (articleId: string) => Promise<void>;
  onNavigateToCopilot: (content: string, title: string) => void;
  userId: string;
}

const CATEGORIES: KnowledgeCategory[] = [
  '01 Transformer',
  '02 LLM',
  '03 RAG',
  '04 Agent',
  '05 Text-to-SQL',
  '06 Machine Learning',
  '07 Deep Learning',
  '08 NLP',
];

export const Knowledge: React.FC<KnowledgeProps> = ({
  articles,
  selectedArticleId,
  onSaveArticle,
  onDeleteArticle,
  onNavigateToCopilot,
  userId,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { capabilities, canSearch, searchUnavailableReason } = useAICapabilities();
  const activeArticleId = selectedArticleId || articles[0]?.id || '';
  const setActiveArticleId = (id: string) => navigate(`/knowledge/${encodeURIComponent(id)}`);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<KnowledgeArticle>>({});
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Search Grounding Live Research State
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [researchError, setResearchError] = useState('');
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const [researchData, setResearchData] = useState<{
    content: string;
    groundingSources: GroundingSource[];
    webSearchQueries?: string[];
  } | null>(null);

  const handleOpenSearchResearch = async () => {
    if (!currentArticle || !canSearch || isResearchLoading) return;
    setIsResearchModalOpen(true);
    setIsResearchLoading(true);
    setResearchData(null);
    setResearchError('');
    try {
      const data = await requestSearchResearch(currentArticle.title);
      setResearchData(data);
    } catch (err: any) {
      setResearchError(err.message || 'Research could not be loaded.');
      showToast(err.message || 'Error fetching live research', 'error');
    } finally {
      setIsResearchLoading(false);
    }
  };

  // Close export menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter articles based on search query and category
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesSearch =
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        art.summary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || art.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, selectedCategory]);

  const currentArticle = useMemo(() => {
    return (
      articles.find((a) => a.id === activeArticleId) ||
      filteredArticles[0] ||
      articles[0]
    );
  }, [articles, activeArticleId, filteredArticles]);

  const tableOfContents = useMemo(() => extractHeadings(currentArticle?.contentMarkdown || ''), [currentArticle?.contentMarkdown]);
  React.useEffect(() => {
    if (location.hash) {
      try { document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); } catch { /* malformed fragment */ }
    }
  }, [location.hash, currentArticle?.id]);

  // Handle open editor
  const handleOpenEdit = (article?: KnowledgeArticle) => {
    if (article) {
      setEditFormData(article);
    } else {
      setEditFormData({
        title: '',
        category: selectedCategory !== 'all' ? (selectedCategory as KnowledgeCategory) : '01 Transformer',
        subcategory: '',
        tags: ['Interview', 'Theory'],
        summary: '',
        contentMarkdown: '# New Article\n\n## 1. Overview\nExplain core concept with LaTeX math and code blocks...',
      });
    }
    setIsEditing(true);
  };

  // Handle save article
  const handleSave = async () => {
    if (!editFormData.title?.trim()) {
      showToast('Article title is required', 'error');
      return;
    }
    const id = editFormData.id || generateId();
    const articleToSave: KnowledgeArticle = {
      id,
      userId,
      title: editFormData.title || 'Untitled',
      category: editFormData.category || '01 Transformer',
      subcategory: editFormData.subcategory || '',
      tags: editFormData.tags || [],
      summary: editFormData.summary || '',
      contentMarkdown: editFormData.contentMarkdown || '',
      createdAt: editFormData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try { await onSaveArticle(articleToSave); } catch { return; }
    setActiveArticleId(id);
    setIsEditing(false);
    showToast('Knowledge article saved successfully');
  };

  // Export a specific article as markdown file
  const handleExportSingleArticle = (article: KnowledgeArticle) => {
    const markdownWithFrontmatter = serializeArticleToMarkdown(article);
    const safeTitle = article.title
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '_');
    downloadMarkdownFile(`${safeTitle}.md`, markdownWithFrontmatter);
    showToast(`Exported "${article.title}" as Markdown`);
  };

  // Export current active article
  const handleExportCurrentMarkdown = () => {
    if (!currentArticle) return;
    handleExportSingleArticle(currentArticle);
    setExportMenuOpen(false);
  };

  // Export all articles as individual markdown files
  const handleExportAllArticles = async () => {
    if (articles.length === 0) {
      showToast('No articles to export', 'error');
      return;
    }

    setExportMenuOpen(false);
    showToast(`Exporting ${articles.length} individual Markdown files...`);

    for (let i = 0; i < articles.length; i++) {
      const art = articles[i];
      const markdown = serializeArticleToMarkdown(art);
      const safeTitle = art.title
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '_');

      // Slight timeout between downloads to allow browser to handle multiple downloads
      setTimeout(() => {
        downloadMarkdownFile(`${safeTitle}.md`, markdown);
      }, i * 300);
    }
  };

  // Handle batch or single import from Modal
  const handleImportArticles = async (importedArticles: KnowledgeArticle[]) => {
    for (const art of importedArticles) {
      try { await onSaveArticle(art); } catch { return; }
    }
    if (importedArticles.length > 0) {
      setActiveArticleId(importedArticles[0].id);
    }
  };

  React.useEffect(() => {
    if (new URLSearchParams(location.search).get('new') === '1') {
      handleOpenEdit();
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]);

  return (
    <div className="flex-1 flex overflow-hidden h-full min-h-0">
      {/* LEFT COLUMN: Category Tree & Article List (280px) */}
      <div className="hidden md:flex w-64 border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex flex-col shrink-0">
        {/* Search & Add / Import Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-500" />
              <span>Knowledge Base</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Import Markdown (.md) to create or update articles"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
              <button
                onClick={() => handleOpenEdit()}
                className="p-1 rounded-md text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 transition-colors"
                title="Create New Article"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({articles.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = articles.filter((a) => a.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.replace(/^\d+ /, '')} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Article Item List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredArticles.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500 px-4">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No articles match this filter.</p>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="mt-3 text-sky-500 hover:underline font-medium inline-block"
              >
                Import Markdown file
              </button>
            </div>
          ) : (
            filteredArticles.map((art) => {
              const isSelected = art.id === currentArticle?.id;
              return (
                <div
                  key={art.id}
                  onClick={() => setActiveArticleId(art.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-1 group border ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/80 shadow-2xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isSelected
                          ? 'text-sky-700 dark:text-sky-300'
                          : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                      }`}
                    >
                      {art.title}
                    </span>
                    {/* Quick export icon on row */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportSingleArticle(art);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-opacity rounded"
                      title="Export this article as Markdown (.md)"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="truncate">{art.category}</span>
                    <span>•</span>
                    <span className="truncate">{art.subcategory || 'Theory'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile document selector */}
      <select aria-label="Choose article" className="md:hidden absolute mt-2 ml-3 max-w-[65vw] z-10 bg-slate-100 dark:bg-slate-800 rounded p-2 text-xs" value={currentArticle?.id || ''} onChange={e => setActiveArticleId(e.target.value)}><option value="" disabled>Choose article</option>{articles.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select>
      {/* CENTER: Main Article Content */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50/50 dark:bg-[#090d16] px-4 pt-16 md:p-6 lg:p-10 transition-colors">
        {currentArticle ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Article Top Actions & Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
                  {currentArticle.category}
                </span>
                {currentArticle.subcategory && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    / {currentArticle.subcategory}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Live Research with Search Grounding */}
                <button
                  onClick={handleOpenSearchResearch}
                  disabled={!canSearch || isResearchLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                  title={canSearch ? 'Research this topic with live web sources' : searchUnavailableReason}
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Live Research</span>
                </button>

                {/* Explain with AI */}
                <button
                  onClick={() =>
                    onNavigateToCopilot(
                      currentArticle.contentMarkdown,
                      currentArticle.title
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs"
                  title="Ask AI Copilot to explain or drill you on this article"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Explain with AI</span>
                </button>

                {/* Export Markdown Menu */}
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
                    title="Export Markdown file"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-500" />
                    <span className="hidden sm:inline">Export .md</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {exportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={handleExportCurrentMarkdown}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                      >
                        <FileDown className="w-4 h-4 text-sky-500" />
                        <div>
                          <div className="font-semibold">Export Current Article (.md)</div>
                          <div className="text-[10px] text-slate-400">
                            Includes YAML frontmatter metadata
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={handleExportAllArticles}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left border-t border-slate-100 dark:border-slate-800"
                      >
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <div>
                          <div className="font-semibold">Export All Articles ({articles.length})</div>
                          <div className="text-[10px] text-slate-400">
                            Downloads each article as an individual .md file
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => handleOpenEdit(currentArticle)}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shadow-2xs"
                  title="Edit Article"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={async () => {
                    if (confirm(`Delete "${currentArticle.title}"?`)) {
                      try { await onDeleteArticle(currentArticle.id); } catch { return; }
                      showToast('Article deleted');
                    }
                  }}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-2xs"
                  title="Delete Article"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tags & Meta */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Updated {new Date(currentArticle.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="w-3.5 h-3.5" />
                {currentArticle.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-slate-200/60 dark:border-slate-700/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Rendered Markdown Body with KaTeX & Syntax Highlighting */}
            <div className="pt-2">
              <MarkdownRenderer content={currentArticle.contentMarkdown} />
              <nav aria-label="Article navigation" className="flex justify-between gap-4 mt-10 pt-6 border-t border-slate-200 dark:border-slate-800">
                {[-1, 1].map(offset => {
                  const adjacent = filteredArticles[filteredArticles.findIndex(a => a.id === currentArticle.id) + offset];
                  return adjacent ? <button key={offset} className="text-left text-sm text-sky-600 dark:text-sky-400" onClick={() => setActiveArticleId(adjacent.id)}>{offset < 0 ? '← Previous' : 'Next →'}<span className="block mt-1 text-xs">{adjacent.title}</span></button> : <span key={offset} />;
                })}
              </nav>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm gap-3">
            <BookOpen className="w-12 h-12 opacity-40" />
            <p>Select or create an article to view details.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                Import Markdown
              </button>
              <button
                onClick={() => handleOpenEdit()}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
              >
                Create Article
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Table of Contents (220px) */}
      {tableOfContents.length > 0 && (
        <div className="w-60 border-l border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs hidden xl:block p-4 overflow-y-auto shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            On this page
          </div>
          <div className="space-y-1.5 text-xs">
            {tableOfContents.map((h, idx) => (
              <a
                key={idx}
                href={`/knowledge/${encodeURIComponent(currentArticle!.id)}#${encodeURIComponent(h.id)}`}
                className={`block text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 truncate transition-colors ${
                  h.level === 1
                    ? 'font-semibold text-slate-900 dark:text-slate-200'
                    : h.level === 2
                    ? 'pl-2.5'
                    : 'pl-5 text-[11px]'
                }`}
              >
                {h.text}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* MARKDOWN IMPORT MODAL */}
      <MarkdownImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        articles={articles}
        currentArticle={currentArticle}
        onImportArticles={handleImportArticles}
        userId={userId}
      />

      {/* EDIT / CREATE ARTICLE MODAL */}
      {isEditing && (
        <Dialog onClose={() => setIsEditing(false)} aria-label="Article editor" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editFormData.id ? 'Edit Knowledge Article' : 'New Knowledge Article'}
              </h3>
              <div className="flex items-center gap-2">
                {/* Export current draft */}
                {editFormData.contentMarkdown && (
                  <button
                    onClick={() => {
                      if (!editFormData.title) return;
                      const draftArticle: KnowledgeArticle = {
                        id: editFormData.id || 'draft',
                        userId,
                        title: editFormData.title,
                        category: editFormData.category || '01 Transformer',
                        subcategory: editFormData.subcategory || '',
                        tags: editFormData.tags || [],
                        summary: editFormData.summary || '',
                        contentMarkdown: editFormData.contentMarkdown || '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      };
                      handleExportSingleArticle(draftArticle);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Export draft as Markdown"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-500" />
                    <span>Export Draft</span>
                  </button>
                )}

                <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setEditorTab('write')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      editorTab === 'write'
                        ? 'bg-white dark:bg-slate-700 font-semibold text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Write
                  </button>
                  <button
                    onClick={() => setEditorTab('preview')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      editorTab === 'preview'
                        ? 'bg-white dark:bg-slate-700 font-semibold text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Preview
                  </button>
                </div>
                <button aria-label="Close"
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                ><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="knowledge-field-0" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Title
                  </label>
                  <input id="knowledge-field-0"
                    type="text"
                    value={editFormData.title || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, title: e.target.value })
                    }
                    placeholder="e.g. RoPE Positional Embeddings"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label htmlFor="knowledge-field-1" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select id="knowledge-field-1"
                    value={editFormData.category || '01 Transformer'}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        category: e.target.value as KnowledgeCategory,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="knowledge-field-2" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subcategory (Optional)
                  </label>
                  <input id="knowledge-field-2"
                    type="text"
                    value={editFormData.subcategory || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, subcategory: e.target.value })
                    }
                    placeholder="e.g. Positional Encodings"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label htmlFor="knowledge-field-3" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input id="knowledge-field-3"
                    type="text"
                    value={editFormData.tags?.join(', ') || ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        tags: e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="RoPE, LLaMA, Math"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="knowledge-field-4" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Summary (elevator pitch)
                </label>
                <input id="knowledge-field-4"
                  type="text"
                  value={editFormData.summary || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, summary: e.target.value })
                  }
                  placeholder="Brief overview of the concept..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Editor Write vs Preview */}
              <div>
                <label htmlFor="knowledge-content" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Content (Markdown & KaTeX LaTeX)
                </label>
                {editorTab === 'write' ? (
                  <textarea
                    id="knowledge-content"
                    rows={14}
                    value={editFormData.contentMarkdown || ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        contentMarkdown: e.target.value,
                      })
                    }
                    placeholder="# Heading 1\n\nExplain technical concepts with LaTeX math: $$\text{Attention}(Q, K, V)$$"
                    className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 leading-relaxed"
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 min-h-[300px] max-h-[400px] overflow-y-auto">
                    <MarkdownRenderer
                      content={editFormData.contentMarkdown || '*No content*'}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Save Article
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Live Research Modal for providers with web search */}
      {isResearchModalOpen && (
        <Dialog onClose={() => setIsResearchModalOpen(false)} aria-label="Live research" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Live Research Grounding
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Server-configured web research · {capabilities?.model} • {currentArticle?.title}
                  </p>
                </div>
              </div>
              <button aria-label="Close"
                onClick={() => setIsResearchModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              ><X className="w-4 h-4" /></button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {isResearchLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <p className="text-xs font-medium">
                    Searching the web for papers, benchmarks, and implementations...
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Grounding arXiv releases & tech company engineering insights
                  </p>
                </div>
              ) : researchData ? (
                <>
                  {/* Search Queries Executed */}
                  {researchData.webSearchQueries && researchData.webSearchQueries.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                        Queries:
                      </span>
                      {researchData.webSearchQueries.map((q, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[10px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                        >
                          {q}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Research Markdown Body */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                    <MarkdownRenderer content={researchData.content} />
                  </div>

                  {/* Cited Grounding Sources */}
                  {researchData.groundingSources && researchData.groundingSources.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Web Search Sources ({researchData.groundingSources.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {researchData.groundingSources.map((src, i) => {
                          let host = '';
                          try {
                            host = new URL(src.url).hostname.replace('www.', '');
                          } catch {
                            host = 'web';
                          }
                          return (
                            <a
                              key={i}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                  {src.title || host}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">{host}</p>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : <div role="alert"><p>{researchError}</p><button disabled={!canSearch} title={!canSearch ? searchUnavailableReason : undefined} className="mt-3 text-sky-500 underline disabled:opacity-40" onClick={handleOpenSearchResearch}>Retry research</button></div>}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
              <button
                onClick={() => {
                  if (researchData) {
                    navigator.clipboard.writeText(researchData.content);
                    showToast('Research content copied to clipboard');
                  }
                }}
                disabled={!researchData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Summary</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsResearchModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
                {currentArticle && (
                  <button
                    onClick={() => {
                      setIsResearchModalOpen(false);
                      onNavigateToCopilot(
                        `Here is the latest live research summary for "${currentArticle.title}":\n\n${researchData?.content || ''}\n\nPlease quiz me on these recent architectural developments.`,
                        currentArticle.title
                      );
                    }}
                    disabled={!researchData}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-40 shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Discuss in Copilot</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
