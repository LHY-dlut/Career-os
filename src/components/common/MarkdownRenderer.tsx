import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-body prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const isInline = !match && !codeString.includes('\n');

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 rounded border border-slate-200 dark:border-slate-700/80"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock code={codeString} language={language} />;
          },
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-6 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-6 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-2">
              {children}
            </h3>
          ),
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
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
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-xs">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed text-slate-100 scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
};
