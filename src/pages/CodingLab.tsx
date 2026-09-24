import { useI18n } from '../i18n/I18nProvider';
import { Dialog } from '../components/common/Dialog';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useMemo } from 'react';
import {
  Code2,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Clock,
  Star,
  Eye,
  EyeOff,
  History,
  X,
  ChevronDown,
} from 'lucide-react';
import type { CodingProblem, CodingAttempt, Difficulty } from '../types';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { useToast } from '../components/common/Toast';
import { generateId } from '../utils/id';

interface CodingLabProps {
  problems: CodingProblem[];
  attempts: CodingAttempt[];
  selectedProblemId?: string;
  onSaveAttempt: (attempt: CodingAttempt) => Promise<void>;
  userId: string;
}

export const CodingLab: React.FC<CodingLabProps> = ({
  problems,
  attempts,
  selectedProblemId,
  onSaveAttempt,
  userId,
}) => {
  const { t, locale, label } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const activeProblemId = selectedProblemId || problems[0]?.id || '';
  const setActiveProblemId = (id: string) => navigate(`/coding/${encodeURIComponent(id)}`);

  const currentProblem = useMemo(() => {
    return problems.find((p) => p.id === activeProblemId) || problems[0];
  }, [problems, activeProblemId]);

  const [code, setCode] = useState<string>(currentProblem?.codeTemplate || '');
  const [showSolution, setShowSolution] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<'description' | 'history'>('description');

  // Attempt recording modal
  const [isRecording, setIsRecording] = useState(false);
  const [attemptStatus, setAttemptStatus] = useState<
    'Completed' | 'Struggled' | 'Partial' | 'Abandoned'
  >('Completed');
  const [attemptRating, setAttemptRating] = useState(4);
  const [attemptDuration, setAttemptDuration] = useState(25);
  const [attemptNotes, setAttemptNotes] = useState('');

  // When active problem changes, update code
  const handleSelectProblem = (id: string) => {
    setActiveProblemId(id);
    const prob = problems.find((p) => p.id === id);
    if (prob) {
      setCode(prob.codeTemplate);
      setShowSolution(false);
    }
  };

  const problemAttempts = useMemo(() => {
    return attempts.filter((a) => a.problemId === currentProblem?.id);
  }, [attempts, currentProblem]);

  const handleSaveAttemptRecord = async () => {
    if (!currentProblem) return;
    const attempt: CodingAttempt = {
      id: generateId(),
      userId,
      problemId: currentProblem.id,
      problemTitle: currentProblem.title,
      attemptedAt: new Date().toISOString(),
      userCode: code,
      durationMinutes: Number(attemptDuration) || 20,
      status: attemptStatus,
      selfRating: attemptRating,
      notes: attemptNotes,
    };
    try { await onSaveAttempt(attempt); } catch { return; }
    setIsRecording(false);
    setAttemptNotes('');
    showToast(t("Coding attempt recorded successfully!", "编程练习已记录！"));
  };

  if (!currentProblem) {
    return (
      <div className="p-12 text-center text-zinc-400">
        {t("No coding problems loaded.", "暂无编程题目。")}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full min-h-0 overflow-hidden bg-[#fbfbfb] dark:bg-[#0c1017]">
      {/* LEFT COLUMN: Problem Description, Pitfalls & Attempts (50%) */}
      <div className="w-full lg:w-1/2 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden bg-white/70 dark:bg-[#10141e]/70">
        {/* Top Problem Selector Bar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex-1">
            <select
              aria-label={t("Choose coding problem", "选择编程题目")}
              value={activeProblemId}
              onChange={(e) => handleSelectProblem(e.target.value)}
              className="w-full font-semibold text-xs sm:text-sm bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100 cursor-pointer"
            >
              {problems.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900">
                  {p.title} ({label(p.difficulty)})
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                {label(currentProblem.category)}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  currentProblem.difficulty === 'Easy'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : currentProblem.difficulty === 'Medium'
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                }`}
              >
                {label(currentProblem.difficulty)}
              </span>
            </div>
          </div>

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs shrink-0">
            <button
              onClick={() => setActiveLeftTab('description')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeLeftTab === 'description'
                  ? 'bg-white dark:bg-zinc-700 font-medium text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500'
              }`}
            >
              {t("Spec", "题目")}
            </button>
            <button
              onClick={() => setActiveLeftTab('history')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                activeLeftTab === 'history'
                  ? 'bg-white dark:bg-zinc-700 font-medium text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500'
              }`}
            >
              <History className="w-3 h-3" />
              <span>{t(`Attempts (${problemAttempts.length})`, `练习记录（${problemAttempts.length}）`)}</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeLeftTab === 'description' ? (
            <>
              {/* Problem Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {t("Problem Description", "题目描述")}
                </h3>
                <div className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed font-sans">
                  {currentProblem.problemDescription}
                </div>
              </div>

              {/* Complexity Analysis */}
              {currentProblem.complexityAnalysis && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {t("Target Complexity", "目标复杂度")}
                  </span>
                  <div className="text-xs font-mono text-zinc-800 dark:text-zinc-300">
                    {currentProblem.complexityAnalysis}
                  </div>
                </div>
              )}

              {/* Key Pitfalls */}
              {currentProblem.keyPitfalls && currentProblem.keyPitfalls.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{t("Common Interview Pitfalls", "常见面试易错点")}</span>
                  </span>
                  <ul className="space-y-1.5">
                    {currentProblem.keyPitfalls.map((pitfall, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-zinc-700 dark:text-zinc-300 p-2.5 rounded-lg bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40"
                      >
                        • {pitfall}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interview Speaking Points */}
              {currentProblem.interviewExplanation && (
                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    {t("What Interviewers Look For", "面试官关注点")}
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {currentProblem.interviewExplanation}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Attempts History */
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {t(`Attempt Records (${problemAttempts.length})`, `练习记录（${problemAttempts.length}）`)}
              </h3>
              {problemAttempts.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  {t("No recorded attempts yet for this problem. Click \"Record Attempt\" after coding!", "这道题还没有练习记录。完成后点击“记录练习”吧！")}
                </div>
              ) : (
                problemAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            attempt.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50'
                          }`}
                        >
                          {label(attempt.status)}
                        </span>
                        <span className="text-zinc-500">
                          {new Date(attempt.attemptedAt).toLocaleDateString(locale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>{t(`${attempt.durationMinutes} min`, `${attempt.durationMinutes} 分钟`)}</span>
                      </div>
                    </div>

                    {attempt.notes && (
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 italic">
                        "{attempt.notes}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Code Editor & Reference Solution (50%) */}
      <div className="w-full lg:w-1/2 flex flex-col overflow-hidden bg-zinc-900 text-zinc-100">
        {/* Editor Controls Header */}
        <div className="h-12 border-b border-zinc-800 bg-zinc-950/60 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span>solution.py</span>
            <span className="text-zinc-600">•</span>
            <span className="text-[11px] text-zinc-500">{currentProblem.language}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSolution(!showSolution)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                showSolution
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title={t("Toggle Reference Solution", "切换参考解答")}
            >
              {showSolution ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showSolution ? t("Hide Solution", "隐藏解答") : t("Reference Solution", "参考解答")}</span>
            </button>

            <button
              onClick={() => {
                if (confirm(t("Reset code to initial template?", "将代码重置为初始模板？"))) {
                  setCode(currentProblem.codeTemplate);
                }
              }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title={t("Reset Code", "重置代码")}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsRecording(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t("Record Attempt", "记录练习")}</span>
            </button>
          </div>
        </div>

        {/* Editor or Solution View */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
          {showSolution ? (
            <div className="space-y-2">
              <div className="px-2 py-1 bg-amber-950/40 border border-amber-800/60 rounded text-amber-300 text-[11px]">
                {t("Reference implementation for study & review:", "供学习与复习使用的参考实现：")}
              </div>
              <pre className="p-3 bg-zinc-950 rounded-lg overflow-x-auto text-zinc-200">
                <code>{currentProblem.referenceSolution}</code>
              </pre>
            </div>
          ) : (
            <textarea
              aria-label={t("Code editor", "代码编辑器")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full h-full bg-transparent resize-none focus:outline-none font-mono text-xs sm:text-sm text-zinc-100 leading-relaxed scrollbar-thin"
              placeholder={t("# Write your implementation here...", "# 在这里编写你的实现……")}
            />
          )}
        </div>
      </div>

      {/* RECORD ATTEMPT MODAL */}
      {isRecording && (
        <Dialog onClose={() => setIsRecording(false)} aria-label={t("Record coding attempt", "记录编程练习")} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t("Log Coding Practice Attempt", "记录编程练习")}
              </h3>
              <button aria-label={t("Close", "关闭")}
                onClick={() => setIsRecording(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              ><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="codinglab-field-0" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t("Completion Status", "完成情况")}
                </label>
                <select id="codinglab-field-0"
                  value={attemptStatus}
                  onChange={(e) => setAttemptStatus(e.target.value as any)}
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                >
                  <option value="Completed">{t("Completed (Clean implementation)", "已完成（独立清晰实现）")}</option>
                  <option value="Struggled">{t("Struggled (Needed hints/reference)", "有困难（需要提示或参考）")}</option>
                  <option value="Partial">{t("Partial (Unfinished)", "部分完成")}</option>
                  <option value="Abandoned">{t("Abandoned", "已放弃")}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="codinglab-field-1" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t("Duration (Minutes)", "用时（分钟）")}
                  </label>
                  <input id="codinglab-field-1"
                    type="number"
                    value={attemptDuration}
                    onChange={(e) => setAttemptDuration(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>

                <div>
                  <label htmlFor="codinglab-field-2" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t("Self Rating (1 - 5)", "自我评分（1—5）")}
                  </label>
                  <select id="codinglab-field-2"
                    value={attemptRating}
                    onChange={(e) => setAttemptRating(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <option key={s} value={s}>
                        {t(`${s} Star${s > 1 ? 's' : ''}`, `${s} 星`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="codinglab-field-3" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t("Retrospective / Key takeaways", "复盘与收获")}
                </label>
                <textarea id="codinglab-field-3"
                  rows={3}
                  value={attemptNotes}
                  onChange={(e) => setAttemptNotes(e.target.value)}
                  placeholder={t("What stumbled me? e.g. Transpose ordering, forgetting contiguous...", "遇到了什么困难？例如转置顺序、忘记调用 contiguous……")}
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsRecording(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400"
              >
                {t("Cancel", "取消")}
              </button>
              <button
                onClick={handleSaveAttemptRecord}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                {t("Save Attempt", "保存练习")}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
