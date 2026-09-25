import { useI18n } from '../i18n/I18nProvider';
import { Dialog } from '../components/common/Dialog';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  Star,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Edit3,
  Trash2,
  ArrowRight,
  BookOpen,
  Sparkles,
  X,
  Layers,
} from 'lucide-react';
import type {
  Interview,
  InterviewQuestion,
  Application,
  InterviewResult,
  Question,
} from '../types';
import { useToast } from '../components/common/Toast';
import { generateId } from '../utils/id';

interface InterviewsProps {
  interviews: Interview[];
  interviewQuestions: InterviewQuestion[];
  applications: Application[];
  selectedInterviewId?: string;
  onSaveInterview: (interview: Interview) => Promise<void>;
  onDeleteInterview: (interviewId: string) => Promise<void>;
  onSaveInterviewQuestion: (iq: InterviewQuestion) => Promise<void>;
  onAddToQuestionBank: (question: Omit<Question, 'id' | 'userId'>, interviewQuestion: InterviewQuestion) => Promise<void>;
  userId: string;
}

const RESULTS: InterviewResult[] = [
  'Scheduled',
  'Pending',
  'Passed',
  'Failed',
  'Cancelled',
];

export const Interviews: React.FC<InterviewsProps> = ({
  interviews,
  interviewQuestions,
  applications,
  selectedInterviewId,
  onSaveInterview,
  onDeleteInterview,
  onSaveInterviewQuestion,
  onAddToQuestionBank,
  userId,
}) => {
  const { t, locale, label } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const activeInterviewId = selectedInterviewId || interviews[0]?.id || '';
  const setActiveInterviewId = (id: string) => navigate(`/interviews/${encodeURIComponent(id)}`);

  const currentInterview = useMemo(() => {
    return (
      interviews.find((i) => i.id === activeInterviewId) || interviews[0] || null
    );
  }, [interviews, activeInterviewId]);

  // Questions specifically for current interview
  const currentQuestions = useMemo(() => {
    if (!currentInterview) return [];
    return interviewQuestions.filter((iq) => iq.interviewId === currentInterview.id);
  }, [interviewQuestions, currentInterview]);

  // Add / Edit Interview Modal
  const [isEditingInterview, setIsEditingInterview] = useState(false);
  const [interviewFormData, setInterviewFormData] = useState<Partial<Interview>>({});

  // Add Interview Question Modal
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [iqFormData, setIqFormData] = useState<Partial<InterviewQuestion>>({});

  const handleOpenAddInterview = () => {
    const defaultApp = applications.find(a => a.id === new URLSearchParams(location.search).get('application')) || applications[0];
    if (!defaultApp) { showToast(t("Create an application before adding an interview.", "请先添加一条投递记录，再记录面试。"), 'error'); return; }
    setInterviewFormData({
      applicationId: defaultApp?.id || 'manual',
      companyName: defaultApp?.company || 'ByteDance',
      position: defaultApp?.position || 'LLM Algorithm Engineer',
      roundNumber: 1,
      roundName: 'Technical Screen: Algorithms & Deep Learning',
      scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      durationMinutes: 60,
      result: 'Scheduled',
      overallSelfRating: 4,
      retrospective: '',
      rawNotes: '',
    });
    setIsEditingInterview(true);
  };

  const handleSaveInterview = async () => {
    if (!applications.some(a => a.id === interviewFormData.applicationId)) { showToast(t("Select an existing application.", "请选择已有的投递记录。"), 'error'); return; }
    if (!interviewFormData.companyName?.trim()) {
      showToast(t("Company name is required", "请填写公司名称"), 'error');
      return;
    }

    const id = interviewFormData.id || generateId();
    const toSave: Interview = {
      id,
      userId,
      applicationId: interviewFormData.applicationId || 'manual',
      companyName: interviewFormData.companyName || 'Unknown',
      position: interviewFormData.position || 'Algorithm Engineer',
      roundNumber: Number(interviewFormData.roundNumber) || 1,
      roundName: interviewFormData.roundName || 'Technical Round',
      scheduledAt: interviewFormData.scheduledAt || new Date().toISOString(),
      durationMinutes: Number(interviewFormData.durationMinutes) || 60,
      result: (interviewFormData.result as InterviewResult) || 'Scheduled',
      overallSelfRating: interviewFormData.overallSelfRating,
      retrospective: interviewFormData.retrospective || '',
      rawNotes: interviewFormData.rawNotes || '',
      createdAt: interviewFormData.createdAt || new Date().toISOString(),
    };

    try { await onSaveInterview(toSave); } catch { return; }
    setActiveInterviewId(id);
    setIsEditingInterview(false);
    showToast(t("Interview round saved", "面试轮次已保存"));
  };

  const handleSaveIQ = async () => {
    if (!currentInterview) return;
    if (!iqFormData.customQuestion?.trim()) {
      showToast(t("Question content is required", "请填写问题内容"), 'error');
      return;
    }

    const iq: InterviewQuestion = {
      id: generateId(),
      userId,
      interviewId: currentInterview.id,
      customQuestion: iqFormData.customQuestion || '',
      myAnswer: iqFormData.myAnswer || '',
      betterAnswer: iqFormData.betterAnswer || '',
      performanceScore: Number(iqFormData.performanceScore) || 4,
      notes: iqFormData.notes || '',
      createdAt: new Date().toISOString(),
    };

    try { await onSaveInterviewQuestion(iq); } catch { return; }
    setIsAddingQuestion(false);
    setIqFormData({});
    showToast(t("Interview question logged", "面试问题已记录"));
  };

  // Convert an interview question into a Question Bank card!
  const handlePromoteToBank = async (iq: InterviewQuestion) => {
    try { await onAddToQuestionBank({
      title: iq.customQuestion || 'Interview Question',
      category: 'Project Deep Dive',
      difficulty: 'Medium',
      tags: [currentInterview?.companyName || 'Interview', 'RealInterview'],
      conciseAnswer: iq.betterAnswer || iq.myAnswer || 'Key summary of the interview answer...',
      detailedAnswer: `### Question asked at ${currentInterview?.companyName} (${currentInterview?.roundName})\n\n**Candidate's Response:**\n${iq.myAnswer}\n\n**Better Response & Derivation:**\n${iq.betterAnswer}\n\n**Interviewer Notes:**\n${iq.notes}`,
      followUps: [],
      masteryLevel: 'Reviewing',
      intervalDays: 3,
      reviewCount: 0,
      nextReviewAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, iq); } catch { return; }
    showToast(t('Added to Question Bank & Spaced Review!', '已加入面试题库与间隔复习！'));
  };

  React.useEffect(() => {
    if (new URLSearchParams(location.search).get('new') === '1') {
      handleOpenAddInterview();
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]);

  return (
    <div className="flex-1 flex overflow-hidden h-full min-h-0 bg-[#fbfbfb] dark:bg-[#0c1017]">
      {/* LEFT LIST: Interview Rounds (320px) */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-[#10141e]/70 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              {t("Interview Rounds", "面试轮次")}
            </span>
          </div>
          <button
            onClick={handleOpenAddInterview}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("New Round", "新增轮次")}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {interviews.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              {t("No interview rounds logged yet.", "尚未记录面试轮次。")}
            </div>
          ) : (
            interviews.map((inv) => {
              const isSelected = inv.id === currentInterview?.id;
              return (
                <div
                  key={inv.id}
                  onClick={() => setActiveInterviewId(inv.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 shadow-2xs'
                      : 'bg-white dark:bg-[#12161f] border-zinc-200/70 dark:border-zinc-800/70 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {inv.companyName}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        inv.result === 'Passed'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                          : inv.result === 'Scheduled'
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                          : inv.result === 'Failed'
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {label(inv.result)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium truncate">
                    {t(`Round ${inv.roundNumber}:`, `第 ${inv.roundNumber} 轮：`)} {inv.roundName}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(inv.scheduledAt).toLocaleDateString(locale)}</span>
                    </div>
                    {inv.overallSelfRating && (
                      <div className="flex items-center gap-1 text-amber-500 font-medium">
                        <Star className="w-3 h-3 fill-amber-500" />
                        <span>{inv.overallSelfRating}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CENTER: Interview Retrospective & Questions Deep Dive */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
        {currentInterview ? (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Top Overview Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      {t(`Round ${currentInterview.roundNumber}`, `第 ${currentInterview.roundNumber} 轮`)}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        currentInterview.result === 'Passed'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : currentInterview.result === 'Scheduled'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {label(currentInterview.result)}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {currentInterview.companyName} — {currentInterview.roundName}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {t('Position:', '职位：')} {currentInterview.position} • {t(`Duration: ${currentInterview.durationMinutes} min`, `时长：${currentInterview.durationMinutes} 分钟`)} • {t('Scheduled:', '面试时间：')} {new Date(currentInterview.scheduledAt).toLocaleString(locale)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    aria-label={t("Edit interview round", "编辑面试轮次")}
                    onClick={() => {
                      setInterviewFormData(currentInterview);
                      setIsEditingInterview(true);
                    }}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    aria-label={t("Delete interview round", "删除面试轮次")}
                    onClick={async () => {
                      if (confirm(t(`Delete interview round and all its logged questions for ${currentInterview.companyName}?`, `确定删除 ${currentInterview.companyName} 的本轮面试及其所有已记录的问题吗？`))) {
                        try { await onDeleteInterview(currentInterview.id); } catch { return; }
                        showToast(t("Interview round deleted", "面试轮次已删除"));
                      }
                    }}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Retrospective Section */}
              {currentInterview.retrospective && (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    {t("Interview Retrospective & Key Takeaways", "面试复盘与关键收获")}
                  </span>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed">
                    {currentInterview.retrospective}
                  </p>
                </div>
              )}
            </div>

            {/* Questions Asked In This Interview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {t(`Questions Asked (${currentQuestions.length})`, `面试问题（${currentQuestions.length} 道）`)}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {t("Log questions from this interview and promote them directly into your Question Bank", "记录本轮面试的问题，随时加入面试题库")}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setIqFormData({ performanceScore: 4 });
                    setIsAddingQuestion(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("Log Question", "记录问题")}</span>
                </button>
              </div>

              {currentQuestions.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 bg-white dark:bg-[#12161f] rounded-xl border border-zinc-200 dark:border-zinc-800">
                  {t("No questions logged for this round yet. Click \"Log Question\" to capture questions asked by the interviewer.", "本轮还没有记录问题。点击“记录问题”，保存面试官提出的问题。")}
                </div>
              ) : (
                <div className="space-y-4">
                  {currentQuestions.map((iq) => (
                    <div
                      key={iq.id}
                      className="p-5 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            {t("Interview Question", "面试问题")}
                          </span>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {iq.customQuestion}
                          </h4>
                        </div>

                        {/* Promote to Bank Button */}
                        <button
                          disabled={Boolean(iq.questionId)}
                          onClick={() => handlePromoteToBank(iq)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-colors shrink-0"
                          title={t("Add to Question Bank & Spaced Review", "加入面试题库与间隔复习")}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{iq.questionId ? t('Linked to Question Bank', '已关联题库') : t('Add to Question Bank', '加入面试题库')}</span>
                        </button>
                      </div>

                      {/* Answers comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 space-y-1">
                          <span className="font-semibold text-zinc-500">{t("My Answer:", "我的回答：")}</span>
                          <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                            {iq.myAnswer || t('No notes', '暂无记录')}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {t("Better / Target Answer:", "改进后的回答 / 目标答案：")}
                          </span>
                          <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-line">
                            {iq.betterAnswer || t('No notes', '暂无记录')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
            {t("Select an interview round from the list or log a new round.", "从列表中选择一个面试轮次，或新增轮次。")}
          </div>
        )}
      </div>

      {/* LOG QUESTION MODAL */}
      {isAddingQuestion && (
        <Dialog onClose={() => setIsAddingQuestion(false)} aria-label={t("Interview question editor", "面试问题编辑")} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t(`Log Question from ${currentInterview?.companyName}`, `记录 ${currentInterview?.companyName} 的面试问题`)}
              </h3>
              <button aria-label={t("Close", "关闭")}
                onClick={() => setIsAddingQuestion(false)}
                className="text-zinc-400 hover:text-zinc-600"
              ><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="interviews-field-0" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t("Question Asked", "面试问题")}
                </label>
                <input id="interviews-field-0"
                  type="text"
                  value={iqFormData.customQuestion || ''}
                  onChange={(e) =>
                    setIqFormData({ ...iqFormData, customQuestion: e.target.value })
                  }
                  placeholder={t("e.g. How does PagedAttention eliminate memory fragmentation?", "例如：PagedAttention 如何消除显存碎片？")}
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label htmlFor="interviews-field-1" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t("What I Said in the Interview", "我在面试中的回答")}
                </label>
                <textarea id="interviews-field-1"
                  rows={3}
                  value={iqFormData.myAnswer || ''}
                  onChange={(e) =>
                    setIqFormData({ ...iqFormData, myAnswer: e.target.value })
                  }
                  placeholder={t("My actual verbal response during the round...", "记录我在面试中的实际回答…")}
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label htmlFor="interviews-field-2" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t("Better / Ideal Answer after Retrospective", "复盘后的改进回答 / 理想答案")}
                </label>
                <textarea id="interviews-field-2"
                  rows={4}
                  value={iqFormData.betterAnswer || ''}
                  onChange={(e) =>
                    setIqFormData({ ...iqFormData, betterAnswer: e.target.value })
                  }
                  placeholder={t("The precise, mathematically rigorous response I should have given...", "记录复盘后更准确、推导更严谨的答案…")}
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsAddingQuestion(false)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600"
              >
                {t("Cancel", "取消")}
              </button>
              <button
                onClick={handleSaveIQ}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                {t("Save Question", "保存问题")}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ADD / EDIT INTERVIEW MODAL */}
      {isEditingInterview && (
        <Dialog onClose={() => setIsEditingInterview(false)} aria-label={t("Interview editor", "面试轮次编辑")} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {interviewFormData.id ? t('Edit Interview Round', '编辑面试轮次') : t('Log Interview Round', '记录面试轮次')}
              </h3>
              <button aria-label={t("Close", "关闭")}
                onClick={() => setIsEditingInterview(false)}
                className="text-zinc-400 hover:text-zinc-600"
              ><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">{t("Application", "关联投递")}
                <select aria-label={t("Application", "关联投递")} className="block w-full p-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700" value={interviewFormData.applicationId || ''} onChange={e => { const application = applications.find(a => a.id === e.target.value); if (application) setInterviewFormData({ ...interviewFormData, applicationId: application.id, companyName: application.company, position: application.position }); }}>{applications.map(a => <option key={a.id} value={a.id}>{a.company} — {a.position}</option>)}</select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="interviews-field-3" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t("Company Name", "公司名称")}
                  </label>
                  <input id="interviews-field-3"
                    type="text"
                    value={interviewFormData.companyName || ''}
                    onChange={(e) =>
                      setInterviewFormData({
                        ...interviewFormData,
                        companyName: e.target.value,
                      })
                    }
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label htmlFor="interviews-field-4" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t("Position", "职位")}
                  </label>
                  <input id="interviews-field-4"
                    type="text"
                    value={interviewFormData.position || ''}
                    onChange={(e) =>
                      setInterviewFormData({
                        ...interviewFormData,
                        position: e.target.value,
                      })
                    }
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="interviews-field-5" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t("Round Number", "轮次序号")}
                  </label>
                  <input id="interviews-field-5"
                    type="number"
                    value={interviewFormData.roundNumber || 1}
                    onChange={(e) =>
                      setInterviewFormData({
                        ...interviewFormData,
                        roundNumber: Number(e.target.value),
                      })
                    }
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label htmlFor="interviews-field-6" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t("Result Status", "结果状态")}
                  </label>
                  <select id="interviews-field-6"
                    value={interviewFormData.result || 'Scheduled'}
                    onChange={(e) =>
                      setInterviewFormData({
                        ...interviewFormData,
                        result: e.target.value as any,
                      })
                    }
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  >
                    {RESULTS.map((r) => (
                      <option key={r} value={r}>
                        {label(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="interviews-field-7" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t("Duration (min)", "时长（分钟）")}
                  </label>
                  <input id="interviews-field-7"
                    type="number"
                    value={interviewFormData.durationMinutes || 60}
                    onChange={(e) =>
                      setInterviewFormData({
                        ...interviewFormData,
                        durationMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="interviews-field-8" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t("Round Name / Topic Focus", "轮次名称 / 考察方向")}
                </label>
                <input id="interviews-field-8"
                  type="text"
                  value={interviewFormData.roundName || ''}
                  onChange={(e) =>
                    setInterviewFormData({
                      ...interviewFormData,
                      roundName: e.target.value,
                    })
                  }
                  placeholder={t("e.g. LLM Architecture & Systems Design", "例如：大模型架构与系统设计")}
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label htmlFor="interviews-field-9" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t("Retrospective / Debrief", "面试复盘")}
                </label>
                <textarea id="interviews-field-9"
                  rows={4}
                  value={interviewFormData.retrospective || ''}
                  onChange={(e) =>
                    setInterviewFormData({
                      ...interviewFormData,
                      retrospective: e.target.value,
                    })
                  }
                  placeholder={t("How did it go? What questions were easy? What points were weak?", "面试表现如何？哪些问题回答顺利？哪些知识点需要补强？")}
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsEditingInterview(false)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600"
              >
                {t("Cancel", "取消")}
              </button>
              <button
                onClick={handleSaveInterview}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                {t("Save Round", "保存轮次")}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
