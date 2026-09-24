import { Dialog } from '../components/common/Dialog';
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RotateCcw,
  Briefcase,
  HelpCircle,
  Clock,
  BookOpen,
  Copy,
  Check,
  ChevronRight,
  Zap,
  Globe,
  ExternalLink,
  Cpu,
  Flame,
  SlidersHorizontal,
  Download,
  Trash2,
  Search,
  Settings2,
  X,
  RefreshCw,
} from 'lucide-react';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../app/AuthProvider';
import { useAICapabilities } from '../hooks/useAICapabilities';
import {
  requestMultiTurnChat,
  polishElevatorPitch,
  generateMockQuestion,
  analyzeJobDescription,
  ChatMessage,
  GroundingSource,
  AIModelProfile,
} from '../services/aiCopilot';

export interface ChatbotRole {
  id: string;
  name: string;
  badge: string;
  description: string;
  defaultModel: AIModelProfile;
  defaultSearch: boolean;
  systemInstruction: string;
  icon: 'mentor' | 'barRaiser' | 'drill' | 'research';
}

export const CHATBOT_ROLES: ChatbotRole[] = [
  {
    id: 'mentor',
    name: 'AI Career & Tech Mentor',
    badge: 'General Tasks',
    description: 'Comprehensive guidance on LLM architectures, interview mindsets, RAG, and Agent system designs.',
    defaultModel: 'standard',
    defaultSearch: false,
    systemInstruction: `You are an expert AI Career Mentor and Senior AI Algorithm Engineer at a top tech company. You guide candidates through LLM, RAG, and Agent fundamentals, coding strategies, interview mindsets, and system design principles. Provide clear, empathetic, and actionable technical explanations with structured Markdown, intuitive analogies, and production-grade best practices.`,
    icon: 'mentor',
  },
  {
    id: 'barRaiser',
    name: 'Deep System & Algorithm Bar Raiser',
    badge: 'Technical Depth',
    description: 'Rigorously derives math proofs, GPU memory bottlenecks, KV cache formulas, and distributed scaling.',
    defaultModel: 'deep',
    defaultSearch: false,
    systemInstruction: `You are a Principal AI Algorithm Engineer and Interview Bar Raiser at a premier AI research lab. You specialize in deep technical reasoning, rigorous mathematical proofs (attention variance, loss formulations, gradient dynamics), GPU memory bottlenecks (KV cache formulas, memory bandwidth vs compute saturation, FlashAttention tiling), and hardware-aware distributed training (3D parallelism, ZeRO, pipeline schedules). Demand uncompromising engineering depth, point out hidden pitfalls, and verify candidate logic with mathematical precision.`,
    icon: 'barRaiser',
  },
  {
    id: 'drill',
    name: 'Rapid Drill & Flashcard Coach',
    badge: 'Quick Revision',
    description: 'High-speed technical sparring, snappy 30-second elevator-pitch drills, and quick feedback.',
    defaultModel: 'fast',
    defaultSearch: false,
    systemInstruction: `You are a Rapid Technical Drill Coach for AI engineering interviews. Keep explanations ultra-crisp, snappy, and high-impact. Provide 30-second elevator-pitch summaries, quick pros/cons comparisons, and immediate feedback on candidate answers. Ideal for rapid revision before stepping into an interview. Format with concise bullet points and bold takeaways.`,
    icon: 'drill',
  },
  {
    id: 'research',
    name: 'AI Research & Industry Scout',
    badge: 'Search Grounded',
    description: 'Research papers, model releases, and hiring trends with sources when the server supports web search.',
    defaultModel: 'standard',
    defaultSearch: true,
    systemInstruction: `You are an AI Research & Industry Intelligence Analyst. Use available web search to research paper releases (arXiv), foundation model architectures, framework updates, and tech company hiring patterns. Cite sources returned by search. If no search evidence is available, state that limitation and do not claim live verification or invent citations.`,
    icon: 'research',
  },
];

interface DisplayMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelUsed?: string;
  groundingSources?: GroundingSource[];
  webSearchQueries?: string[];
  roleName?: string;
}

interface AICopilotProps {
  initialPrompt?: string;
}

export const AICopilot: React.FC<AICopilotProps> = ({ initialPrompt }) => {
  const { showToast } = useToast();
  const { user, signIn } = useAuth();
  const { capabilities, loading: capabilitiesLoading, error: capabilitiesError, canSearch, searchUnavailableReason } = useAICapabilities();
  const [activeMode, setActiveMode] = useState<'chat' | 'polisher' | 'mock' | 'jd'>('chat');

  // Multi-turn Chatbot State
  const [selectedRole, setSelectedRole] = useState<ChatbotRole>(CHATBOT_ROLES[0]);
  const [selectedModel, setSelectedModel] = useState<AIModelProfile>(CHATBOT_ROLES[0].defaultModel);
  const [isSearchEnabled, setIsSearchEnabled] = useState<boolean>(false);
  const [customSystemInstruction, setCustomSystemInstruction] = useState<string>(CHATBOT_ROLES[0].systemInstruction);
  const [showRoleConfigModal, setShowRoleConfigModal] = useState<boolean>(false);

  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your **AI Career Copilot**, specialized in LLM, RAG, Agent, and AI Algorithm Engineering interview preparation.

### 🎯 How I Can Help You Today:
* **Multi-Turn Role-Based Technical Chat**: Practice with our *AI Career Mentor*, *Deep System Bar Raiser*, or *Rapid Drill Coach*.
* **Research with Sources**: The research role and live search are available only when supported by the server's AI provider. Ordinary chat does not verify current web information.
* **30-Second Elevator Pitch Polisher**: Turn unorganized technical thoughts into punchy, structured interview answers.
* **Mock Interview Drills**: Generate a technical practice question to work through.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      roleName: 'Welcome · App introduction',
    },
  ]);

  const [input, setInput] = useState(initialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Polisher state
  const [roughAnswer, setRoughAnswer] = useState('');
  const [polishQuestion, setPolishQuestion] = useState('Why does attention divide by sqrt(d_k)?');
  const [polishedOutput, setPolishedOutput] = useState('');

  // Mock interview state
  const [mockTopic, setMockTopic] = useState('Transformer & Attention Mechanics');
  const [mockDifficulty, setMockDifficulty] = useState('Senior AI Algorithm Engineer');
  const [mockQuestion, setMockQuestion] = useState<any>(null);

  // JD Analyzer state
  const [jdText, setJdText] = useState('');
  const [jdAnalysis, setJdAnalysis] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialPrompt && activeMode === 'chat') {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (canSearch) return;
    setIsSearchEnabled(false);
    if (selectedRole.id === 'research') {
      setSelectedRole(CHATBOT_ROLES[0]);
      setSelectedModel(CHATBOT_ROLES[0].defaultModel);
      setCustomSystemInstruction(CHATBOT_ROLES[0].systemInstruction);
    }
  }, [canSearch, selectedRole.id]);

  // When role changes, sync defaults
  const handleRoleChange = (role: ChatbotRole) => {
    if (role.defaultSearch && !canSearch) return;
    setSelectedRole(role);
    setSelectedModel(role.defaultModel);
    setIsSearchEnabled(role.defaultSearch && canSearch);
    setCustomSystemInstruction(role.systemInstruction);
    showToast(`Switched role to "${role.name}"`);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for multi-turn chat
      const chatHistory: ChatMessage[] = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      chatHistory.push({
        role: 'user',
        content: query,
      });

      const result = await requestMultiTurnChat({
        messages: chatHistory,
        systemInstruction: customSystemInstruction,
        model: selectedModel,
        enableSearch: isSearchEnabled && canSearch,
      });

      const botMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: result.modelUsed,
        groundingSources: result.groundingSources,
        webSearchQueries: result.webSearchQueries,
        roleName: selectedRole.name,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setInput(query);
      setMessages(previous => previous.filter(message => message.id !== userMsg.id));
      showToast(err.message || 'Error communicating with AI Copilot', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (messages.length <= 1) return;
    if (window.confirm('Clear conversation history? This will start a fresh multi-turn session.')) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `Conversation restarted with role **${selectedRole.name}** and the **${selectedModel}** profile. How can I assist with your interview prep?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          roleName: selectedRole.name,
        },
      ]);
      showToast('Chat history cleared');
    }
  };

  const handleExportChat = () => {
    const transcript = messages
      .map((m) => {
        const header = m.sender === 'user' ? '### 👤 Candidate' : `### 🤖 Copilot (${m.roleName || 'Assistant'} - ${m.modelUsed || ''})`;
        return `${header} [${m.timestamp}]\n\n${m.text}\n\n---\n`;
      })
      .join('\n');

    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-career-copilot-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Chat transcript exported as Markdown');
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunPolisher = async () => {
    if (!roughAnswer.trim() || isLoading) return;
    setIsLoading(true);
    setPolishedOutput('');
    try {
      const polished = await polishElevatorPitch(roughAnswer, polishQuestion);
      setPolishedOutput(polished);
      showToast('30-second answer generated!');
    } catch (err: any) {
      showToast(err.message || 'Polisher failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunMockQuestion = async () => {
    setIsLoading(true);
    setMockQuestion(null);
    try {
      const q = await generateMockQuestion(mockTopic, mockDifficulty);
      setMockQuestion(q);
      showToast('Mock question generated');
    } catch (err: any) {
      showToast(err.message || 'Mock generation failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunJDAnalysis = async () => {
    if (!jdText.trim() || isLoading) return;
    setIsLoading(true);
    setJdAnalysis('');
    try {
      const result = await analyzeJobDescription(jdText);
      setJdAnalysis(result);
      showToast('JD Analysis complete');
    } catch (err: any) {
      showToast(err.message || 'Analysis failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderRoleIcon = (roleId: string, className: string = 'w-4 h-4') => {
    switch (roleId) {
      case 'mentor':
        return <Bot className={className} />;
      case 'barRaiser':
        return <Cpu className={className} />;
      case 'drill':
        return <Flame className={className} />;
      case 'research':
        return <Globe className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#fbfbfb] dark:bg-[#0c1017]">
      {!user && <div className="px-6 py-3 text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200">AI requires a signed-in account approved by the workspace owner. <button className="underline font-semibold ml-2" onClick={signIn}>Sign in</button></div>}
      {/* Top Header: Title & Copilot Mode Switcher */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#10141e]/80 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                AI Career Copilot
              </h2>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                {capabilities ? `${capabilities.provider === 'deepseek' ? 'DeepSeek' : 'Gemini'} · ${capabilities.model}` : 'Server-managed AI'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Specialized in LLM, RAG, Agent & Algorithm Engineering interviews
            </p>
          </div>
        </div>

        {/* Main Mode Switcher */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setActiveMode('chat')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeMode === 'chat'
                ? 'bg-white dark:bg-[#1a202c] font-semibold text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Chatbot</span>
          </button>

          <button
            onClick={() => setActiveMode('polisher')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeMode === 'polisher'
                ? 'bg-white dark:bg-[#1a202c] font-semibold text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>30s Pitch Polisher</span>
          </button>

          <button
            onClick={() => setActiveMode('mock')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeMode === 'mock'
                ? 'bg-white dark:bg-[#1a202c] font-semibold text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Mock Drill</span>
          </button>

          <button
            onClick={() => setActiveMode('jd')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeMode === 'jd'
                ? 'bg-white dark:bg-[#1a202c] font-semibold text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>JD Analyzer</span>
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-2 text-[11px] text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800" role="status">
        {capabilitiesLoading ? 'Checking AI configuration…' : capabilitiesError || (!capabilities?.configured
          ? 'AI is not configured on the server. The workspace owner must add the provider API key.'
          : canSearch ? 'Live search is available when enabled. Sign-in and workspace approval are required.'
            : 'Live web search and research are unavailable with this provider. Chat, pitch polishing, mock drills, and JD analysis remain available.')}
      </div>

      {/* MODE 1: MULTI-TURN CHATBOT */}
      {activeMode === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden max-w-5xl w-full mx-auto p-3 sm:p-5">
          {/* Sub-header: Role Pills & Settings Bar */}
          <div className="mb-3 p-2.5 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Role Selection Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mr-1 hidden md:inline">
                Role:
              </span>
              {CHATBOT_ROLES.map((role) => {
                const isActive = selectedRole.id === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleChange(role)}
                    disabled={role.defaultSearch && !canSearch}
                    className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    title={role.defaultSearch && !canSearch ? searchUnavailableReason : role.description}
                  >
                    {renderRoleIcon(role.icon, 'w-3.5 h-3.5')}
                    <span>{role.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Model & Search Grounding Controls */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Provider-supported Web Search Toggle */}
              <button
                disabled={!canSearch}
                aria-label="Web Search"
                aria-pressed={isSearchEnabled && canSearch}
                onClick={() => {
                  if (!canSearch) return;
                  const nextSearch = !isSearchEnabled;
                  setIsSearchEnabled(nextSearch);
                  if (nextSearch) {
                    setSelectedModel('standard');
                    showToast('Search Grounding enabled with the server’s standard model');
                  } else {
                    showToast('Search Grounding disabled');
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSearchEnabled
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
                title={canSearch ? 'Request web search with the server-configured model' : searchUnavailableReason}
              >
                <Globe className={`w-3.5 h-3.5 ${isSearchEnabled ? 'text-emerald-500 animate-pulse' : ''}`} />
                <span className="hidden sm:inline">Web Search</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isSearchEnabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              </button>

              {/* Model Dropdown */}
              <div className="relative">
                <select
                  aria-label="AI profile"
                  value={selectedModel}
                  onChange={(e) => {
                    const newModel = e.target.value as AIModelProfile;
                    setSelectedModel(newModel);
                    showToast(`Profile set to ${newModel}; the server chooses the model`);
                  }}
                  className="text-xs py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="standard">Standard profile</option>
                  <option value="deep">Deep profile</option>
                  <option value="fast">Fast profile</option>
                </select>
              </div>

              {/* Configure System Instruction Button */}
              <button
                onClick={() => setShowRoleConfigModal(true)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="View or Customize System Instruction"
              >
                <Settings2 className="w-4 h-4" />
              </button>

              {/* Export Chat */}
              <button
                onClick={handleExportChat}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="Export Transcript as Markdown"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Clear Chat */}
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-600 transition-colors"
                title="Clear Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Model & Role Info Bar */}
          <div className="mb-2 px-3 py-1.5 rounded-lg bg-zinc-100/70 dark:bg-[#12161f]/70 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Active Persona:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">{selectedRole.name}</span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span>Profile: <code className="text-zinc-800 dark:text-zinc-200 font-mono text-[10px]">{selectedModel}</code></span>
            </div>
            <div className="flex items-center gap-2">
              {isSearchEnabled && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Globe className="w-3 h-3" /> Live Search Grounding Active
                </span>
              )}
              <span className="text-zinc-400">{messages.filter(m => m.id !== 'welcome').length} turns in context</span>
            </div>
          </div>

          {/* Chat Messages Scrollable Thread */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs sm:text-sm ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {renderRoleIcon(selectedRole.icon, 'w-4 h-4')}
                  </div>
                )}

                <div
                  className={`max-w-3xl p-4 rounded-2xl ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-[#12161f] border border-zinc-200/90 dark:border-zinc-800/90 rounded-tl-xs shadow-xs text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {/* Assistant Message Header Info */}
                  {msg.sender === 'assistant' && (
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800/80 text-[11px]">
                      <div className="flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-400">
                        <span>{msg.roleName || 'AI Copilot'}</span>
                        {msg.modelUsed && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                            {msg.modelUsed}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Message Content */}
                  {msg.sender === 'user' ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                  ) : (
                    <div className="leading-relaxed">
                      <MarkdownRenderer content={msg.text} />
                    </div>
                  )}

                  {/* Grounding Search Sources Panel (when present) */}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Web Search Sources ({msg.groundingSources.length} sources cited)</span>
                      </div>

                      {/* Queries executed */}
                      {msg.webSearchQueries && msg.webSearchQueries.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.webSearchQueries.map((q, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                            >
                              <Search className="w-2.5 h-2.5 text-zinc-400" />
                              {q}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Source Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {msg.groundingSources.map((source, sIdx) => {
                          let domain = '';
                          try {
                            domain = new URL(source.url).hostname.replace('www.', '');
                          } catch {
                            domain = 'source';
                          }
                          return (
                            <a
                              key={sIdx}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-start gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-500 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {source.title || domain}
                                </p>
                                <p className="text-[10px] text-zinc-400 truncate">{domain}</p>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`mt-2 text-[10px] flex items-center justify-between ${
                      msg.sender === 'user' ? 'text-indigo-200' : 'text-zinc-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'user' && (
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="text-indigo-200 hover:text-white transition-colors"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 text-xs text-zinc-500 items-center animate-pulse pl-10">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 ml-1">
                  Generating with the <span className="font-mono font-medium">{selectedModel}</span> profile
                  {isSearchEnabled && canSearch && ' • Searching for live web sources...'}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="py-2 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
            <span className="text-zinc-400 text-[10px] shrink-0 font-medium">Quick Starters:</span>
            {[
              {
                text: 'Explain FlashAttention-2 vs FlashAttention-3 memory I/O trade-offs',
                role: 'barRaiser',
              },
              {
                text: 'Latest research on DeepSeek-V3 / R1 Multi-Head Latent Attention (MLA)',
                role: 'research',
                search: true,
              },
              {
                text: 'Derive why attention score divides by sqrt(d_k) with variance proof',
                role: 'barRaiser',
              },
              {
                text: 'Drill me: KV-Cache memory calculation for 70B model with 4k context',
                role: 'drill',
              },
              {
                text: 'Compare BM25 vs dense embeddings vs Reciprocal Rank Fusion (RRF) in RAG',
                role: 'mentor',
              },
            ].map((chip, idx) => (
              <button
                key={idx}
                disabled={chip.search && !canSearch}
                title={chip.search && !canSearch ? searchUnavailableReason : undefined}
                onClick={() => {
                  if (chip.search && !canSearch) return;
                  if (chip.role) {
                    const role = CHATBOT_ROLES.find((r) => r.id === chip.role);
                    if (role) {
                      setSelectedRole(role);
                      setSelectedModel(role.defaultModel);
                      setCustomSystemInstruction(role.systemInstruction);
                      setIsSearchEnabled(role.defaultSearch && canSearch);
                    }
                  }
                  if (chip.search) {
                    setIsSearchEnabled(canSearch);
                  }
                  setInput(chip.text);
                }}
                className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 whitespace-nowrap transition-colors flex items-center gap-1 border border-zinc-200/50 dark:border-zinc-700/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {chip.search && <Globe className="w-2.5 h-2.5 text-emerald-500" />}
                <span>{chip.text}</span>
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="pt-2">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Ask ${selectedRole.name} (e.g. derivations, GPU memory formulas, or interview practice)...`}
                className="flex-1 bg-transparent px-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder:text-zinc-400"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors flex items-center justify-center"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400 px-1">
              <span>Enter to send • Multi-turn conversation history is maintained</span>
              <span>
                Profiles may use the same server-configured model.
                {isSearchEnabled && canSearch && ' Web search enabled.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: 30-SECOND PITCH POLISHER */}
      {activeMode === 'polisher' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              30-Second Interview Answer Polisher
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Turn your rough technical rambling into a structured, punchy 30-second verbal answer that impresses interviewers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label htmlFor="aicopilot-field-0" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Interview Question
                </label>
                <input id="aicopilot-field-0"
                  type="text"
                  value={polishQuestion}
                  onChange={(e) => setPolishQuestion(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label htmlFor="aicopilot-field-1" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Your Rough / Unorganized Thoughts
                </label>
                <textarea id="aicopilot-field-1"
                  rows={8}
                  value={roughAnswer}
                  onChange={(e) => setRoughAnswer(e.target.value)}
                  placeholder="Just dump what you know: e.g. If vectors are large dimension, dot product gets very large numbers, then softmax will saturate, gradient vanishes, so dividing by sqrt makes variance 1..."
                  className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs leading-relaxed text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <button
                onClick={handleRunPolisher}
                disabled={isLoading || !roughAnswer.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoading ? 'Polishing your answer...' : 'Polish into 30s Pitch'}</span>
              </button>
            </div>

            {/* Polished Output Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Polished Interview Delivery
              </span>

              {polishedOutput ? (
                <div className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                  <MarkdownRenderer content={polishedOutput} />
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-zinc-400">
                  Your polished answer structure will appear here with verbal tips & key formulas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: MOCK DRILL */}
      {activeMode === 'mock' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Mock Interview Question Generator
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Generate realistic high-pressure interview questions with expected answers and follow-ups.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="aicopilot-field-2" className="block text-zinc-500 mb-1 font-medium">Domain Topic</label>
              <select id="aicopilot-field-2"
                value={mockTopic}
                onChange={(e) => setMockTopic(e.target.value)}
                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                <option value="Transformer & Attention Mechanics">Transformer & Attention Mechanics</option>
                <option value="LLM Distributed Training & Optimization">LLM Distributed Training (ZeRO, FSDP, Megatron)</option>
                <option value="Inference Optimization & KV Cache">Inference Optimization (vLLM, Speculative, Quant)</option>
                <option value="Advanced RAG & Vector Retrieval">Advanced RAG & Evaluation</option>
                <option value="Autonomous Agent Architecture">Autonomous Agent Architecture & Function Calling</option>
              </select>
            </div>

            <div>
              <label htmlFor="aicopilot-field-3" className="block text-zinc-500 mb-1 font-medium">Difficulty Level</label>
              <select id="aicopilot-field-3"
                value={mockDifficulty}
                onChange={(e) => setMockDifficulty(e.target.value)}
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                <option value="Mid-level Engineer">Mid-level</option>
                <option value="Senior AI Algorithm Engineer">Senior</option>
                <option value="Staff / Principal AI Researcher">Staff / Principal</option>
              </select>
            </div>

            <div className="self-end">
              <button
                onClick={handleRunMockQuestion}
                disabled={isLoading}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Generate Question</span>
              </button>
            </div>
          </div>

          {mockQuestion && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Question Prompt
                </span>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {mockQuestion.question}
                </h4>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                  Ideal 30-Second Elevator Pitch
                </span>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                  {mockQuestion.conciseAnswer}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Detailed Technical Explanation
                </span>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs">
                  <MarkdownRenderer content={mockQuestion.detailedAnswer} />
                </div>
              </div>

              {mockQuestion.followUps && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Expected Follow-up Questions
                  </span>
                  <div className="space-y-1">
                    {mockQuestion.followUps.map((fu: string, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        • {fu}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 4: JD ANALYZER */}
      {activeMode === 'jd' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Job Description (JD) AI Analyzer
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Paste a target job posting to extract high-yield questions, core tech stacks, and prepare a targeted study agenda.
            </p>
          </div>

          <div className="space-y-3">
            <textarea
              rows={6}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste job description text here (e.g. Responsibilities, Requirements, Qualifications)..."
              className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs leading-relaxed text-zinc-900 dark:text-zinc-100"
            />
            <button
              onClick={handleRunJDAnalysis}
              disabled={isLoading || !jdText.trim()}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Analyzing JD...' : 'Analyze Job Description'}</span>
            </button>
          </div>

          {jdAnalysis && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 text-xs">
              <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                AI Target Analysis & Preparation Guide
              </span>
              <div className="leading-relaxed text-zinc-800 dark:text-zinc-200">
                <MarkdownRenderer content={jdAnalysis} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Role & System Instruction Configuration Modal */}
      {showRoleConfigModal && (
        <Dialog onClose={() => setShowRoleConfigModal(false)} aria-label="Copilot settings" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#12161f] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Configure Persona & System Instruction
                </h3>
              </div>
              <button aria-label="Close"
                onClick={() => setShowRoleConfigModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              ><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Active Persona
                </label>
                <p className="text-zinc-500 dark:text-zinc-400 mb-2">
                  {selectedRole.name} — <span className="font-mono text-indigo-600 dark:text-indigo-400">{selectedRole.badge}</span>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  System Instruction (Passed to the AI Provider)
                </label>
                <p className="text-[11px] text-zinc-400 mb-2">
                  Defines the behavior, rigor, tone, and domain focus of the multi-turn chatbot.
                </p>
                <textarea
                  rows={6}
                  value={customSystemInstruction}
                  onChange={(e) => setCustomSystemInstruction(e.target.value)}
                  className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomSystemInstruction(selectedRole.systemInstruction);
                    showToast('Reset system instruction to role default');
                  }}
                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset to Default</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRoleConfigModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
