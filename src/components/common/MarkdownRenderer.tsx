import { useI18n } from '../../i18n/I18nProvider';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkHeadingIds } from '../../utils/markdownHeadings';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import sql from 'highlight.js/lib/languages/sql';
import cpp from 'highlight.js/lib/languages/cpp';
import 'katex/dist/katex.min.css';
hljs.registerLanguage('python', python);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('cpp', cpp);
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  headingLabels?: Readonly<Record<string, string>>;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '', headingLabels }) => {
  // Labels may be translated, while IDs remain derived from the original Markdown.
  const headingContent = (id: string | undefined, children: React.ReactNode) => id ? headingLabels?.[id] ?? children : children;
  return (
    <div className={`markdown-body prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkHeadingIds]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre({ children }) {
            const child = React.Children.toArray(children)[0] as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
            return <CodeBlock code={String(child?.props?.children || '').replace(/\n$/, '')} language={/language-(\S+)/.exec(child?.props?.className || '')?.[1] || ''} />;
          },
          code: ({ children }) => <code className="px-1 rounded bg-slate-100 dark:bg-slate-800 font-mono">{children}</code>,
          h1: ({ children, id }) => (
            <h1 id={id} className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-6 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              {headingContent(id, children)}
            </h1>
          ),
          h2: ({ children, id }) => (
            <h2 id={id} className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-6 mb-3">
              {headingContent(id, children)}
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3 id={id} className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-2">
              {headingContent(id, children)}
            </h3>
          ),
          h4: ({ children, id }) => <h4 id={id} className="mt-5 mb-2 font-semibold">{headingContent(id, children)}</h4>,
          h5: ({ children, id }) => <h5 id={id} className="mt-4 mb-2 font-semibold">{headingContent(id, children)}</h5>,
          h6: ({ children, id }) => <h6 id={id} className="mt-4 mb-2 font-semibold">{headingContent(id, children)}</h6>,
          p: ({ children }) => <p className="leading-relaxed mb-4 text-slate-700 dark:text-slate-300">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1 text-slate-700 dark:text-slate-300">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-slate-700 dark:text-slate-300">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 px-4 py-2 my-4 text-slate-700 dark:text-slate-300 italic rounded-r-lg">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold">
              {children}
            </thead>
          ),
          th: ({ children }) => <th className="px-4 py-3 font-semibold">{children}</th>,
          td: ({ children }) => (
            <td className="px-4 py-2.5 border-b border-slate-200/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-300">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const highlighted = language && hljs.getLanguage(language) ? hljs.highlight(code, { language }).value : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0b1120] text-slate-100 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0f172a] border-b border-slate-800 text-xs font-mono text-slate-400">
        <span className="uppercase font-semibold tracking-wider text-sky-400">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={t("Copy code", "复制代码")}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-xs">{t("Copied", "已复制")}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-xs">{copyError ? t("Copy failed", "复制失败") : t("Copy", "复制")}</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed text-slate-100 scrollbar-thin">
        <code>{highlighted ? <span dangerouslySetInnerHTML={{ __html: highlighted }} /> : code}</code>
      </pre>
    </div>
  );
};
