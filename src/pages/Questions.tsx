import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Edit3,
  Trash2,
  RotateCcw,
  X,
  ExternalLink,
} from 'lucide-react';
import type {
  Question,
  QuestionCategory,
  Difficulty,
  MasteryLevel,
  KnowledgeArticle,
} from '../types';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { useToast } from '../components/common/Toast';
import { generateId } from '../services/db';

interface QuestionsProps {
  questions: Question[];
  articles: KnowledgeArticle[];
  selectedQuestionId?: string;
  onSaveQuestion: (question: Question) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onNavigateToReview: (questionId?: string) => void;
  onNavigateToKnowledge: (articleTitleOrId: string) => void;
  onNavigateToCopilot: (question: string, answer: string) => void;
  userId: string;
}

const CATEGORIES: QuestionCategory[] = [
  'Transformer',
  'LLM',
  'RAG',
  'Agent',
  'Inference',
  'Text-to-SQL',
  'Machine Learning',
  'Deep Learning',
  'NLP',
  'Project Deep Dive',
  'System Design',
];

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const MASTERY_LEVELS: MasteryLevel[] = ['Unseen', 'Learning', 'Reviewing', 'Mastered'];

export const Questions: React.FC<QuestionsProps> = ({
  questions,
  articles,
  selectedQuestionId,
  onSaveQuestion,
  onDeleteQuestion,
  onNavigateToReview,
  onNavigateToKnowledge,
  onNavigateToCopilot,
  userId,
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedMastery, setSelectedMastery] = useState<string>('all');

  // Expanded detailed modal
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(() => {
    if (selectedQuestionId) {
      return questions.find((q) => q.id === selectedQuestionId) || null;
    }
    return null;
  });

  // Edit / Add Modal
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Question>>({});

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSearch =
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        q.conciseAnswer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || q.category === selectedCategory;
      const matchDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
      const matchMast = selectedMastery === 'all' || q.masteryLevel === selectedMastery;
      return matchSearch && matchCat && matchDiff && matchMast;
    });
  }, [questions, searchQuery, selectedCategory, selectedDifficulty, selectedMastery]);

  const handleOpenAdd = () => {
    setEditFormData({
      title: '',
      category: 'Transformer',
      difficulty: 'Medium',
      tags: ['Algorithm', 'Interview'],
      conciseAnswer: '',
      detailedAnswer: '',
      followUps: [],
      relatedKnowledgeArticles: [],
      masteryLevel: 'Unseen',
      intervalDays: 1,
      reviewCount: 0,
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditFormData(q);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editFormData.title?.trim()) {
      showToast('Question title is required', 'error');
      return;
    }
    const id = editFormData.id || generateId();
    const toSave: Question = {
      id,
      userId,
      title: editFormData.title || 'Untitled Question',
      category: editFormData.category || 'Transformer',
      difficulty: (editFormData.difficulty as Difficulty) || 'Medium',
      tags: editFormData.tags || [],
      conciseAnswer: editFormData.conciseAnswer || '',
      detailedAnswer: editFormData.detailedAnswer || '',
      followUps: editFormData.followUps || [],
      relatedKnowledgeArticles: editFormData.relatedKnowledgeArticles || [],
      masteryLevel: (editFormData.masteryLevel as MasteryLevel) || 'Unseen',
      intervalDays: editFormData.intervalDays || 1,
      reviewCount: editFormData.reviewCount || 0,
      createdAt: editFormData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveQuestion(toSave);
    if (activeQuestion?.id === id) {
      setActiveQuestion(toSave);
    }
    setIsEditing(false);
    showToast('Question saved successfully');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Interview Question Bank
          </h2>
          <p className="text-xs text-zinc-500">
            Curated high-frequency AI algorithm engineering questions with 30-second pitches & in-depth derivations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToReview()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
            <span>Spaced Review</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Question</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions, tags, or 30-second answers..."
              className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Categories ({questions.length})</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Difficulty Dropdown */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Mastery Dropdown */}
          <select
            value={selectedMastery}
            onChange={(e) => setSelectedMastery(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Mastery Levels</option>
            {MASTERY_LEVELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredQuestions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-400 text-sm bg-white dark:bg-[#12161f] rounded-xl border border-zinc-200 dark:border-zinc-800">
            No interview questions match your filter criteria.
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onSelect={() => setActiveQuestion(q)}
              onQuickReview={() => onNavigateToReview(q.id)}
            />
          ))
        )}
      </div>

      {/* QUESTION DETAIL MODAL */}
      {activeQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {activeQuestion.category}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeQuestion.difficulty === 'Easy'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : activeQuestion.difficulty === 'Medium'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {activeQuestion.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {activeQuestion.masteryLevel} (Interval: {activeQuestion.intervalDays}d)
                  </span>
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                  {activeQuestion.title}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleOpenEdit(activeQuestion)}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  title="Edit Question"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Delete question "${activeQuestion.title}"?`)) {
                      await onDeleteQuestion(activeQuestion.id);
                      setActiveQuestion(null);
                      showToast('Question deleted');
                    }
                  }}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveQuestion(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 30-Second Elevator Pitch */}
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>30-Second Elevator Pitch Answer</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                  {activeQuestion.conciseAnswer}
                </p>
              </div>

              {/* Detailed Technical Answer */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Detailed Technical Explanation
                </h4>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                  <MarkdownRenderer content={activeQuestion.detailedAnswer} />
                </div>
              </div>

              {/* Follow-up Questions from Interviewer */}
              {activeQuestion.followUps && activeQuestion.followUps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Expected Interviewer Follow-Ups
                  </h4>
                  <ul className="space-y-1.5">
                    {activeQuestion.followUps.map((fu, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{fu}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Knowledge Articles */}
              {activeQuestion.relatedKnowledgeArticles &&
                activeQuestion.relatedKnowledgeArticles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Linked Knowledge Theory
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {activeQuestion.relatedKnowledgeArticles.map((title) => (
                        <button
                          key={title}
                          onClick={() => {
                            setActiveQuestion(null);
                            onNavigateToKnowledge(title);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-400 bg-white dark:bg-zinc-800 text-xs text-indigo-600 dark:text-indigo-400 font-medium transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{title}</span>
                          <ExternalLink className="w-3 h-3 text-zinc-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                onClick={() => {
                  onNavigateToCopilot(activeQuestion.title, activeQuestion.conciseAnswer);
                  setActiveQuestion(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:bg-indigo-100"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Critique with AI Copilot</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveQuestion(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setActiveQuestion(null);
                    onNavigateToReview(activeQuestion.id);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Practice in Review</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {editFormData.id ? 'Edit Interview Question' : 'New Interview Question'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Question Title
                </label>
                <input
                  type="text"
                  value={editFormData.title || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="e.g. Why does scaled dot-product attention divide by sqrt(d_k)?"
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Category
                  </label>
                  <select
                    value={editFormData.category || 'Transformer'}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, category: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={editFormData.difficulty || 'Medium'}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        difficulty: e.target.value as Difficulty,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editFormData.tags?.join(', ') || ''}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Self-Attention, Math, Variance"
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  30-Second Elevator Pitch Answer
                </label>
                <textarea
                  rows={3}
                  value={editFormData.conciseAnswer || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, conciseAnswer: e.target.value })
                  }
                  placeholder="The concise, high-impact verbal answer to give right away..."
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Detailed Technical Answer (Markdown & LaTeX)
                </label>
                <textarea
                  rows={8}
                  value={editFormData.detailedAnswer || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, detailedAnswer: e.target.value })
                  }
                  placeholder="Formulas, proofs, system memory calculations..."
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Interviewer Follow-ups (one per line)
                </label>
                <textarea
                  rows={3}
                  value={editFormData.followUps?.join('\n') || ''}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      followUps: e.target.value.split('\n').filter(Boolean),
                    })
                  }
                  placeholder="How does this change with FlashAttention?\nWhat about FP8 quantization?"
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Save Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Component for Individual Question Card
const QuestionCard: React.FC<{
  question: Question;
  onSelect: () => void;
  onQuickReview: () => void;
}> = ({ question, onSelect, onQuickReview }) => {
  const [showPitch, setShowPitch] = useState(false);

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-300 dark:hover:border-indigo-800 flex flex-col justify-between transition-all shadow-xs space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {question.category}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                question.difficulty === 'Easy'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : question.difficulty === 'Medium'
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
              }`}
            >
              {question.difficulty}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
              {question.masteryLevel}
            </span>
          </div>
        </div>

        <h3
          onClick={onSelect}
          className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2"
        >
          {question.title}
        </h3>

        {/* 30-Second Answer Toggle Button */}
        <div>
          <button
            onClick={() => setShowPitch(!showPitch)}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors font-medium"
          >
            {showPitch ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{showPitch ? 'Hide 30s Pitch' : 'Show 30s Pitch'}</span>
          </button>

          {showPitch && (
            <p className="mt-1.5 p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40 text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
              {question.conciseAnswer}
            </p>
          )}
        </div>
      </div>

      {/* Footer Meta */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Interval: {question.intervalDays}d</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onQuickReview}
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Review</span>
          </button>
          <button
            onClick={onSelect}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            Full Details →
          </button>
        </div>
      </div>
    </div>
  );
};
