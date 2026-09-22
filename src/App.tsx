import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from './services/firebase';
import {
  loadAllData,
  saveKnowledgeArticle,
  deleteKnowledgeArticle,
  saveQuestion,
  deleteQuestion,
  saveApplication,
  deleteApplication,
  saveInterview,
  deleteInterview,
  saveInterviewQuestion,
  saveCodingAttempt,
  recordReview,
} from './services/db';
import type {
  KnowledgeArticle,
  Question,
  Application,
  Interview,
  InterviewQuestion,
  CodingProblem,
  CodingAttempt,
  ReviewHistory,
  ReviewRating,
} from './types';

// Layout & Common
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { CommandPalette } from './components/common/CommandPalette';
import { ToastProvider, useToast } from './components/common/Toast';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Knowledge } from './pages/Knowledge';
import { Questions } from './pages/Questions';
import { Review } from './pages/Review';
import { CodingLab } from './pages/CodingLab';
import { Applications } from './pages/Applications';
import { Interviews } from './pages/Interviews';
import { AICopilot } from './pages/AICopilot';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <ToastProvider>
      <MainAppContent />
    </ToastProvider>
  );
}

function MainAppContent() {
  const { showToast } = useToast();

  // Navigation & UI State
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState<string>('');

  // Dark Mode
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('ai_career_os_theme');
    if (saved) return saved === 'dark';
    return true; // Default to dark for high-contrast engineering aesthetic
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ai_career_os_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ai_career_os_theme', 'light');
    }
  }, [isDark]);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string>('guest-user');

  // Application Data States
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [codingProblems, setCodingProblems] = useState<CodingProblem[]>([]);
  const [codingAttempts, setCodingAttempts] = useState<CodingAttempt[]>([]);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh and load all data
  const refreshData = useCallback(async (currentUid?: string) => {
    try {
      const uid = currentUid || userId;
      const data = await loadAllData(uid);
      setArticles(data.articles);
      setQuestions(data.questions);
      setApplications(data.applications);
      setInterviews(data.interviews);
      setInterviewQuestions(data.interviewQuestions);
      setCodingProblems(data.codingProblems);
      setCodingAttempts(data.codingAttempts);
      setReviewHistory(data.reviewHistory);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserId(currentUser.uid);
        await refreshData(currentUser.uid);
      } else {
        setUser(null);
        setUserId('guest-user');
        await refreshData('guest-user');
      }
    });
    return () => unsubscribe();
  }, [refreshData]);

  // Global keyboard shortcut for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation helper
  const handleNavigate = (view: string, id?: string) => {
    setActiveView(view);
    setSelectedEntityId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth actions
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      showToast('Signed in with Google!');
    } catch (err: any) {
      showToast(err.message || 'Google sign-in was cancelled or failed', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      showToast('Signed out');
    } catch (err: any) {
      showToast('Sign out failed', 'error');
    }
  };

  // CRUD Handlers for Knowledge
  const handleSaveArticle = async (article: KnowledgeArticle) => {
    await saveKnowledgeArticle(article);
    setArticles((prev) => {
      const idx = prev.findIndex((a) => a.id === article.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = article;
        return copy;
      }
      return [article, ...prev];
    });
  };

  const handleDeleteArticle = async (id: string) => {
    await deleteKnowledgeArticle(id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  // CRUD Handlers for Questions
  const handleSaveQuestion = async (q: Question) => {
    await saveQuestion(q);
    setQuestions((prev) => {
      const idx = prev.findIndex((item) => item.id === q.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = q;
        return copy;
      }
      return [q, ...prev];
    });
  };

  const handleDeleteQuestion = async (id: string) => {
    await deleteQuestion(id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Spaced Review Handler
  const handleRecordReview = async (question: Question, rating: ReviewRating) => {
    const { updatedQuestion, reviewEntry } = await recordReview(userId, question, rating);
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
    setReviewHistory((prev) => [reviewEntry, ...prev]);
  };

  // CRUD Handlers for Applications
  const handleSaveApplication = async (app: Application) => {
    await saveApplication(app);
    setApplications((prev) => {
      const idx = prev.findIndex((a) => a.id === app.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = app;
        return copy;
      }
      return [app, ...prev];
    });
  };

  const handleDeleteApplication = async (id: string) => {
    await deleteApplication(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  };

  // CRUD Handlers for Interviews
  const handleSaveInterview = async (inv: Interview) => {
    await saveInterview(inv);
    setInterviews((prev) => {
      const idx = prev.findIndex((i) => i.id === inv.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = inv;
        return copy;
      }
      return [inv, ...prev];
    });
  };

  const handleDeleteInterview = async (id: string) => {
    await deleteInterview(id);
    setInterviews((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSaveInterviewQuestion = async (iq: InterviewQuestion) => {
    await saveInterviewQuestion(iq);
    setInterviewQuestions((prev) => [iq, ...prev]);
  };

  // CRUD Handlers for Coding Lab
  const handleSaveCodingAttempt = async (attempt: CodingAttempt) => {
    await saveCodingAttempt(attempt);
    setCodingAttempts((prev) => [attempt, ...prev]);
  };

  // Quick Action Handler from Navbar
  const handleQuickAdd = (type: 'article' | 'question' | 'application' | 'interview') => {
    if (type === 'article') {
      setActiveView('knowledge');
    } else if (type === 'question') {
      setActiveView('questions');
    } else if (type === 'application') {
      setActiveView('applications');
    } else if (type === 'interview') {
      setActiveView('interviews');
    }
  };

  // Count of due questions for badge
  const dueCount = questions.filter((q) => {
    if (!q.nextReviewAt) return true;
    return new Date(q.nextReviewAt) <= new Date();
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex transition-colors duration-150">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={activeView}
        onNavigate={(v) => handleNavigate(v)}
        collapsed={isSidebarOpen}
        onToggleCollapse={() => setIsSidebarOpen(!isSidebarOpen)}
        reviewDueCount={dueCount}
        activeInterviewsCount={
          interviews.filter((i) => i.result === 'Scheduled').length
        }
        masteredCount={questions.filter((q) => q.masteryLevel === 'Mastered').length}
        totalQuestions={questions.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          currentView={activeView}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          currentUser={user}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          onQuickAdd={handleQuickAdd}
        />

        {/* View Router */}
        <main className="flex-1 overflow-y-auto">
          {activeView === 'dashboard' && (
            <Dashboard
              questions={questions}
              articles={articles}
              applications={applications}
              interviews={interviews}
              reviewHistory={reviewHistory}
              codingProblems={codingProblems}
              codingAttempts={codingAttempts}
              onNavigate={(v, id) => handleNavigate(v, id)}
              onQuickAdd={handleQuickAdd}
            />
          )}

          {activeView === 'knowledge' && (
            <Knowledge
              articles={articles}
              selectedArticleId={selectedEntityId}
              onSaveArticle={handleSaveArticle}
              onDeleteArticle={handleDeleteArticle}
              onNavigateToCopilot={(content, title) => {
                setCopilotPrompt(`Please explain and analyze this article: "${title}"\n\n${content}`);
                setActiveView('copilot');
              }}
              userId={userId}
            />
          )}

          {activeView === 'questions' && (
            <Questions
              questions={questions}
              articles={articles}
              selectedQuestionId={selectedEntityId}
              onSaveQuestion={handleSaveQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onNavigateToReview={(qId) => handleNavigate('review', qId)}
              onNavigateToKnowledge={(title) => {
                const found = articles.find(
                  (a) => a.title.toLowerCase() === title.toLowerCase()
                );
                handleNavigate('knowledge', found?.id);
              }}
              onNavigateToCopilot={(q, a) => {
                setCopilotPrompt(`Help me refine and critique this answer:\n\n**Question:** ${q}\n**Answer:** ${a}`);
                setActiveView('copilot');
              }}
              userId={userId}
            />
          )}

          {activeView === 'review' && (
            <Review
              questions={questions}
              initialQuestionId={selectedEntityId}
              onRecordReview={handleRecordReview}
              onNavigateToKnowledge={(title) => {
                const found = articles.find(
                  (a) => a.title.toLowerCase() === title.toLowerCase()
                );
                handleNavigate('knowledge', found?.id);
              }}
              onNavigateToDashboard={() => handleNavigate('dashboard')}
            />
          )}

          {activeView === 'coding' && (
            <CodingLab
              problems={codingProblems}
              attempts={codingAttempts}
              selectedProblemId={selectedEntityId}
              onSaveAttempt={handleSaveCodingAttempt}
              userId={userId}
            />
          )}

          {activeView === 'applications' && (
            <Applications
              applications={applications}
              selectedAppId={selectedEntityId}
              onSaveApplication={handleSaveApplication}
              onDeleteApplication={handleDeleteApplication}
              onNavigateToCopilotJD={(jd) => {
                setCopilotPrompt(`Analyze this job description for AI Algorithm Engineer:\n\n${jd}`);
                setActiveView('copilot');
              }}
              onQuickLogInterview={(app) => {
                handleNavigate('interviews');
              }}
              userId={userId}
            />
          )}

          {activeView === 'interviews' && (
            <Interviews
              interviews={interviews}
              interviewQuestions={interviewQuestions}
              applications={applications}
              selectedInterviewId={selectedEntityId}
              onSaveInterview={handleSaveInterview}
              onDeleteInterview={handleDeleteInterview}
              onSaveInterviewQuestion={handleSaveInterviewQuestion}
              onAddToQuestionBank={async (qData) => {
                await handleSaveQuestion({
                  ...qData,
                  id: `q_${Date.now()}`,
                  userId,
                });
              }}
              userId={userId}
            />
          )}

          {activeView === 'copilot' && (
            <AICopilot initialPrompt={copilotPrompt} />
          )}

          {activeView === 'settings' && (
            <Settings
              user={user}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              onRefreshData={() => refreshData()}
            />
          )}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        articles={articles}
        questions={questions}
        codingProblems={codingProblems}
        applications={applications}
        interviews={interviews}
        onNavigate={(view, id) => handleNavigate(view, id)}
      />
    </div>
  );
}
