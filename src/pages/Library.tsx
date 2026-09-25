import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, ExternalLink, FilePenLine, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../app/AuthProvider';
import { useData } from '../app/DataProvider';
import { useWorkspaceActions } from '../app/WorkspaceActions';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { useToast } from '../components/common/Toast';
import { LibraryContents } from '../components/library/LibraryContents';
import { LibraryOverview } from '../components/library/LibraryOverview';
import { LibraryTree } from '../components/library/LibraryTree';
import { LibraryLanguageSelect, type LibraryLanguagePreference } from '../components/library/LibraryLanguageSelect';
import { useI18n } from '../i18n/I18nProvider';
import { libraryNote, libraryPath, libraryResources, librarySources, loadLibraryContent } from '../services/learningLibrary';
import { getLibraryResourceForLanguage, getLibraryResourceLanguage, getLibraryResourceTitle, preferLibraryLanguage } from '../services/libraryLanguage';
import { extractHeadings } from '../utils/markdownHeadings';

interface ContentState {
  id: string;
  status: 'loading' | 'ready' | 'error';
  markdown: string;
}

export function Library() {
  const { resourceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale, language } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { data, loading: workspaceLoading, error: workspaceError } = useData();
  const { save } = useWorkspaceActions();
  const { showToast } = useToast();
  const params = new URLSearchParams(location.search);
  const requestedLanguage = params.get('lang');
  const languagePreference: LibraryLanguagePreference = requestedLanguage === 'zh' || requestedLanguage === 'en' || requestedLanguage === 'all' ? requestedLanguage : '';
  const readingLanguage = languagePreference === 'zh' || languagePreference === 'en' ? languagePreference : language;
  const requestedResource = libraryResources.find(item => item.id === resourceId);
  const resource = requestedResource && languagePreference !== 'all' ? getLibraryResourceForLanguage(requestedResource, libraryResources, readingLanguage) : requestedResource;
  const source = librarySources.find(item => item.id === resource?.sourceId);
  const visibleResources = useMemo(() => languagePreference === 'all' ? libraryResources : preferLibraryLanguage(libraryResources, readingLanguage), [languagePreference, readingLanguage]);
  const resourceTitle = resource ? getLibraryResourceTitle(resource, language) : '';
  const rawPage = Number(params.get('page') || 1);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const [content, setContent] = useState<ContentState>({ id: '', status: 'loading', markdown: '' });
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const readingRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const mobileNavigationRef = useRef<HTMLDetailsElement>(null);
  const mobileContentsRef = useRef<HTMLDetailsElement>(null);
  const [activeHeading, setActiveHeading] = useState('');

  const note = useMemo(() => resource && source ? libraryNote(resource, source, user?.uid || 'guest', language) : undefined, [resource, source, user?.uid, language]);
  const existingNote = note ? data.articles.find(article => article.id === note.id) : undefined;
  const sourceResources = useMemo(() => visibleResources.filter(item => item.sourceId === source?.id), [source?.id, visibleResources]);
  const readingTasks = resource?.kind === 'link' ? t(
    `## Your study tasks\n\n1. Read the original material on **${resourceTitle}** and write the key idea in your own words.\n2. Work through one small example. Record the inputs, result, and anything you could not explain.\n3. Write a question to revisit later, and explain when the technique is useful.\n\nThese study prompts were written for this library; they are not a copy or summary of the original article.`,
    `## 学习任务\n\n1. 阅读 **${resourceTitle}** 的原始资料，用自己的话写下核心概念。\n2. 动手完成一个最小示例，记录输入、结果与暂时没理解的地方。\n3. 整理一道待复习的问题，并说明这种方法适用的条件。\n\n以上是本站编写的学习提示，不是原文摘录或内容摘要。`,
  ) : '';
  const body = resource?.kind === 'link' ? readingTasks : content.id === resource?.id && content.status === 'ready' ? content.markdown : '';
  const originalHeadings = useMemo(() => extractHeadings(body), [body]);
  const headingLabels = useMemo(() => {
    if (language !== 'zh' || !resource || getLibraryResourceLanguage(resource) !== 'zh') return {};
    return Object.fromEntries(originalHeadings.flatMap((heading, index) => {
      const label = index === 0 && heading.level === 1 && resource.titleZh ? resource.titleZh : heading.text.replace(/Cheat Sheet/gi, '速查表').replace(/TL;DR/gi, '要点速览');
      return label !== heading.text ? [[heading.id, label]] : [];
    }));
  }, [originalHeadings, language, resource]);
  const headings = useMemo(() => originalHeadings.map(heading => ({ ...heading, text: headingLabels[heading.id] || heading.text })), [originalHeadings, headingLabels]);
  const isLoading = resource?.kind === 'article' && (content.id !== resource.id || content.status === 'loading');
  const loadFailed = resource?.kind === 'article' && content.id === resource.id && content.status === 'error';

  useEffect(() => {
    if (resource && requestedResource && resource.id !== requestedResource.id) {
      navigate({ pathname: libraryPath(resource.id), search: location.search, hash: '' }, { replace: true });
    }
  }, [resource?.id, requestedResource?.id, location.search, navigate]);

  useEffect(() => {
    if (!resource || resource.kind !== 'article') return;
    const controller = new AbortController();
    setContent({ id: resource.id, status: 'loading', markdown: '' });
    void loadLibraryContent(resource, controller.signal).then(markdown => {
      if (!controller.signal.aborted) setContent({ id: resource.id, status: 'ready', markdown });
    }).catch(() => {
      if (!controller.signal.aborted) setContent({ id: resource.id, status: 'error', markdown: '' });
    });
    return () => controller.abort();
  }, [resource, retry]);

  const scrollToHeading = (id: string) => {
    const container = readingRef.current;
    const heading = Array.from(bodyRef.current?.querySelectorAll<HTMLElement>('[id]') || []).find(element => element.id === id);
    if (heading && container) {
      container.scrollTo?.({ top: heading.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 24 });
      setActiveHeading(id);
    }
  };
  const updateActiveHeading = () => {
    if (!readingRef.current || !bodyRef.current) return;
    const top = readingRef.current.getBoundingClientRect().top + 64;
    const nodes = Array.from(bodyRef.current.querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]'));
    setActiveHeading((nodes.filter(node => node.getBoundingClientRect().top <= top).at(-1) || nodes[0])?.id || '');
  };
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (location.hash) {
        try { scrollToHeading(decodeURIComponent(location.hash.slice(1))); } catch { /* Ignore malformed URL fragments. */ }
      } else {
        readingRef.current?.scrollTo?.({ top: 0 });
        setActiveHeading(headings[0]?.id || '');
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [resource?.id, location.hash, body]);

  const setFilter = (key: 'source' | 'category' | 'q' | 'page' | 'lang', value: string) => {
    const next = new URLSearchParams(location.search);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    if (key === 'source') next.delete('category');
    navigate({ pathname: libraryPath(), search: next.toString() ? `?${next}` : '' }, { replace: key === 'q' });
  };
  const setReadingLanguage = (value: LibraryLanguagePreference) => {
    if (!resource) return;
    const next = new URLSearchParams(location.search);
    if (value) next.set('lang', value); else next.delete('lang');
    const nextResource = value === 'all' ? resource : getLibraryResourceForLanguage(resource, libraryResources, value || language);
    navigate({ pathname: libraryPath(nextResource.id), search: next.toString() ? `?${next}` : '', hash: '' });
  };
  const openNote = async () => {
    if (!resource || !source || !note || authLoading || workspaceLoading || workspaceError || savingRef.current) return;
    if (existingNote) { navigate(`/knowledge/${encodeURIComponent(existingNote.id)}`); return; }
    savingRef.current = true;
    setSaving(true);
    try {
      await save('articles', note);
      showToast(t('Your learning note is ready. Add your understanding in the editor.', '学习笔记已创建，点击编辑即可写下自己的理解。'), 'success');
      navigate(`/knowledge/${encodeURIComponent(note.id)}`);
    } catch {
      showToast(t('The note could not be saved. Please retry when your workspace is ready.', '笔记未能保存，请在工作区恢复后重试。'), 'error');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!resourceId) return <LibraryOverview resources={visibleResources} sources={librarySources} sourceId={params.get('source') || ''} category={params.get('category') || ''} query={params.get('q') || ''} search={location.search} page={page} languagePreference={languagePreference} onFilter={setFilter} />;
  if (!resource || !source) return <div className="mx-auto max-w-3xl px-6 py-14"><h1 className="text-2xl font-bold">{t('Resource not found', '未找到这篇学习资料')}</h1><p className="mt-3 text-sm leading-7 text-slate-500">{t('This link may have changed. Browse the library to find the resource.', '这篇资料的地址可能已变更，请返回资料库查找。')}</p><Link to={libraryPath()} className="mt-6 inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400"><ArrowLeft className="h-4 w-4" />{t('Back to learning library', '返回学习资料库')}</Link></div>;

  const contents = <LibraryContents resourceId={resource.id} search={location.search} headings={headings} activeHeading={activeHeading} onSelect={id => { if (mobileContentsRef.current) mobileContentsRef.current.open = false; scrollToHeading(id); }} />;
  const tree = <LibraryTree resources={sourceResources} source={source} current={resource} search={location.search} onNavigate={() => { if (mobileNavigationRef.current) mobileNavigationRef.current.open = false; }} />;
  const checkedDate = Number.isFinite(Date.parse(source.checkedAt)) ? new Date(source.checkedAt).toLocaleDateString(locale) : source.checkedAt;
  const versions = (['zh', 'en'] as const).filter(version => getLibraryResourceLanguage(getLibraryResourceForLanguage(resource, libraryResources, version)) === version);
  const resourceSummary = language === 'zh' ? resource.summary.replace(/\bEnglish\b/g, '英文').replace(/Cheat Sheet/gi, '速查表') : resource.summary;
  const sourceQuery = new URLSearchParams(location.search);
  sourceQuery.set('source', source.id);
  sourceQuery.delete('page');
  sourceQuery.delete('category');

  return <div className="mx-auto flex h-full min-h-0 max-w-[1500px] overflow-hidden">
    <aside className="hidden w-[250px] shrink-0 overflow-y-auto border-r border-slate-100 px-5 py-7 dark:border-slate-800 lg:block">{tree}</aside>
    <div ref={readingRef} onScroll={updateActiveHeading} className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <details ref={mobileNavigationRef} className="mb-6 rounded-xl border border-slate-200 dark:border-slate-800 lg:hidden"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-medium"><span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-indigo-500" />{t('Browse source documents', '浏览来源文档')}</span><ChevronDown className="h-3.5 w-3.5" /></summary><div className="max-h-[55vh] overflow-y-auto border-t border-slate-100 p-4 dark:border-slate-800">{tree}</div></details>
        <nav aria-label={t('Resource breadcrumb', '资料路径')} className="mb-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-5 text-slate-400"><Link to={`${libraryPath()}${location.search}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">{t('Learning library', '学习资料库')}</Link><span>/</span><Link to={`${libraryPath()}?${sourceQuery}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">{source.name}</Link><span>/</span><span>{resource.category}</span></nav>
        <header className="mb-8 border-b border-slate-200 pb-7 dark:border-slate-800">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]"><span className={`rounded-full px-2.5 py-1 ${resource.kind === 'article' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{resource.kind === 'article' ? t('Read here', '站内阅读') : t('Read at source', '原站阅读')}</span><span className="text-slate-400">{resource.category}</span></div>
          <h1 className="break-words text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{resourceTitle}</h1>
          {resourceSummary && <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">{resourceSummary}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <LibraryLanguageSelect value={languagePreference} onChange={setReadingLanguage} />
            {versions.length > 1 && <div role="group" aria-label={t('Article language versions', '正文语言版本')} className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs dark:border-slate-800">{versions.map(version => <button key={version} onClick={() => setReadingLanguage(version)} aria-pressed={getLibraryResourceLanguage(resource) === version} className={`rounded-md px-3 py-2 ${getLibraryResourceLanguage(resource) === version ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-500 hover:text-indigo-600'}`}>{version === 'zh' ? '中文' : 'English'}</button>)}</div>}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2"><button onClick={() => void openNote()} disabled={authLoading || workspaceLoading || Boolean(workspaceError) || saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-45">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePenLine className="h-3.5 w-3.5" />}{saving ? t('Saving…', '正在保存…') : existingNote ? t('Open my note', '打开我的笔记') : t('Write a learning note', '写学习笔记')}</button><a href={resource.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-xs text-slate-600 hover:border-indigo-300 dark:border-slate-800 dark:text-slate-300">{t('Read the original', '查看原文')}<ExternalLink className="h-3.5 w-3.5" /></a></div>
          <p className="mt-3 text-[11px] leading-6 text-slate-400">{authLoading ? t('Restoring your session. You can read now; notes will be available once your account is ready.', '正在恢复登录状态，可以继续阅读；账号确认后即可写学习笔记。') : workspaceLoading ? t('Your notes are loading. The public library is ready to read.', '个人笔记正在加载，公共资料可以继续阅读。') : workspaceError ? t('Your workspace is unavailable, so note saving is paused. Reading is still available.', '个人工作区暂时不可用，笔记保存已暂停；资料仍可正常阅读。') : user ? t('Your learning notes are saved to your account for access on other devices.', '学习笔记保存到你的账号，可在其他设备登录后继续学习。') : t('Guest notes stay in this browser. Sign in to keep your notes across devices.', '访客笔记保存在当前浏览器；登录后创建的笔记可跨设备使用。')}</p>
        </header>

        {resource.kind === 'link' && <div className="mb-7 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/20"><h2 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">{t('Continue reading at the original source', '前往原站阅读全文')}</h2><p className="mt-2 text-xs leading-7 text-slate-600 dark:text-slate-400">{t('This entry provides the reading link and your own study space. The original article is not stored here because republication permission has not been confirmed.', '这里保存原文入口与自己的学习空间。尚未确认原文的转载授权，因此本站未存储其全文。')}</p><a href={resource.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">{t('Open original material', '打开原始资料')}<ExternalLink className="h-3.5 w-3.5" /></a></div>}
        {!isLoading && !loadFailed && <details ref={mobileContentsRef} className="mb-7 rounded-xl border border-slate-200 dark:border-slate-800 xl:hidden"><summary className="cursor-pointer px-4 py-3 text-xs font-medium">{t('On this page', '本文目录')}</summary><div className="max-h-[50vh] overflow-y-auto border-t border-slate-100 p-4 dark:border-slate-800">{contents}</div></details>}
        {isLoading ? <div role="status" className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t('Loading article…', '正在加载资料正文…')}</div> : loadFailed ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 dark:border-rose-900/60 dark:bg-rose-950/20"><p className="text-sm font-medium text-rose-700 dark:text-rose-300">{t('The article could not be loaded.', '暂时无法加载资料正文。')}</p><p className="mt-2 text-xs leading-6 text-slate-500">{t('Check your connection and retry, or read the original source.', '请检查网络后重试，也可以先前往原站阅读。')}</p><button onClick={() => setRetry(value => value + 1)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-rose-700 dark:bg-slate-900 dark:text-rose-300"><RefreshCw className="h-3.5 w-3.5" />{t('Retry loading', '重试加载')}</button></div> : <div ref={bodyRef} className="min-w-0 [overflow-wrap:anywhere] [&_img]:h-auto [&_img]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-400"><MarkdownRenderer content={body} headingLabels={headingLabels} /></div>}

        <footer aria-label={t('Source and license', '资料出处与授权')} className="mt-12 border-t border-slate-200 pb-8 pt-6 text-[11px] leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <h2 className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-300">{t('Source & attribution', '资料出处与授权')}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1"><dt>{t('Source', '来源')}</dt><dd className="min-w-0 break-words"><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">{source.name}</a></dd><dt>{t('Author', '作者')}</dt><dd className="min-w-0 break-words">{source.author}</dd><dt>{t('License', '授权')}</dt><dd className="min-w-0 break-words">{source.licenseUrl ? <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">{source.license}</a> : source.license}</dd><dt>{t('Checked', '收录核查')}</dt><dd>{checkedDate}</dd>{source.revision && <><dt>{t('Snapshot', '资料快照')}</dt><dd className="min-w-0 break-all font-mono">{source.revision}</dd></>}</dl>
          <p className="mt-4">{resource.kind === 'article' ? t('This is a saved snapshot. Refer to the original source for later updates and linked third-party materials.', '本站保存的是收录时的快照。后续更新及文中引用的第三方资料，请以原始来源为准。') : t('Only a reading link and original study prompts are provided here.', '本站仅提供原文入口与原创学习提示。')}</p>
        </footer>
      </div>
    </div>
    <aside className="hidden w-[220px] shrink-0 overflow-y-auto border-l border-slate-100 px-5 py-8 dark:border-slate-800 xl:block">{contents}</aside>
  </div>;
}
