import { useI18n } from '../i18n/I18nProvider';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useData } from './DataProvider';
import { useWorkspaceActions } from './WorkspaceActions';
import { pathFor } from './navigation';
import { AppLayout } from '../layouts/AppLayout';

const Dashboard = lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Knowledge = lazy(() => import('../pages/Knowledge').then(m => ({ default: m.Knowledge })));
const Questions = lazy(() => import('../pages/Questions').then(m => ({ default: m.Questions })));
const Review = lazy(() => import('../pages/Review').then(m => ({ default: m.Review })));
const CodingLab = lazy(() => import('../pages/CodingLab').then(m => ({ default: m.CodingLab })));
const Applications = lazy(() => import('../pages/Applications').then(m => ({ default: m.Applications })));
const Interviews = lazy(() => import('../pages/Interviews').then(m => ({ default: m.Interviews })));
const AICopilot = lazy(() => import('../pages/AICopilot').then(m => ({ default: m.AICopilot })));
const Settings = lazy(() => import('../pages/Settings').then(m => ({ default: m.Settings })));
const Library = lazy(() => import('../pages/Library').then(m => ({ default: m.Library })));

function Page({ view }: { view: string }) {
  const { t, label } = useI18n();
  const { user, signIn, signOut } = useAuth();
  const { data, refresh, exportData, restore, reset } = useData();
  const { save, remove, recordReview, promoteQuestion, loadStarter } = useWorkspaceActions();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const id = Object.values(params)[0];
  const userId = user?.uid || 'guest';
  const go = (v: string, entityId?: string) => navigate(pathFor(v, entityId));
  const copilot = (prompt: string) => navigate('/copilot', { state: { prompt } });
  const knowledge = (title: string) => go('knowledge', data.articles.find(a => a.id === title || a.title.toLowerCase() === title.toLowerCase())?.id);
  const entityLists = { knowledge: data.articles, questions: data.questions, coding: data.codingProblems, applications: data.applications, interviews: data.interviews };
  if (id && view in entityLists && !entityLists[view as keyof typeof entityLists].some(e => e.id === id)) return <div className="p-10 space-y-3"><h2>{t("Record not found", "未找到记录")}</h2><p>{t("This record is unavailable in the current workspace.", "当前工作区中没有这条记录。")}</p><Link className="text-sky-500 underline" to={`/${view}`}>{t(`Back to ${view}`, `返回${label(view)}`)}</Link></div>;
  switch (view) {
    case 'dashboard': return <Dashboard {...data} onNavigate={go} onQuickAdd={type => navigate(`/${{ article: 'knowledge', question: 'questions', application: 'applications', interview: 'interviews' }[type]}?new=1`)} />;
    case 'knowledge': return <Knowledge articles={data.articles} selectedArticleId={id} onSaveArticle={value => save('articles', value)} onDeleteArticle={value => remove('articles', value)} onNavigateToCopilot={(content, title) => copilot(t(`Explain this article: ${title}\n\n${content}`, `请用中文讲解这篇文章：${title}\n\n${content}`))} userId={userId} />;
    case 'questions': return <Questions questions={data.questions} articles={data.articles} selectedQuestionId={id} onSaveQuestion={value => save('questions', value)} onDeleteQuestion={value => remove('questions', value)} onNavigateToReview={id => go('review', id)} onNavigateToKnowledge={knowledge} onNavigateToCopilot={(q, a) => copilot(t(`Critique my answer.\nQuestion: ${q}\nAnswer: ${a}`, `请用中文点评我的回答。\n问题：${q}\n回答：${a}`))} userId={userId} />;
    case 'review': return <Review key={location.search} questions={data.questions} initialQuestionId={new URLSearchParams(location.search).get('question') || undefined} onRecordReview={recordReview} onNavigateToKnowledge={knowledge} onNavigateToDashboard={() => go('dashboard')} />;
    case 'coding': return <CodingLab key={id} problems={data.codingProblems} attempts={data.codingAttempts} selectedProblemId={id} onSaveAttempt={value => save('codingAttempts', value)} userId={userId} />;
    case 'applications': return <Applications applications={data.applications} selectedAppId={id} onSaveApplication={value => save('applications', value)} onDeleteApplication={value => remove('applications', value)} onNavigateToCopilotJD={jd => copilot(t(`Analyze this job description:\n\n${jd}`, `请用中文分析这份岗位描述：\n\n${jd}`))} onQuickLogInterview={app => navigate(`/interviews?new=1&application=${encodeURIComponent(app.id)}`)} userId={userId} />;
    case 'interviews': return <Interviews interviews={data.interviews} interviewQuestions={data.interviewQuestions} applications={data.applications} selectedInterviewId={id} onSaveInterview={value => save('interviews', value)} onDeleteInterview={value => remove('interviews', value)} onSaveInterviewQuestion={value => save('interviewQuestions', value)} onAddToQuestionBank={promoteQuestion} userId={userId} />;
    case 'copilot': return <AICopilot initialPrompt={location.state?.prompt || ''} />;
    case 'settings': return <Settings user={user} onSignIn={signIn} onSignOut={signOut} onRefreshData={refresh} onExport={exportData} onRestore={restore} onReset={reset} onLoadStarter={loadStarter} canLoadStarter={!data.articles.length && !data.questions.length && !data.codingProblems.length} />;
    default: return <div className="p-10"><h2>{t("Page not found", "页面不存在")}</h2><Link to="/dashboard">{t("Return to dashboard", "返回学习总览")}</Link></div>;
  }
}
export function AppRoutes() {
  const { t } = useI18n();
  return <Suspense fallback={<div role="status" className="p-12">{t("Loading page…", "正在加载页面…")}</div>}><Routes>
    <Route element={<AppLayout />}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      {['dashboard', 'knowledge', 'questions', 'review', 'coding', 'applications', 'interviews', 'copilot', 'settings'].map(view => <Route key={view} path={view} element={<Page view={view} />} />)}
      <Route path="knowledge/:articleId" element={<Page view="knowledge" />} />
      <Route path="library" element={<Library />} />
      <Route path="library/:resourceId" element={<Library />} />
      <Route path="questions/:questionId" element={<Page view="questions" />} />
      <Route path="coding/:problemId" element={<Page view="coding" />} />
      <Route path="applications/:applicationId" element={<Page view="applications" />} />
      <Route path="interviews/:interviewId" element={<Page view="interviews" />} />
      <Route path="*" element={<Page view="404" />} />
    </Route>
  </Routes></Suspense>;
}
