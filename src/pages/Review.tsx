import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  BookOpen,
  Award,
  Zap,
} from 'lucide-react';
import type { Question, ReviewRating } from '../types';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { useToast } from '../components/common/Toast';

interface ReviewProps {
  questions: Question[];
  initialQuestionId?: string;
  onRecordReview: (
    question: Question,
    rating: ReviewRating
  ) => Promise<void>;
  onNavigateToKnowledge: (title: string) => void;
  onNavigateToDashboard: () => void;
}

export const Review: React.FC<ReviewProps> = ({
  questions,
  initialQuestionId,
  onRecordReview,
  onNavigateToKnowledge,
  onNavigateToDashboard,
}) => {
  const { showToast } = useToast();
  const now = new Date();

  // Filter questions due for review or not yet mastered
  const reviewQueue = useMemo(() => {
    if (initialQuestionId) {
      const specific = questions.filter((q) => q.id === initialQuestionId);
      const rest = questions.filter((q) => q.id !== initialQuestionId);
      return [...specific, ...rest];
    }
    const due = questions.filter((q) => {
      if (!q.nextReviewAt) return true;
      return new Date(q.nextReviewAt) <= now;
    });
    // If no due questions, allow reviewing any questions
    return due.length > 0 ? due : questions;
  }, [questions, initialQuestionId]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const currentQuestion = reviewQueue[currentIndex];
  const isFinished = currentIndex >= reviewQueue.length || !currentQuestion;

  // Keyboard shortcut listener for fast Anki review (Space/Enter to reveal, 1-4 for ratings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (!isAnswerRevealed) {
          e.preventDefault();
          setIsAnswerRevealed(true);
        }
      } else if (isAnswerRevealed) {
        if (e.key === '1') handleRate('Again');
        else if (e.key === '2') handleRate('Hard');
        else if (e.key === '3') handleRate('Good');
        else if (e.key === '4') handleRate('Easy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerRevealed, isFinished, currentIndex]);

  const handleRate = async (rating: ReviewRating) => {
    if (!currentQuestion) return;
    await onRecordReview(currentQuestion, rating);
    setSessionCount((prev) => prev + 1);
    setIsAnswerRevealed(false);
    setShowDetailed(false);
    setCurrentIndex((prev) => prev + 1);
    showToast(`Rated as ${rating}`);
  };

  if (isFinished) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
          <Award className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Review Session Complete!
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You reviewed <span className="font-semibold text-indigo-600 dark:text-indigo-400">{sessionCount}</span> questions this session. Your memory intervals have been updated in Firestore.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setIsAnswerRevealed(false);
              setSessionCount(0);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium hover:bg-zinc-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Review Again</span>
          </button>
          <button
            onClick={onNavigateToDashboard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6 animate-in fade-in">
      {/* Session Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Spaced Repetition Review
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>Card {currentIndex + 1} of {reviewQueue.length}</span>
          <div className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / reviewQueue.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* FLASHCARD CONTAINER */}
      <div className="bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Card Header Meta */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {currentQuestion.category}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                currentQuestion.difficulty === 'Easy'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                  : currentQuestion.difficulty === 'Medium'
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {currentQuestion.difficulty}
            </span>
          </div>

          <div className="text-[11px] text-zinc-400">
            Interval: {currentQuestion.intervalDays}d • Level: {currentQuestion.masteryLevel}
          </div>
        </div>

        {/* Question Prompt */}
        <div className="space-y-3 py-2">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Question
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-snug">
            {currentQuestion.title}
          </h2>
        </div>

        {/* REVEAL / ANSWER SECTION */}
        {!isAnswerRevealed ? (
          <div className="pt-8 pb-4 text-center">
            <button
              onClick={() => setIsAnswerRevealed(true)}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
            >
              Show Answer (Space)
            </button>
            <p className="mt-2 text-[11px] text-zinc-400">
              Formulate your technical answer in your mind before revealing.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in duration-150">
            {/* 30-Second Concise Pitch */}
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                <Clock className="w-3.5 h-3.5" />
                <span>30-Second Elevator Pitch Answer</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                {currentQuestion.conciseAnswer}
              </p>
            </div>

            {/* Detailed Technical Explanation Dropdown */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDetailed(!showDetailed)}
                className="w-full flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <span>Full Technical Derivation & Math</span>
                {showDetailed ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {showDetailed && (
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <MarkdownRenderer content={currentQuestion.detailedAnswer} />
                </div>
              )}
            </div>

            {/* Potential Follow-Ups */}
            {currentQuestion.followUps && currentQuestion.followUps.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Expected Follow-Ups
                </span>
                <div className="space-y-1">
                  {currentQuestion.followUps.map((fu, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{fu}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4-Grade Spaced Repetition Buttons */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <div className="text-center text-[11px] font-medium text-zinc-400">
                Rate your recall quality (or press 1, 2, 3, 4):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleRate('Again')}
                  className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors text-center"
                >
                  <div className="text-xs font-bold">Again (1)</div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">1 day</div>
                </button>

                <button
                  onClick={() => handleRate('Hard')}
                  className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors text-center"
                >
                  <div className="text-xs font-bold">Hard (2)</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                    {Math.max(1, Math.round(currentQuestion.intervalDays * 1.2))} days
                  </div>
                </button>

                <button
                  onClick={() => handleRate('Good')}
                  className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors text-center"
                >
                  <div className="text-xs font-bold">Good (3)</div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                    {Math.round(currentQuestion.intervalDays * 2.5) || 7} days
                  </div>
                </button>

                <button
                  onClick={() => handleRate('Easy')}
                  className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors text-center"
                >
                  <div className="text-xs font-bold">Easy (4)</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {Math.round(currentQuestion.intervalDays * 3.5) || 14} days
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
