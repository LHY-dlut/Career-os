import { Dialog } from '../common/Dialog';
import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  X,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  FolderOpen,
  RefreshCw,
  PlusCircle,
  Eye,
  Edit2,
} from 'lucide-react';
import type { KnowledgeArticle, KnowledgeCategory } from '../../types';
import {
  parseMarkdownWithFrontmatter,
  ParsedMarkdownResult,
} from '../../utils/markdownFrontmatter';
import { generateId } from '../../utils/id';
import { useToast } from '../common/Toast';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface MarkdownImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: KnowledgeArticle[];
  currentArticle?: KnowledgeArticle;
  onImportArticles: (articlesToSave: KnowledgeArticle[]) => Promise<void>;
  userId: string;
}

interface StagedFile {
  id: string;
  fileName: string;
  fileSize: number;
  parsed: ParsedMarkdownResult;
  importMode: 'create' | 'update';
  targetArticleId?: string; // If updating
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

export const MarkdownImportModal: React.FC<MarkdownImportModalProps> = ({
  isOpen,
  onClose,
  articles,
  currentArticle,
  onImportArticles,
  userId,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [previewTab, setPreviewTab] = useState<'details' | 'content'>('details');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newStaged: StagedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.match(/\.(md|markdown|txt)$/i)) continue;

      try {
        const text = await file.text();
        const parsed = parseMarkdownWithFrontmatter(text, file.name);

        // Check if an article with identical title exists
        const matched = articles.find(
          (a) => a.title.toLowerCase().trim() === parsed.title.toLowerCase().trim()
        );

        const shouldUpdateCurrent =
          !matched &&
          currentArticle &&
          files.length === 1 &&
          confirm(`Do you want to update the currently open article ("${currentArticle.title}") with this file?`);

        const importMode = matched || shouldUpdateCurrent ? 'update' : 'create';
        const targetArticleId = matched?.id || (shouldUpdateCurrent ? currentArticle?.id : undefined);

        newStaged.push({
          id: generateId(),
          fileName: file.name,
          fileSize: file.size,
          parsed,
          importMode,
          targetArticleId,
        });
      } catch (err) {
        console.error('Failed to read file:', file.name, err);
      }
    }

    if (newStaged.length === 0) {
      showToast('Please select valid Markdown (.md) files', 'error');
      return;
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
    setActiveFileIndex(0);
  };

  const activeStaged = stagedFiles[activeFileIndex];

  const handleUpdateActiveField = (field: keyof ParsedMarkdownResult, value: any) => {
    if (!activeStaged) return;
    setStagedFiles((prev) => {
      const next = [...prev];
      next[activeFileIndex] = {
        ...next[activeFileIndex],
        parsed: {
          ...next[activeFileIndex].parsed,
          [field]: value,
        },
      };
      return next;
    });
  };

  const handleSetMode = (mode: 'create' | 'update', targetId?: string) => {
    if (!activeStaged) return;
    setStagedFiles((prev) => {
      const next = [...prev];
      next[activeFileIndex] = {
        ...next[activeFileIndex],
        importMode: mode,
        targetArticleId: targetId || next[activeFileIndex].targetArticleId || articles[0]?.id,
      };
      return next;
    });
  };

  const handleRemoveStaged = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
    if (activeFileIndex >= index && activeFileIndex > 0) {
      setActiveFileIndex(activeFileIndex - 1);
    }
  };

  const handleExecuteImport = async () => {
    if (stagedFiles.length === 0) return;
    setIsProcessing(true);

    try {
      const articlesToSave: KnowledgeArticle[] = [];

      for (const staged of stagedFiles) {
        const now = new Date().toISOString();

        if (staged.importMode === 'update' && staged.targetArticleId) {
          const existing = articles.find((a) => a.id === staged.targetArticleId);
          if (existing) {
            articlesToSave.push({
              ...existing,
              title: staged.parsed.title || existing.title,
              category: staged.parsed.category || existing.category,
              subcategory: staged.parsed.subcategory || existing.subcategory,
              tags: Array.from(new Set([...existing.tags, ...staged.parsed.tags])),
              summary: staged.parsed.summary || existing.summary,
              contentMarkdown: staged.parsed.contentMarkdown,
              updatedAt: now,
            });
            continue;
          }
        }

        // Create new article
        articlesToSave.push({
          id: generateId(),
          userId,
          title: staged.parsed.title,
          category: staged.parsed.category,
          subcategory: staged.parsed.subcategory,
          tags: staged.parsed.tags,
          summary: staged.parsed.summary,
          contentMarkdown: staged.parsed.contentMarkdown,
          createdAt: now,
          updatedAt: now,
        });
      }

      await onImportArticles(articlesToSave);
      showToast(
        `Successfully imported ${articlesToSave.length} article${articlesToSave.length > 1 ? 's' : ''}!`
      );
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to import articles', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog onClose={() => onClose()} aria-label="Import Markdown" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Import Markdown to Knowledge Base
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload .md files with YAML frontmatter to create new articles or update existing ones
              </p>
            </div>
          </div>
          <button aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          ><X className="w-5 h-5" /></button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/20'
                : 'border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/40 dark:bg-slate-950/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".md,.markdown,.txt"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <FolderOpen className="w-6 h-6 text-sky-500" />
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Drag and drop Markdown files here, or <span className="text-sky-500 underline">browse files</span>
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                Supports standard .md files with KaTeX math, code blocks, and optional YAML frontmatter
              </div>
            </div>
          </div>

          {/* Staged Files List & Editor */}
          {stagedFiles.length > 0 && (
            <div className="space-y-4">
              {/* File selection pills if multiple */}
              {stagedFiles.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {stagedFiles.map((staged, idx) => (
                    <button
                      key={staged.id}
                      onClick={() => setActiveFileIndex(idx)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                        activeFileIndex === idx
                          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{staged.fileName}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveStaged(idx);
                        }}
                        className="hover:text-rose-500 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Active File Config Card */}
              {activeStaged && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 space-y-4">
                  {/* Action Mode Toggle: Create New vs Update Existing */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Import Action:
                      </span>
                      <div className="inline-flex rounded-lg bg-slate-200 dark:bg-slate-800 p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handleSetMode('create')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                            activeStaged.importMode === 'create'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Create as New</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetMode('update')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                            activeStaged.importMode === 'update'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-sky-500" />
                          <span>Update Existing</span>
                        </button>
                      </div>
                    </div>

                    {activeStaged.importMode === 'update' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Target Article:</span>
                        <select
                          value={activeStaged.targetArticleId || ''}
                          onChange={(e) => handleSetMode('update', e.target.value)}
                          className="text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium max-w-[220px] truncate"
                        >
                          {articles.map((art) => (
                            <option key={art.id} value={art.id}>
                              {art.title} ({art.category.split(' ')[1] || art.category})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Tabs: Details vs Content Preview */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={() => setPreviewTab('details')}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                          previewTab === 'details'
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Metadata</span>
                      </button>
                      <button
                        onClick={() => setPreviewTab('content')}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                          previewTab === 'content'
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Markdown Preview</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      {activeStaged.parsed.contentMarkdown.split(/\s+/).length} words •{' '}
                      {(activeStaged.fileSize / 1024).toFixed(1)} KB
                    </div>
                  </div>

                  {/* Tab 1: Metadata Fields */}
                  {previewTab === 'details' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label htmlFor="markdownimportmodal-field-0" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                          Article Title
                        </label>
                        <input id="markdownimportmodal-field-0"
                          type="text"
                          value={activeStaged.parsed.title}
                          onChange={(e) => handleUpdateActiveField('title', e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label htmlFor="markdownimportmodal-field-1" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                          Category
                        </label>
                        <select id="markdownimportmodal-field-1"
                          value={activeStaged.parsed.category}
                          onChange={(e) =>
                            handleUpdateActiveField('category', e.target.value as KnowledgeCategory)
                          }
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="markdownimportmodal-field-2" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                          Subcategory (Optional)
                        </label>
                        <input id="markdownimportmodal-field-2"
                          type="text"
                          value={activeStaged.parsed.subcategory}
                          onChange={(e) => handleUpdateActiveField('subcategory', e.target.value)}
                          placeholder="e.g. Memory Optimization"
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="markdownimportmodal-field-3" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                          Tags (comma separated)
                        </label>
                        <input id="markdownimportmodal-field-3"
                          type="text"
                          value={activeStaged.parsed.tags.join(', ')}
                          onChange={(e) =>
                            handleUpdateActiveField(
                              'tags',
                              e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                            )
                          }
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="markdownimportmodal-field-4" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                          Summary / Pitch
                        </label>
                        <textarea id="markdownimportmodal-field-4"
                          rows={2}
                          value={activeStaged.parsed.summary}
                          onChange={(e) => handleUpdateActiveField('summary', e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Content Preview */}
                  {previewTab === 'content' && (
                    <div className="max-h-64 overflow-y-auto p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <MarkdownRenderer content={activeStaged.parsed.contentMarkdown} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleExecuteImport}
            disabled={stagedFiles.length === 0 || isProcessing}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Importing...'
                : `Import ${stagedFiles.length} Article${stagedFiles.length > 1 ? 's' : ''}`}
            </span>
          </button>
        </div>
      </div>
    </Dialog>
  );
};
