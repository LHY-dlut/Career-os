import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LibraryCourse, LibraryCourseNode, LibraryResource } from '../../content/library/types';
import { useI18n } from '../../i18n/I18nProvider';
import { courseNodeTitle, findCoursePath, flattenCourse, libraryCourseLink } from '../../services/libraryCourses';

interface Props {
  resources: LibraryResource[];
  courses: LibraryCourse[];
  course: LibraryCourse;
  current: LibraryResource;
  search: string;
  onCourseChange: (course: LibraryCourse) => void;
  onNavigate?: () => void;
}

export function LibraryTree({ resources, courses, course, current, search, onCourseChange, onNavigate }: Props) {
  const { t, language } = useI18n();
  const navRef = useRef<HTMLElement>(null);
  const ancestors = findCoursePath(course, current.id).map(node => node.id);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ancestors));
  useEffect(() => {
    setExpanded(previous => new Set([...previous, ...findCoursePath(course, current.id).map(node => node.id)]));
    const frame = requestAnimationFrame(() => navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' }));
    return () => cancelAnimationFrame(frame);
  }, [course.id, current.id]);
  const toggle = (id: string) => setExpanded(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const renderNode = (node: LibraryCourseNode, depth = 0) => {
    const resource = resources.find(item => item.id === node.resourceId);
    const isActive = current.id === node.resourceId;
    const isOpen = expanded.has(node.id);
    const title = courseNodeTitle(node, language);
    return <li key={node.id} className="min-w-0">
      <div className={`flex items-start gap-1 rounded-lg ${isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>
        {node.children.length ? <button aria-label={t(`${isOpen ? 'Collapse' : 'Expand'} ${title}`, `${isOpen ? '收起' : '展开'}${title}`)} aria-expanded={isOpen} onClick={() => toggle(node.id)} className="mt-1 shrink-0 rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">{isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</button> : <span className="w-4 shrink-0" />}
        {resource ? <Link to={libraryCourseLink(resource.id, search, course, course.mode)} onClick={onNavigate} aria-current={isActive ? 'page' : undefined} className={`min-w-0 flex-1 break-words py-2 pr-2 text-xs leading-5 hover:text-indigo-600 ${isActive ? 'font-semibold' : ''}`}><span>{title}</span>{resource.contentStatus === 'outline' && <span className="ml-1 text-[9px] font-normal text-amber-600 dark:text-amber-400">{t('Outline', '提纲')}</span>}</Link> : <button onClick={() => toggle(node.id)} className={`min-w-0 flex-1 py-2 pr-2 text-left text-xs font-semibold leading-5 ${depth === 0 ? 'text-slate-800 dark:text-slate-200' : ''}`}>{title}</button>}
      </div>
      {node.children.length > 0 && isOpen && <ul className="ml-3 border-l border-slate-200 pl-1 dark:border-slate-800">{node.children.map(child => renderNode(child, depth + 1))}</ul>}
    </li>;
  };
  return <nav ref={navRef} aria-label={t('Source document navigation', '来源文档导航')} className="text-xs">
    <Link onClick={onNavigate} to={libraryCourseLink(undefined, search, course, course.mode)} className="mb-5 flex items-center gap-2 font-medium text-indigo-600 dark:text-indigo-400"><BookOpen className="h-4 w-4" />{t('Back to learning library', '返回学习资料库')}</Link>
    <label className="mb-5 block"><span className="mb-2 block text-[10px] text-slate-400">{course.mode === 'path' ? t('Learning path', '学习路线') : t('Source course', '来源课程')}</span><select aria-label={t('Current course', '当前课程')} value={course.id} onChange={event => { const next = courses.find(item => item.id === event.target.value); if (next) onCourseChange(next); }} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs leading-5 dark:border-slate-800 dark:bg-slate-900">{courses.map(item => <option key={item.id} value={item.id}>{courseNodeTitle(item, language)}</option>)}</select></label>
    <p className="mb-4 text-[10px] text-slate-400">{t(`${flattenCourse(course).length} reading entries`, `${flattenCourse(course).length} 个阅读条目`)} · {course.mode === 'path' ? t('Curated by Career OS', '本站学习编排') : t('Original source structure', '原始来源结构')}</p>
    <ul className="space-y-1">{course.children.map(child => renderNode(child))}</ul>
  </nav>;
}
