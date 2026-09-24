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
    showToast('Coding attempt recorded successfully!');
  };

  if (!currentProblem) {
    return (
      <div className="p-12 text-center text-zinc-400">
        No coding problems loaded.
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
              value={activeProblemId}
              onChange={(e) => handleSelectProblem(e.target.value)}
              className="w-full font-semibold text-xs sm:text-sm bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100 cursor-pointer"
            >
              {problems.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900">
                  {p.title} ({p.difficulty})
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                {currentProblem.category}
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
                {currentProblem.difficulty}
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
              Spec
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
              <span>Attempts ({problemAttempts.length})</span>
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
                  Problem Description
                </h3>
                <div className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed font-sans">
                  {currentProblem.problemDescription}
                </div>
              </div>

              {/* Complexity Analysis */}
              {currentProblem.complexityAnalysis && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Target Complexity
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
                    <span>Common Interview Pitfalls</span>
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
                    What Interviewers Look For
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
                Attempt Records ({problemAttempts.length})
              </h3>
              {problemAttempts.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No recorded attempts yet for this problem. Click "Record Attempt" after coding!
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
                          {attempt.status}
                        </span>
                        <span className="text-zinc-500">
                          {new Date(attempt.attemptedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>{attempt.durationMinutes} min</span>
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
              title="Toggle Reference Solution"
            >
              {showSolution ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showSolution ? 'Hide Solution' : 'Reference Solution'}</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Reset code to initial template?')) {
                  setCode(currentProblem.codeTemplate);
                }
              }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Reset Code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsRecording(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record Attempt</span>
            </button>
          </div>
        </div>

        {/* Editor or Solution View */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
          {showSolution ? (
            <div className="space-y-2">
              <div className="px-2 py-1 bg-amber-950/40 border border-amber-800/60 rounded text-amber-300 text-[11px]">
                Reference implementation for study & review:
              </div>
              <pre className="p-3 bg-zinc-950 rounded-lg overflow-x-auto text-zinc-200">
                <code>{currentProblem.referenceSolution}</code>
              </pre>
            </div>
          ) : (
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full h-full bg-transparent resize-none focus:outline-none font-mono text-xs sm:text-sm text-zinc-100 leading-relaxed scrollbar-thin"
              placeholder="# Write your implementation here..."
            />
          )}
        </div>
      </div>

      {/* RECORD ATTEMPT MODAL */}
      {isRecording && (
        <Dialog onClose={() => setIsRecording(false)} aria-label="Record coding attempt" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Log Coding Practice Attempt
              </h3>
              <button aria-label="Close"
                onClick={() => setIsRecording(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              ><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="codinglab-field-0" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Completion Status
                </label>
                <select id="codinglab-field-0"
                  value={attemptStatus}
                  onChange={(e) => setAttemptStatus(e.target.value as any)}
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                >
                  <option value="Completed">Completed (Clean implementation)</option>
                  <option value="Struggled">Struggled (Needed hints/reference)</option>
                  <option value="Partial">Partial (Unfinished)</option>
                  <option value="Abandoned">Abandoned</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="codinglab-field-1" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Duration (Minutes)
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
                    Self Rating (1 - 5)
                  </label>
                  <select id="codinglab-field-2"
                    value={attemptRating}
                    onChange={(e) => setAttemptRating(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <option key={s} value={s}>
                        {s} Star{s > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="codinglab-field-3" className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Retrospective / Key takeaways
                </label>
                <textarea id="codinglab-field-3"
                  rows={3}
                  value={attemptNotes}
                  onChange={(e) => setAttemptNotes(e.target.value)}
                  placeholder="What stumbled me? e.g. Transpose ordering, forgetting contiguous..."
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsRecording(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAttemptRecord}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Save Attempt
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
