import { useI18n } from '../i18n/I18nProvider';
import { Dialog } from '../components/common/Dialog';
import { extractHeadings } from '../utils/markdownHeadings';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useMemo, useRef } from 'react';
import {
  Edit3,
  Trash2,
  Download,
  Sparkles,
  ChevronRight,
  Tag,
  Clock,
  X,
  FileDown,
  Layers,
  ChevronDown,
  Globe,
  ExternalLink,
  Loader2,
  Copy,
} from 'lucide-react';
import type { KnowledgeArticle } from '../types';
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
import { getKnowledgeCategories, knowledgeCategoryPath } from '../utils/knowledgeCatalog';
import { KnowledgeOverview } from '../components/knowledge/KnowledgeOverview';
import { KnowledgeTree } from '../components/knowledge/KnowledgeTree';
import { KnowledgeContents } from '../components/knowledge/KnowledgeContents';
import { localizeStarterArticle } from '../services/starterArticleLocalization';

interface KnowledgeProps {
  articles: KnowledgeArticle[];
  selectedArticleId?: string;
  onSaveArticle: (article: KnowledgeArticle) => Promise<void>;
  onDeleteArticle: (articleId: string) => Promise<void>;
  onNavigateToCopilot: (content: string, title: string) => void;
  userId: string;
}

export const Knowledge: React.FC<KnowledgeProps> = ({
  articles: storedArticles,
  selectedArticleId,
  onSaveArticle,
  onDeleteArticle,
  onNavigateToCopilot,
  userId,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, locale, label, translateMessage } = useI18n();
  const articles = useMemo(() => storedArticles.map(article => localizeStarterArticle(article, language)), [storedArticles, language]);
  const { showToast } = useToast();
  const { capabilities, canSearch, searchUnavailableReason } = useAICapabilities();
  const activeArticleId = selectedArticleId;
  const setActiveArticleId = (id: string) => navigate(`/knowledge/${encodeURIComponent(id)}`);
  const searchParams = new URLSearchParams(location.search);
  const selectedCategory = searchParams.get('category');
  const searchQuery = searchParams.get('q') || '';
  const setSearchQuery = (query: string) => {
    const next = new URLSearchParams(location.search);
    if (query) next.set('q', query); else next.delete('q');
    navigate({ pathname: '/knowledge', search: next.toString() ? `?${next}` : '' }, { replace: true });
  };
  const categories = useMemo(() => getKnowledgeCategories(articles), [articles]);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<KnowledgeArticle>>({});
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const articleBodyRef = useRef<HTMLDivElement>(null);
  const mobileNavigationRef = useRef<HTMLDetailsElement>(null);
  const [activeHeading, setActiveHeading] = useState('');

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
      setResearchError(translateMessage(err.message || '') || t("Research could not be loaded.", "无法加载研究内容。"));
      showToast(translateMessage(err.message || '') || t("Error fetching live research", "获取联网研究失败"), 'error');
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
    const query = searchQuery.trim().toLocaleLowerCase();
    return articles.filter((art) => {
      const matchesSearch =
        art.title.toLocaleLowerCase().includes(query) ||
        art.tags.some((tag) => tag.toLocaleLowerCase().includes(query)) ||
        art.summary.toLocaleLowerCase().includes(query);
      const matchesCategory =
        !selectedCategory || art.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, selectedCategory]);

  const currentArticle = useMemo(() => articles.find(article => article.id === activeArticleId), [articles, activeArticleId]);
  const categoryArticles = useMemo(() => articles.filter(article => article.category === currentArticle?.category), [articles, currentArticle?.category]);
  React.useEffect(() => { overviewRef.current?.scrollTo?.({ top: 0 }); }, [selectedCategory, selectedArticleId]);

  const tableOfContents = useMemo(() => extractHeadings(currentArticle?.contentMarkdown || ''), [currentArticle?.contentMarkdown]);
  const scrollToHeading = (id: string) => {
    const heading = Array.from(articleBodyRef.current?.querySelectorAll<HTMLElement>('[id]') || []).find(element => element.id === id);
    const container = readingRef.current;
    if (heading && container) {
      container.scrollTo?.({ top: heading.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 28 });
      setActiveHeading(id);
    }
  };
  const updateActiveHeading = () => {
    if (!readingRef.current || !articleBodyRef.current) return;
    const top = readingRef.current.getBoundingClientRect().top + 64;
    const headings = Array.from(articleBodyRef.current.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'));
    const current = headings.filter(heading => heading.getBoundingClientRect().top <= top).at(-1) || headings[0];
    setActiveHeading(current?.id || '');
  };
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (location.hash) {
        try { scrollToHeading(decodeURIComponent(location.hash.slice(1))); } catch { /* malformed fragment */ }
      } else {
        readingRef.current?.scrollTo?.({ top: 0 });
        setActiveHeading(tableOfContents[0]?.id || '');
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash, currentArticle?.id, currentArticle?.contentMarkdown]);

  // Handle open editor
  const handleOpenEdit = (article?: KnowledgeArticle) => {
    if (article) {
      setEditFormData(article);
    } else {
      setEditFormData({
        title: '',
        category: selectedCategory || currentArticle?.category || '01 Transformer',
        subcategory: '',
        tags: [t('Interview', '面试'), t('Theory', '理论')],
        summary: '',
        contentMarkdown: t('# New Article\n\n## 1. Overview\nExplain core concept with LaTeX math and code blocks...', '# 新文章\n\n## 1. 概述\n使用 LaTeX 公式与代码块讲解核心概念...'),
      });
    }
    setIsEditing(true);
  };

  // Handle save article
  const handleSave = async () => {
    if (!editFormData.title?.trim()) {
      showToast(t("Article title is required", "请输入文章标题"), 'error');
      return;
    }
    const id = editFormData.id || generateId();
    const articleToSave: KnowledgeArticle = {
      id,
      userId,
      title: editFormData.title || t('Untitled', '无标题'),
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
    showToast(t("Knowledge article saved successfully", "知识文章已保存"));
  };

  // Export a specific article as markdown file
  const handleExportSingleArticle = (article: KnowledgeArticle) => {
    const markdownWithFrontmatter = serializeArticleToMarkdown(article);
    const safeTitle = article.title
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '_');
    downloadMarkdownFile(`${safeTitle}.md`, markdownWithFrontmatter);
    showToast(t(`Exported "${article.title}" as Markdown`, `已将“${article.title}”导出为 Markdown`));
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
      showToast(t("No articles to export", "没有可导出的文章"), 'error');
      return;
    }

    setExportMenuOpen(false);
    showToast(t(`Exporting ${articles.length} individual Markdown files...`, `正在导出 ${articles.length} 个 Markdown 文件...`));

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
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
      handleOpenEdit();
      params.delete('new');
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params}` : '', hash: location.hash }, { replace: true });
    }
  }, [location.search]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white dark:bg-[#0c111b]">
      {!selectedArticleId ? (
        <div ref={overviewRef} className="min-h-0 flex-1 overflow-y-auto">
          <KnowledgeOverview articles={articles} filteredArticles={filteredArticles} selectedCategory={selectedCategory} searchQuery={searchQuery} onSearch={setSearchQuery} onImport={() => setIsImportModalOpen(true)} onCreate={() => handleOpenEdit()} onExport={handleExportSingleArticle} onExportAll={handleExportAllArticles} />
        </div>
      ) : currentArticle ? (
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] overflow-hidden">
          <aside className="hidden h-full w-[260px] shrink-0 border-r border-slate-200 bg-slate-50/40 lg:block dark:border-slate-800 dark:bg-slate-950/20">
            <KnowledgeTree articles={articles} currentArticle={currentArticle} onCreate={() => handleOpenEdit()} onImport={() => setIsImportModalOpen(true)} />
          </aside>
          <div ref={readingRef} onScroll={updateActiveHeading} className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-16 pt-5 sm:px-8 lg:px-10 lg:pt-8">
            <div className="mx-auto mb-6 max-w-[48rem] space-y-3 xl:hidden">
              <details ref={mobileNavigationRef} className="rounded-lg border border-slate-200 lg:hidden dark:border-slate-800">
                <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">{t('Browse documents', '浏览文档目录')}</summary>
                <div className="max-h-[50vh] overflow-y-auto border-t border-slate-200 dark:border-slate-800"><KnowledgeTree articles={articles} currentArticle={currentArticle} onNavigate={() => { if (mobileNavigationRef.current) mobileNavigationRef.current.open = false; }} onCreate={() => handleOpenEdit()} onImport={() => setIsImportModalOpen(true)} /></div>
              </details>
              <details className="rounded-lg border border-slate-200 xl:hidden dark:border-slate-800">
                <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">{t('On this page', '本文目录')}</summary>
                <div className="px-4 pb-4"><KnowledgeContents articleId={currentArticle.id} headings={tableOfContents} activeHeading={activeHeading} onSelect={scrollToHeading} /></div>
              </details>
            </div>
          <div className="mx-auto max-w-[48rem] space-y-6">
            <nav aria-label={t('Article breadcrumb', '文章路径')} className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <Link to="/knowledge" className="hover:text-sky-600">{t('Knowledge library', '知识文库')}</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to={knowledgeCategoryPath(currentArticle.category)} className="hover:text-sky-600">{label(currentArticle.category)}</Link>
            </nav>
            {!(tableOfContents[0]?.level === 1 && tableOfContents[0]?.text.trim() === currentArticle.title.trim()) && <h1 className="break-words text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">{currentArticle.title}</h1>}
            {/* Article Top Actions & Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
                  {label(currentArticle.category)}
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
                  title={canSearch ? t("Research this topic with live web sources", "通过实时网络来源研究此主题") : searchUnavailableReason}
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t("Live Research", "联网研究")}</span>
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
                  title={t("Ask AI Copilot to explain or drill you on this article", "让 AI 助手讲解此文章或进行练习")}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t("Explain with AI", "AI 讲解")}</span>
                </button>

                {/* Export Markdown Menu */}
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
                    title={t("Export Markdown file", "导出 Markdown 文件")}
                  >
                    <Download className="w-3.5 h-3.5 text-sky-500" />
                    <span className="hidden sm:inline">{t("Export .md", "导出 .md")}</span>
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
                          <div className="font-semibold">{t("Export Current Article (.md)", "导出当前文章（.md）")}</div>
                          <div className="text-[10px] text-slate-400">
                            {t("Includes YAML frontmatter metadata", "包含 YAML 头部元数据")}
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={handleExportAllArticles}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left border-t border-slate-100 dark:border-slate-800"
                      >
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <div>
                          <div className="font-semibold">{t(`Export All Articles (${articles.length})`, `导出全部文章（${articles.length}）`)}</div>
                          <div className="text-[10px] text-slate-400">
                            {t("Downloads each article as an individual .md file", "每篇文章单独下载为 .md 文件")}
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
                  title={t("Edit Article", "编辑文章")}
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={async () => {
                    if (confirm(t(`Delete "${currentArticle.title}"?`, `确定删除“${currentArticle.title}”吗？`))) {
                      try { await onDeleteArticle(currentArticle.id); } catch { return; }
                      navigate(knowledgeCategoryPath(currentArticle.category));
                      showToast(t("Article deleted", "文章已删除"));
                    }
                  }}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-2xs"
                  title={t("Delete Article", "删除文章")}
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
                  {t('Updated', '更新于')} {new Date(currentArticle.updatedAt).toLocaleDateString(locale)}
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
            <div ref={articleBodyRef} className="pt-2 text-[15px] leading-8">
              <MarkdownRenderer content={currentArticle.contentMarkdown} className="[&_h1]:break-words [&_h1]:text-3xl [&_p]:break-words [&_p]:leading-8 [&_li]:leading-7 [&_h2]:mt-10 [&_h3]:mt-8" />
              <nav aria-label={t("Article navigation", "文章导航")} className="flex justify-between gap-4 mt-10 pt-6 border-t border-slate-200 dark:border-slate-800">
                {[-1, 1].map(offset => {
                  const adjacent = categoryArticles[categoryArticles.findIndex(a => a.id === currentArticle.id) + offset];
                  return adjacent ? <button key={offset} className="text-left text-sm text-sky-600 dark:text-sky-400" onClick={() => setActiveArticleId(adjacent.id)}>{offset < 0 ? t("← Previous", "← 上一篇") : t("Next →", "下一篇 →")}<span className="block mt-1 text-xs">{adjacent.title}</span></button> : <span key={offset} />;
                })}
              </nav>
            </div>
          </div>
          </div>
          <aside className="hidden w-[220px] shrink-0 overflow-y-auto px-5 py-9 xl:block">
            <KnowledgeContents articleId={currentArticle.id} headings={tableOfContents} activeHeading={activeHeading} onSelect={scrollToHeading} />
          </aside>
        </div>
      ) : <div className="p-10 text-sm text-slate-500"><p>{t('Article not found.', '未找到这篇文章。')}</p><Link to="/knowledge" className="mt-3 inline-block text-sky-600">{t('Return to knowledge library', '返回知识文库')}</Link></div>}

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
        <Dialog onClose={() => setIsEditing(false)} aria-label={t("Article editor", "文章编辑器")} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editFormData.id ? t("Edit Knowledge Article", "编辑知识文章") : t("New Knowledge Article", "新建知识文章")}
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
                    title={t("Export draft as Markdown", "将草稿导出为 Markdown")}
                  >
                    <Download className="w-3.5 h-3.5 text-sky-500" />
                    <span>{t("Export Draft", "导出草稿")}</span>
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
                    {t("Write", "编辑")}
                  </button>
                  <button
                    onClick={() => setEditorTab('preview')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      editorTab === 'preview'
                        ? 'bg-white dark:bg-slate-700 font-semibold text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {t("Preview", "预览")}
                  </button>
                </div>
                <button aria-label={t("Close", "关闭")}
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
                    {t("Title", "标题")}
                  </label>
                  <input id="knowledge-field-0"
                    type="text"
                    value={editFormData.title || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, title: e.target.value })
                    }
                    placeholder={t("e.g. RoPE Positional Embeddings", "例如：RoPE 旋转位置编码")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label htmlFor="knowledge-field-1" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("Category", "分类")}
                  </label>
                  <input id="knowledge-field-1" list="knowledge-category-options"
                    value={editFormData.category || ''}
                    onChange={event => setEditFormData({ ...editFormData, category: event.target.value })}
                    placeholder={t('Choose or create a category', '选择现有分类或输入新分类')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                  <datalist id="knowledge-category-options">{categories.map(category => <option key={category} value={category}>{label(category)}</option>)}</datalist>
                  <p className="mt-1.5 text-[10px] text-slate-400">{t('Choose an existing topic or enter a custom category.', '可选择已有主题，也可输入自定义分类。')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="knowledge-field-2" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("Subcategory (Optional)", "子分类（可选）")}
                  </label>
                  <input id="knowledge-field-2"
                    type="text"
                    value={editFormData.subcategory || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, subcategory: e.target.value })
                    }
                    placeholder={t("e.g. Positional Encodings", "例如：位置编码")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label htmlFor="knowledge-field-3" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("Tags (comma separated)", "标签（以英文逗号分隔）")}
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
                    placeholder={t("RoPE, LLaMA, Math", "RoPE, LLaMA, 数学")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="knowledge-field-4" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("Summary (elevator pitch)", "摘要（简要概述）")}
                </label>
                <input id="knowledge-field-4"
                  type="text"
                  value={editFormData.summary || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, summary: e.target.value })
                  }
                  placeholder={t("Brief overview of the concept...", "简要介绍这个概念...")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Editor Write vs Preview */}
              <div>
                <label htmlFor="knowledge-content" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("Content (Markdown & KaTeX LaTeX)", "正文（Markdown 与 KaTeX LaTeX）")}
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
                    placeholder={t("# Heading 1\n\nExplain technical concepts with LaTeX math: $\\text{Attention}(Q, K, V)$", "# 一级标题\n\n使用 LaTeX 公式讲解技术概念：$\\text{Attention}(Q, K, V)$")}
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
                {t("Cancel", "取消")}
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {t("Save Article", "保存文章")}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Live Research Modal for providers with web search */}
      {isResearchModalOpen && (
        <Dialog onClose={() => setIsResearchModalOpen(false)} aria-label={t("Live research", "联网研究")} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t("Live Research Grounding", "联网研究与来源")}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('Server-configured web research', '服务端配置的联网研究')} · {capabilities?.model} • {currentArticle?.title}
                  </p>
                </div>
              </div>
              <button aria-label={t("Close", "关闭")}
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
                    {t("Searching the web for papers, benchmarks, and implementations...", "正在搜索论文、基准测试和实现方案...")}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {t("Grounding arXiv releases & tech company engineering insights", "查找 arXiv 论文与科技公司的工程资料")}
                  </p>
                </div>
              ) : researchData ? (
                <>
                  {/* Search Queries Executed */}
                  {researchData.webSearchQueries && researchData.webSearchQueries.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                        {t("Queries:", "检索词：")}
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
                        <span>{t(`Web Search Sources (${researchData.groundingSources.length})`, `网络检索来源（${researchData.groundingSources.length}）`)}</span>
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
              ) : <div role="alert"><p>{researchError}</p><button disabled={!canSearch} title={!canSearch ? searchUnavailableReason : undefined} className="mt-3 text-sky-500 underline disabled:opacity-40" onClick={handleOpenSearchResearch}>{t("Retry research", "重试研究")}</button></div>}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
              <button
                onClick={() => {
                  if (researchData) {
                    navigator.clipboard.writeText(researchData.content);
                    showToast(t("Research content copied to clipboard", "研究内容已复制到剪贴板"));
                  }
                }}
                disabled={!researchData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{t("Copy Summary", "复制摘要")}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsResearchModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t("Close", "关闭")}
                </button>
                {currentArticle && (
                  <button
                    onClick={() => {
                      setIsResearchModalOpen(false);
                      onNavigateToCopilot(
                        t(`Here is the latest live research summary for "${currentArticle.title}":\n\n${researchData?.content || ''}\n\nPlease quiz me on these recent architectural developments.`, `以下是“${currentArticle.title}”的最新联网研究摘要：\n\n${researchData?.content || ''}\n\n请针对这些最新的架构进展向我提问。`),
                        currentArticle.title
                      );
                    }}
                    disabled={!researchData}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-40 shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t("Discuss in Copilot", "在 AI 助手中讨论")}</span>
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
