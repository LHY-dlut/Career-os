import { lazy, Suspense, useMemo } from 'react';
import { ArrowRight, BookOpen, Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { libraryResources, librarySources } from '../services/learningLibrary';
import { preferLibraryLanguage } from '../services/libraryLanguage';
import { courseNodeTitle, flattenCourse, getLibraryCourses, libraryCourseLink } from '../services/libraryCourses';

const TrainingWorkspace = lazy(() => import('../components/training/TrainingWorkspace').then(module => ({ default: module.TrainingWorkspace })));

export function Home() {
  const { t, language, locale } = useI18n();
  const courses = useMemo(() => getLibraryCourses(preferLibraryLanguage(libraryResources, language), 'path', language).filter(course => course.id !== 'path-unclassified'), [language]);
  const checkedSources = useMemo(() => [...librarySources].filter(source => Number.isFinite(Date.parse(source.checkedAt))).sort((a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt)).slice(0, 4), []);

  return <div className="learning-home min-w-0 bg-white text-slate-900 dark:bg-[#090d16] dark:text-slate-100">
    <section className="learning-home-hero relative flex min-h-[455px] items-center justify-center overflow-hidden border-b border-slate-200/70 px-5 py-16 text-center dark:border-slate-800 sm:min-h-[485px]" aria-labelledby="home-title">
      <div className="relative z-10 mx-auto max-w-5xl">
        <p className="mx-auto mb-7 inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">{t('An AI learning and career knowledge base', '面向大模型算法的学习与求职知识库')}</p>
        <h1 id="home-title" className="text-[clamp(3rem,6vw,4.6rem)] font-bold leading-[1.1] tracking-[-0.055em]">AI Career <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent dark:from-sky-400 dark:to-violet-400">OS</span></h1>
        <p className="mx-auto mt-7 max-w-3xl text-lg font-medium leading-relaxed text-slate-700 dark:text-slate-200 sm:text-xl">{t('Build your own LLM knowledge system, from fundamentals to working code.', '从底层原理到代码实战，建立自己的大模型知识体系。')}</p>
        <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">{t('Connect Transformer, RAG, Agent, training and inference with exercises and interview preparation.', '串联 Transformer、RAG、Agent、模型训练与推理，让学习、练习和面试准备形成闭环。')}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/library" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">{t('Start learning', '开始学习')}<ArrowRight className="size-4" /></Link>
          <a href="#home-training" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><Code2 className="size-4" />{t('Code training', '代码训练')}</a>
        </div>
      </div>
    </section>

    <div className="mx-auto max-w-[1320px] space-y-16 px-4 py-12 sm:px-8 sm:py-16">
      <section id="home-training" aria-labelledby="home-training-title" className="scroll-mt-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-xs font-semibold text-blue-600 dark:text-sky-400">{t('PRACTICE AS YOU LEARN', '边学边练')}</p><h2 id="home-training-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{t('Start with a real exercise', '打开题目，直接写代码')}</h2><p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{t('Your drafts continue in the same workspace on this page, your dashboard and Coding Lab.', '首页、个人工作台与完整训练共用同一份题目和草稿。')}</p></div></div>
        <Suspense fallback={<p role="status" className="rounded-xl border border-slate-200 p-6 text-sm dark:border-slate-800">{t('Loading code training…', '正在加载代码训练…')}</p>}><TrainingWorkspace compact /></Suspense>
      </section>

      <section aria-labelledby="home-paths-title" className="border-t border-slate-200 pt-12 dark:border-slate-800">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold text-blue-600 dark:text-sky-400">{t('LEARNING PATHS', '学习路线')}</p><h2 id="home-paths-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{t('Follow a clear reading order', '沿着清晰的章节顺序学习')}</h2></div><Link to="/library" className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-sky-400">{t('All paths and topics', '查看全部路线与专题')}<ArrowRight className="size-4" /></Link></div>
        <div className="grid gap-x-10 md:grid-cols-2">{courses.map((course, index) => {
          const ids = flattenCourse(course);
          return <Link key={course.id} to={libraryCourseLink(ids[0], '', course, 'path')} className="group flex min-w-0 gap-4 border-t border-slate-200 py-5 hover:border-blue-300 dark:border-slate-800"><span className="pt-0.5 font-mono text-xs text-blue-600 dark:text-sky-400">{String(index + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1"><span className="block text-base font-semibold leading-7 group-hover:text-blue-700 dark:group-hover:text-sky-400">{courseNodeTitle(course, language)}</span><span className="mt-1 block text-xs leading-6 text-slate-500 dark:text-slate-400">{t(`${course.children.length} chapters · ${ids.length} reading entries`, `${course.children.length} 个章节 · ${ids.length} 个阅读条目`)}</span></span><ArrowRight className="mt-1 size-4 shrink-0 text-slate-400 group-hover:text-blue-600" /></Link>;
        })}</div>
      </section>

      <section aria-labelledby="home-updates-title" className="border-t border-slate-200 pt-12 dark:border-slate-800">
        <div className="mb-7"><p className="mb-2 text-xs font-semibold text-blue-600 dark:text-sky-400">{t('PUBLIC LIBRARY', '公共资料库')}</p><h2 id="home-updates-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{t('Recently checked sources', '最近核查的资料来源')}</h2><p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{t('Dates show when the library source was checked, not when the original author updated a lesson.', '日期表示本站核查来源的时间，并非原作者更新文章的时间。')}</p></div>
        <div className="divide-y divide-slate-200 border-t border-b border-slate-200 dark:divide-slate-800 dark:border-slate-800">{checkedSources.map(source => <Link key={source.id} to={`/library?view=source&source=${encodeURIComponent(source.id)}`} className="group flex items-center gap-4 py-4"><BookOpen className="size-4 shrink-0 text-blue-600 dark:text-sky-400" /><span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-blue-700 dark:group-hover:text-sky-400">{source.name}</span><time className="shrink-0 text-xs text-slate-500 dark:text-slate-400" dateTime={source.checkedAt}>{new Date(source.checkedAt).toLocaleDateString(locale)}</time><ArrowRight className="size-4 shrink-0 text-slate-400" /></Link>)}</div>
      </section>
    </div>
    <footer className="border-t border-slate-200 px-5 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">AI Career OS · {t('Learn, practice, prepare.', '学习、练习、准备面试。')}</footer>
  </div>;
}
