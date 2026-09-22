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
import { generateId } from '../services/db';

interface InterviewsProps {
  interviews: Interview[];
  interviewQuestions: InterviewQuestion[];
  applications: Application[];
  selectedInterviewId?: string;
  onSaveInterview: (interview: Interview) => Promise<void>;
  onDeleteInterview: (interviewId: string) => Promise<void>;
  onSaveInterviewQuestion: (iq: InterviewQuestion) => Promise<void>;
  onAddToQuestionBank: (question: Omit<Question, 'id' | 'userId'>) => Promise<void>;
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
  const { showToast } = useToast();
  const [activeInterviewId, setActiveInterviewId] = useState<string>(
    selectedInterviewId || interviews[0]?.id || ''
  );

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
    const defaultApp = applications[0];
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
    if (!interviewFormData.companyName?.trim()) {
      showToast('Company name is required', 'error');
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

    await onSaveInterview(toSave);
    setActiveInterviewId(id);
    setIsEditingInterview(false);
    showToast('Interview round saved');
  };

  const handleSaveIQ = async () => {
    if (!currentInterview) return;
    if (!iqFormData.customQuestion?.trim()) {
      showToast('Question content is required', 'error');
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

    await onSaveInterviewQuestion(iq);
    setIsAddingQuestion(false);
    setIqFormData({});
    showToast('Interview question logged');
  };

  // Convert an interview question into a Question Bank card!
  const handlePromoteToBank = async (iq: InterviewQuestion) => {
    await onAddToQuestionBank({
      title: iq.customQuestion || 'Interview Question',
      category: 'Project Deep Dive',
      difficulty: 'Medium',
      tags: [currentInterview?.companyName || 'Interview', 'RealInterview'],
      conciseAnswer: iq.betterAnswer || iq.myAnswer || 'Key summary of the interview answer...',
      detailedAnswer: `### Question asked at ${currentInterview?.companyName} (${currentInterview?.roundName})\n\n**Candidate's Response:**\n${iq.myAnswer}\n\n**Better Response & Derivation:**\n${iq.betterAnswer}\n\n**Interviewer Notes:**\n${iq.notes}`,
      followUps: ['How does this scale to larger batch sizes?'],
      masteryLevel: 'Reviewing',
      intervalDays: 3,
      reviewCount: 1,
      lastReviewedAt: new Date().toISOString(),
      nextReviewAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    showToast(`Added to Question Bank & Spaced Review!`);
  };

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-3.75rem)] bg-[#fbfbfb] dark:bg-[#0c1017]">
      {/* LEFT LIST: Interview Rounds (320px) */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-[#10141e]/70 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Interview Rounds
            </span>
          </div>
          <button
            onClick={handleOpenAddInterview}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Round</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {interviews.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No interview rounds logged yet.
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
                      {inv.result}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium truncate">
                    Round {inv.roundNumber}: {inv.roundName}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(inv.scheduledAt).toLocaleDateString()}</span>
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
                      Round {currentInterview.roundNumber}
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
                      {currentInterview.result}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {currentInterview.companyName} — {currentInterview.roundName}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Position: {currentInterview.position} • Duration: {currentInterview.durationMinutes} min • Scheduled: {new Date(currentInterview.scheduledAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setInterviewFormData(currentInterview);
                      setIsEditingInterview(true);
                    }}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Delete interview round for ${currentInterview.companyName}?`)) {
                        await onDeleteInterview(currentInterview.id);
                        showToast('Interview round deleted');
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
                    Interview Retrospective & Key Takeaways
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
                    Questions Asked ({currentQuestions.length})
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Log questions from this interview and promote them directly into your Question Bank
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
                  <span>Log Question</span>
                </button>
              </div>

              {currentQuestions.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 bg-white dark:bg-[#12161f] rounded-xl border border-zinc-200 dark:border-zinc-800">
                  No questions logged for this round yet. Click "Log Question" to capture questions asked by the interviewer.
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
                            Interview Question
                          </span>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {iq.customQuestion}
                          </h4>
                        </div>

                        {/* Promote to Bank Button */}
                        <button
                          onClick={() => handlePromoteToBank(iq)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-colors shrink-0"
                          title="Add to Question Bank & Spaced Review"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Add to Question Bank</span>
                        </button>
                      </div>

                      {/* Answers comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 space-y-1">
                          <span className="font-semibold text-zinc-500">My Answer:</span>
                          <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                            {iq.myAnswer || 'No notes'}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            Better / Target Answer:
                          </span>
                          <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-line">
                            {iq.betterAnswer || 'No notes'}
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
            Select an interview round from the list or log a new round.
          </div>
        )}
      </div>

      {/* LOG QUESTION MODAL */}
      {isAddingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Log Question from {currentInterview?.companyName}
              </h3>
              <button
                onClick={() => setIsAddingQuestion(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Question Asked
                </label>
                <input
                  type="text"
                  value={iqFormData.customQuestion || ''}
                  onChange={(e) =>
                    setIqFormData({ ...iqFormData, customQuestion: e.target.value })
                  }
                  placeholder="e.g. How does PagedAttention eliminate memory fragmentation?"
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  What I Said in the Interview
                </label>
                <textarea
                  rows={3}
                  value={iqFormData.myAnswer || ''}
                  onChange={(e) =>
                    setIqFormData({ ...iqFormData, myAnswer: e.target.value })
                  }
                  placeholder="My actual verbal response during the round..."
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Better / Ideal Answer after Retrospective
                </label>
                <textarea
                  rows={4}
                  value={iqFormData.betterAnswer || ''}
                  onChange={(e) =>
                    setIqFormData({ ...iqFormData, betterAnswer: e.target.value })
                  }
                  placeholder="The precise, mathematically rigorous response I should have given..."
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsAddingQuestion(false)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveIQ}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Save Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT INTERVIEW MODAL */}
      {isEditingInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {interviewFormData.id ? 'Edit Interview Round' : 'Log Interview Round'}
              </h3>
              <button
                onClick={() => setIsEditingInterview(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Company Name
                  </label>
                  <input
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
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Position
                  </label>
                  <input
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
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Round Number
                  </label>
                  <input
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
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Result Status
                  </label>
                  <select
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
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Duration (min)
                  </label>
                  <input
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
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Round Name / Topic Focus
                </label>
                <input
                  type="text"
                  value={interviewFormData.roundName || ''}
                  onChange={(e) =>
                    setInterviewFormData({
                      ...interviewFormData,
                      roundName: e.target.value,
                    })
                  }
                  placeholder="e.g. LLM Architecture & Systems Design"
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Retrospective / Debrief
                </label>
                <textarea
                  rows={4}
                  value={interviewFormData.retrospective || ''}
                  onChange={(e) =>
                    setInterviewFormData({
                      ...interviewFormData,
                      retrospective: e.target.value,
                    })
                  }
                  placeholder="How did it go? What questions were easy? What points were weak?"
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsEditingInterview(false)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInterview}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Save Round
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
