import { useI18n } from '../i18n/I18nProvider';
import React from 'react';
import {
  Sparkles,
  Calendar,
  RotateCcw,
  CheckCircle2,
  Clock,
  Briefcase,
  Code2,
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import type {
  KnowledgeArticle,
  Question,
  Application,
  Interview,
  ReviewHistory,
  CodingProblem,
  CodingAttempt,
} from '../types';

interface DashboardProps {
  questions: Question[];
  articles: KnowledgeArticle[];
  applications: Application[];
  interviews: Interview[];
  reviewHistory: ReviewHistory[];
  codingProblems: CodingProblem[];
  codingAttempts: CodingAttempt[];
  onNavigate: (view: string, id?: string) => void;
  onQuickAdd: (type: 'article' | 'question' | 'application' | 'interview') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  questions,
  articles,
  applications,
  interviews,
  reviewHistory,
  codingProblems,
  codingAttempts,
  onNavigate,
  onQuickAdd,
}) => {
  const { t, locale, label } = useI18n();
  const now = new Date();

  // Questions due for review today
  const dueQuestions = questions.filter((q) => {
    if (!q.nextReviewAt) return true; // Unseen or unreviewed
    return new Date(q.nextReviewAt) <= now;
  });

  const masteredQuestions = questions.filter((q) => q.masteryLevel === 'Mastered');
  const learningQuestions = questions.filter(
    (q) => q.masteryLevel === 'Learning' || q.masteryLevel === 'Reviewing'
  );

  // Upcoming interviews
  const upcomingInterviews = interviews
    .filter((inv) => inv.result === 'Scheduled' && new Date(inv.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // Applications pipeline breakdown
  const stages = [
    { label: 'Wishlist', count: applications.filter((a) => a.status === 'Wishlist').length, color: 'text-zinc-500' },
    { label: 'Applied', count: applications.filter((a) => a.status === 'Applied').length, color: 'text-blue-500' },
    { label: 'Assessment', count: applications.filter((a) => a.status === 'Assessment').length, color: 'text-amber-500' },
    { label: 'Interviewing', count: applications.filter((a) => a.status === 'Interviewing').length, color: 'text-indigo-500' },
    { label: 'Offer', count: applications.filter((a) => a.status === 'Offer').length, color: 'text-emerald-500' },
    { label: 'Rejected', count: applications.filter((a) => a.status === 'Rejected').length, color: 'text-rose-500' },
  ];

  // Category mastery calculation
  const categories = ['Transformer', 'LLM', 'RAG', 'Agent', 'Inference', 'Machine Learning'];
  const categoryStats = categories.map((cat) => {
    const catQuestions = questions.filter((q) =>
      q.category.toLowerCase().includes(cat.toLowerCase())
    );
    const catMastered = catQuestions.filter((q) => q.masteryLevel === 'Mastered').length;
    const catTotal = catQuestions.length || 1;
    const percentage = Math.round((catMastered / catTotal) * 100);
    return {
      category: cat,
      mastered: catMastered,
      total: catQuestions.length,
      percentage: catQuestions.length === 0 ? 0 : percentage,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner / Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-blue-50/50 dark:from-[#131926] dark:via-[#10141e] dark:to-[#0f1422] border border-indigo-100/80 dark:border-indigo-950/60 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {t("Personal Interview Prep OS", "个人面试准备工作台")}
            </span>
            <span className="text-xs text-zinc-400">
              {now.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("LLM & Algorithm Engineering Readiness", "大模型与算法工程师求职准备")}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
            {t("Knowledge Learning → Question Bank → Coding Practice → Applications → Retrospective → Spaced Review", "知识学习 → 面试题库 → 编程练习 → 求职投递 → 面试复盘 → 间隔复习")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('review')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold whitespace-nowrap shadow-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t(`Review ${dueQuestions.length} Questions`, `复习 ${dueQuestions.length} 道题`)}</span>
          </button>
          <button
            onClick={() => onNavigate('copilot')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium whitespace-nowrap transition-colors"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>{t("AI Copilot", "AI 助手")}</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('questions')}
          className="p-4 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
            <span>{t("Question Bank", "面试题库")}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {questions.length}
            </span>
            <span className="text-xs text-zinc-500">
              {t(`(${masteredQuestions.length} Mastered)`, `（已掌握 ${masteredQuestions.length} 道）`)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 flex items-center justify-between">
            <span>{t("Mastery rate", "掌握率")}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {questions.length > 0 ? Math.round((masteredQuestions.length / questions.length) * 100) : 0}%
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('review')}
          className="p-4 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-amber-300 dark:hover:border-amber-800 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
            <span>{t("Due for Review", "待复习题目")}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {dueQuestions.length}
            </span>
            <span className="text-xs text-zinc-500">{t("questions", "道题")}</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
            <span>{t("Ready for spaced recall", "开始间隔复习，巩固记忆")}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('applications')}
          className="p-4 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-blue-300 dark:hover:border-blue-800 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
            <span>{t("Applications CRM", "求职管理")}</span>
            <Briefcase className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {applications.length}
            </span>
            <span className="text-xs text-zinc-500">
              {t(`(${applications.filter((a) => a.status === 'Interviewing').length} active)`, `（面试中 ${applications.filter((a) => a.status === 'Interviewing').length} 个）`)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 flex items-center justify-between">
            <span>{t("Offers secured", "已获录用")}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {applications.filter((a) => a.status === 'Offer').length}
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('interviews')}
          className="p-4 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-purple-300 dark:hover:border-purple-800 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
            <span>{t("Upcoming Rounds", "即将到来的面试")}</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {upcomingInterviews.length}
            </span>
            <span className="text-xs text-zinc-500">{t("scheduled", "场已安排")}</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 truncate">
            {upcomingInterviews[0] ? (
              <span>{t('Next:', '下一场：')} {upcomingInterviews[0].companyName}</span>
            ) : (
              <span>{t("No upcoming rounds", "暂无待面试轮次")}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Today Priorities & Knowledge Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Today Action Items & Up Next */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Interviews Card */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("Upcoming Interviews & Scheduled Rounds", "待面试与已安排轮次")}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('interviews')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>{t("View All", "查看全部")}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {upcomingInterviews.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg">
                {t("No interviews scheduled for this week. Log a new round when recruiters reach out!", "暂无待面试安排。收到招聘方通知后，可以添加新的面试轮次。")}
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingInterviews.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => onNavigate('interviews', inv.id)}
                    className="p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-300 dark:hover:border-indigo-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {inv.companyName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">
                          {t(`Round ${inv.roundNumber}`, `第 ${inv.roundNumber} 轮`)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {inv.roundName} {t(`(${inv.durationMinutes} min)`, `（${inv.durationMinutes} 分钟）`)}
                      </p>
                    </div>

                    <div className="text-right text-xs">
                      <div className="font-medium text-zinc-900 dark:text-zinc-200">
                        {new Date(inv.scheduledAt).toLocaleDateString(locale, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {new Date(inv.scheduledAt).toLocaleTimeString(locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today Spaced Repetition Queue */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t(`Questions to Review Today (${dueQuestions.length})`, `今日待复习（${dueQuestions.length} 道）`)}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('review')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>{t("Start Review", "开始复习")}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {dueQuestions.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg">
                {t("Great job! All spaced review questions are up to date.", "已完成所有到期复习，继续保持！")}
              </div>
            ) : (
              <div className="space-y-2">
                {dueQuestions.slice(0, 4).map((q) => (
                  <div
                    key={q.id}
                    onClick={() => onNavigate('questions', q.id)}
                    className="p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 hover:border-indigo-300 dark:hover:border-indigo-800 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {q.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                          {label(q.category)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 line-clamp-1">
                        {q.conciseAnswer}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${
                        q.difficulty === 'Easy'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : q.difficulty === 'Medium'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                      }`}
                    >
                      {label(q.difficulty)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Job Pipeline Funnel Cards */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("Application Pipeline Funnel", "求职进度概览")}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('applications')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>{t("Manage CRM", "管理投递")}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {stages.map((st) => (
                <div
                  key={st.label}
                  onClick={() => onNavigate('applications')}
                  className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 text-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
                >
                  <div className="text-[11px] text-zinc-500 mb-1">{label(st.label)}</div>
                  <div className={`text-xl font-bold ${st.color}`}>{st.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Mastery by Category & Coding Spotlight */}
        <div className="space-y-6">
          {/* Category Mastery Progress */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("Mastery by Category", "各分类掌握情况")}
                </h3>
              </div>
              <span className="text-[11px] text-zinc-500">
                {t(`${masteredQuestions.length}/${questions.length} Mastered`, `已掌握 ${masteredQuestions.length}/${questions.length}`)}
              </span>
            </div>

            <div className="space-y-3.5">
              {categoryStats.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {label(item.category)}
                    </span>
                    <span className="text-zinc-500 text-[11px]">
                      {item.mastered}/{item.total} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coding Practice Quick Start */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("Coding Lab Focus", "编程练习推荐")}
                </h3>
              </div>
              <span className="text-[11px] text-zinc-500">
                {t(`${codingAttempts.length} attempts`, `${codingAttempts.length} 次练习`)}
              </span>
            </div>

            {codingProblems[0] && (
              <div className="p-3.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {codingProblems[0].title}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-medium">
                    {label(codingProblems[0].difficulty)}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 line-clamp-2">
                  {codingProblems[0].problemDescription}
                </p>
                <button
                  onClick={() => onNavigate('coding', codingProblems[0].id)}
                  className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                >
                  {t("Open in Coding Lab", "打开编程练习")}
                </button>
              </div>
            )}
          </div>

          {/* Quick Knowledge Articles reference */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("Knowledge Hub", "知识库")}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('knowledge')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t(`Browse All (${articles.length})`, `查看全部（${articles.length} 篇）`)}
              </button>
            </div>

            <div className="space-y-1.5">
              {articles.slice(0, 3).map((art) => (
                <button
                  key={art.id}
                  onClick={() => onNavigate('knowledge', art.id)}
                  className="w-full text-left p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors flex items-center justify-between group"
                >
                  <div className="overflow-hidden">
                    <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {art.title}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">
                      {label(art.category)}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
