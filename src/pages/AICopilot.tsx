import { Dialog } from '../components/common/Dialog';
import { useI18n } from '../i18n/I18nProvider';
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
  requestImproveAnswer,
  requestMockInterviewTurn,
  requestJDAnalyze,
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

const ROLE_TRANSLATIONS: Record<string, Pick<ChatbotRole, 'name' | 'badge' | 'description' | 'systemInstruction'>> = {
  mentor: {
    name: 'AI 求职与技术导师', badge: '综合指导',
    description: '围绕大模型架构、面试思路、RAG 与智能体系统设计提供系统指导。',
    systemInstruction: '你是顶尖科技公司的 AI 求职导师与高级算法工程师。请指导候选人学习 LLM、RAG、智能体基础、编程策略、面试思路和系统设计。采用结构化 Markdown、直观类比和适用于生产环境的实践，给出清晰、体贴且可操作的技术解释。',
  },
  barRaiser: {
    name: '系统与算法深度面试官', badge: '技术深度',
    description: '严谨推导数学证明、GPU 显存瓶颈、KV Cache 公式与分布式扩展。',
    systemInstruction: '你是顶尖 AI 研究机构的首席算法工程师与深度面试官。专长包括技术推理、严谨的数学证明（注意力方差、损失函数、梯度动态）、GPU 显存瓶颈（KV Cache 公式、带宽与计算饱和、FlashAttention 分块）以及面向硬件的分布式训练（3D 并行、ZeRO、流水线调度）。要求充分的工程深度，指出隐藏问题，并以数学精度验证候选人的逻辑。',
  },
  drill: {
    name: '快速练习与闪卡教练', badge: '快速复习',
    description: '通过 30 秒口述练习、技术问答与即时反馈进行高效复习。',
    systemInstruction: '你是 AI 工程面试的快速练习教练。解释要简洁、清晰、突出重点。提供 30 秒口述总结、精简的优缺点比较和即时答题反馈，帮助候选人进行面试前的快速复习。使用简洁列表与加粗要点。',
  },
  research: {
    name: 'AI 研究与行业观察员', badge: '联网来源',
    description: '服务端支持联网搜索时，结合来源研究论文、模型发布与招聘趋势。',
    systemInstruction: '你是 AI 研究与行业情报分析师。使用可用的联网搜索研究论文发布（arXiv）、基础模型架构、框架更新与科技公司招聘趋势。引用搜索实际返回的来源。没有搜索证据时，明确说明限制，不得声称已经实时核实，也不得编造引用。',
  },
};

interface DisplayMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelUsed?: string;
  groundingSources?: GroundingSource[];
  webSearchQueries?: string[];
  roleName?: string;
  roleId?: string;
  welcomeProfile?: AIModelProfile;
}

interface AICopilotProps {
  initialPrompt?: string;
}

export const AICopilot: React.FC<AICopilotProps> = ({ initialPrompt }) => {
  const { t, language, locale, translateMessage } = useI18n();
  const roleText = (role: ChatbotRole, key: 'name' | 'badge' | 'description' | 'systemInstruction') => t(role[key], ROLE_TRANSLATIONS[role.id][key]);
  const profileLabel = (profile: AIModelProfile) => ({ standard: t('Standard', '标准'), deep: t('Deep', '深入'), fast: t('Fast', '快速') })[profile];
  const responseInstruction = t('Respond in English. Preserve the factual and source-verification requirements.', '请用简体中文回答，保留必要的技术名词，并遵守事实准确性与来源核验要求。');
  const withResponseLanguage = (value: string) => `${value}\n\n${responseInstruction}`;
  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const { showToast } = useToast();
  const { user, signIn } = useAuth();
  const { capabilities, loading: capabilitiesLoading, error: capabilitiesError, canSearch, searchUnavailableReason } = useAICapabilities();
  const [activeMode, setActiveMode] = useState<'chat' | 'polisher' | 'mock' | 'jd'>('chat');

  // Multi-turn Chatbot State
  const [selectedRole, setSelectedRole] = useState<ChatbotRole>(CHATBOT_ROLES[0]);
  const [selectedModel, setSelectedModel] = useState<AIModelProfile>(CHATBOT_ROLES[0].defaultModel);
  const [isSearchEnabled, setIsSearchEnabled] = useState<boolean>(false);
  const [customSystemInstruction, setCustomSystemInstruction] = useState<string>(() => roleText(CHATBOT_ROLES[0], 'systemInstruction'));
  const [showRoleConfigModal, setShowRoleConfigModal] = useState<boolean>(false);

  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '',
      timestamp: new Date().toISOString(),

    },
  ]);

  const messageRole = (message: DisplayMessage) => {
    const role = CHATBOT_ROLES.find(item => item.id === message.roleId);
    return role ? roleText(role, 'name') : message.id === 'welcome' ? t('Welcome · App introduction', '欢迎 · 功能介绍') : message.roleName || t('AI Copilot', 'AI 助手');
  };
  const messageText = (message: DisplayMessage) => {
    if (message.id !== 'welcome') return message.text;
    return message.welcomeProfile
      ? t(`Conversation restarted with role **${messageRole(message)}** and the **${profileLabel(message.welcomeProfile)}** profile. How can I assist with your interview prep?`, `已使用 **${messageRole(message)}** 角色和 **${profileLabel(message.welcomeProfile)}** 档位开始新对话。今天想练习什么？`)
      : t("Hello! I am your **AI Career Copilot**, specialized in LLM, RAG, Agent, and AI Algorithm Engineering interview preparation.\n\n### 🎯 How I Can Help You Today:\n* **Multi-Turn Role-Based Technical Chat**: Practice with our *AI Career Mentor*, *Deep System Bar Raiser*, or *Rapid Drill Coach*.\n* **Research with Sources**: The research role and live search are available only when supported by the server's AI provider. Ordinary chat does not verify current web information.\n* **30-Second Elevator Pitch Polisher**: Turn unorganized technical thoughts into punchy, structured interview answers.\n* **Mock Interview Drills**: Generate a technical practice question to work through.", "你好！我是你的 **AI 求职助手**，专注于 LLM、RAG、智能体与 AI 算法工程面试准备。\n\n### 🎯 我可以帮助你：\n* **多角色技术对话**：和 *AI 求职导师*、*系统与算法深度面试官* 或 *快速练习教练* 进行多轮练习。\n* **有来源的研究**：仅在服务端 AI 提供商支持时启用研究角色与联网搜索。普通对话不会核实当前网络信息。\n* **30 秒回答润色**：将零散思路整理成清晰、精练的面试回答。\n* **模拟面试练习**：生成一道技术题，帮助你练习作答。");
  };

  const [input, setInput] = useState(initialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Polisher state
  const [roughAnswer, setRoughAnswer] = useState('');
  const [polishQuestion, setPolishQuestion] = useState(t('Why does attention divide by sqrt(d_k)?', '为什么注意力分数要除以 sqrt(d_k)？'));
  const [polishedResult, setPolishedResult] = useState<Awaited<ReturnType<typeof requestImproveAnswer>> | null>(null);

  // Mock interview state
  const [mockTopic, setMockTopic] = useState('Transformer & Attention Mechanics');
  const [mockDifficulty, setMockDifficulty] = useState('Senior AI Algorithm Engineer');
  const [mockQuestion, setMockQuestion] = useState<{ question: string } | null>(null);

  // JD Analyzer state
  const [jdText, setJdText] = useState('');
  const [jdResult, setJdResult] = useState<Awaited<ReturnType<typeof requestJDAnalyze>> | null>(null);

  const polishedOutput = polishedResult ? [
    `### ${t('30-Second Elevator Pitch', '30 秒口述回答')}\n${polishedResult.thirtySecondAnswer}`,
    `### ${t('Recommended Answer Structure', '建议的回答结构')}\n${polishedResult.betterStructure}`,
    `### ${t('Missing Technical Nuances & Inaccuracies', '遗漏的技术细节与不准确之处')}\n${polishedResult.missingPoints.map(point => `- ${point}`).join('\n')}${polishedResult.inaccuracies.length ? `\n\n**${t('Watch out for:', '需要纠正：')}**\n${polishedResult.inaccuracies.map(point => `- ${point}`).join('\n')}` : ''}`,
    `### ${t('Expected Follow-Up Probing Questions', '可能的深入追问')}\n${polishedResult.followUps.map((point, index) => `${index + 1}. ${point}`).join('\n')}`,
  ].join('\n\n---\n\n') : '';
  const jdAnalysis = jdResult ? [
    `### ${t('High-Yield Required Competencies', '核心岗位能力')}\n${jdResult.coreRequirements.map(point => `- **${point}**`).join('\n')}`,
    `### ${t('Key Technical Tools & Stack', '关键技术与工具')}\n${jdResult.importantSkills.map(point => `- ${point}`).join('\n')}`,
    `### ${t('Predicted Technical Interview Questions', '可能的技术面试考点')}\n${jdResult.likelyInterviewTopics.map((point, index) => `${index + 1}. ${point}`).join('\n')}`,
    `### ${t('Common Candidate Knowledge Gaps', '需要补充的知识')}\n${jdResult.knowledgeGaps.map(point => `- ${point}`).join('\n')}`,
    `### ${t('Recommended Preparation Checklist', '建议的准备清单')}\n${jdResult.suggestedPreparationChecklist.map((point, index) => `${index + 1}. ${point}`).join('\n')}`,
  ].join('\n\n---\n\n') : '';

  useEffect(() => {
    // Only built-in defaults follow the interface language; preserve edited text.
    setCustomSystemInstruction(previous => previous === selectedRole.systemInstruction || previous === ROLE_TRANSLATIONS[selectedRole.id].systemInstruction
      ? roleText(selectedRole, 'systemInstruction') : previous);
    setPolishQuestion(previous => ['Why does attention divide by sqrt(d_k)?', '为什么注意力分数要除以 sqrt(d_k)？'].includes(previous)
      ? t('Why does attention divide by sqrt(d_k)?', '为什么注意力分数要除以 sqrt(d_k)？') : previous);
  }, [language]);

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
      setCustomSystemInstruction(roleText(CHATBOT_ROLES[0], 'systemInstruction'));
    }
  }, [canSearch, selectedRole.id]);

  // When role changes, sync defaults
  const handleRoleChange = (role: ChatbotRole) => {
    if (role.defaultSearch && !canSearch) return;
    setSelectedRole(role);
    setSelectedModel(role.defaultModel);
    setIsSearchEnabled(role.defaultSearch && canSearch);
    setCustomSystemInstruction(roleText(role, 'systemInstruction'));
    showToast(t(`Switched role to "${roleText(role, 'name')}"`, `已切换到“${roleText(role, 'name')}”`));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString(),
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
        systemInstruction: withResponseLanguage(customSystemInstruction),
        model: selectedModel,
        enableSearch: isSearchEnabled && canSearch,
      });

      const botMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: result.reply,
        timestamp: new Date().toISOString(),
        modelUsed: result.modelUsed,
        groundingSources: result.groundingSources,
        webSearchQueries: result.webSearchQueries,
        roleId: selectedRole.id,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setInput(query);
      setMessages(previous => previous.filter(message => message.id !== userMsg.id));
      showToast(translateMessage(err.message) || t("Error communicating with AI Copilot", "与 AI 助手通信失败"), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (messages.length <= 1) return;
    if (window.confirm(t("Clear conversation history? This will start a fresh multi-turn session.", "清空对话历史并开始新的多轮会话？"))) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: '',
          welcomeProfile: selectedModel,
          timestamp: new Date().toISOString(),
          roleId: selectedRole.id,
        },
      ]);
      showToast(t("Chat history cleared", "对话历史已清空"));
    }
  };

  const handleExportChat = () => {
    const transcript = messages
      .map((m) => {
        const header = m.sender === 'user' ? t('### 👤 Candidate', '### 👤 候选人') : `### 🤖 ${t('Copilot', 'AI 助手')} (${messageRole(m)} - ${m.modelUsed || ''})`;
        return `${header} [${formatTime(m.timestamp)}]\n\n${messageText(m)}\n\n---\n`;
      })
      .join('\n');

    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-career-copilot-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("Chat transcript exported as Markdown", "对话记录已导出为 Markdown"));
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(t("Copied to clipboard", "已复制到剪贴板"));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunPolisher = async () => {
    if (!roughAnswer.trim() || isLoading) return;
    setIsLoading(true);
    setPolishedResult(null);
    try {
      const polished = await requestImproveAnswer(withResponseLanguage(polishQuestion), roughAnswer);
      setPolishedResult(polished);
      showToast(t("30-second answer generated!", "30 秒回答已生成！"));
    } catch (err: any) {
      showToast(translateMessage(err.message) || t("Polisher failed", "回答润色失败"), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunMockQuestion = async () => {
    setIsLoading(true);
    setMockQuestion(null);
    try {
      const q = await requestMockInterviewTurn(withResponseLanguage(`${mockTopic} — ${mockDifficulty}`), []);
      setMockQuestion({ question: q.nextQuestion });
      showToast(t("Mock question generated", "模拟面试题已生成"));
    } catch (err: any) {
      showToast(translateMessage(err.message) || t("Mock generation failed", "模拟面试题生成失败"), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunJDAnalysis = async () => {
    if (!jdText.trim() || isLoading) return;
    setIsLoading(true);
    setJdResult(null);
    try {
      const result = await requestJDAnalyze(withResponseLanguage(jdText));
      setJdResult(result);
      showToast(t("JD Analysis complete", "职位分析已完成"));
    } catch (err: any) {
      showToast(translateMessage(err.message) || t("Analysis failed", "分析失败"), 'error');
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
      {!user && <div className="px-6 py-3 text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200">{t("AI requires a signed-in account approved by the workspace owner.", "使用 AI 需要登录，并获得工作区管理员授权。")} <button className="underline font-semibold ml-2" onClick={signIn}>{t("Sign in", "登录")}</button></div>}
      {/* Top Header: Title & Copilot Mode Switcher */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#10141e]/80 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {t("AI Career Copilot", "AI 求职助手")}
              </h2>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                {capabilities ? `${capabilities.provider === 'deepseek' ? 'DeepSeek' : 'Gemini'} · ${capabilities.model}` : t("Server-managed AI", "服务端管理的 AI")}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {t("Specialized in LLM, RAG, Agent & Algorithm Engineering interviews", "专注 LLM、RAG、智能体与算法工程面试")}
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
            <span>{t("Chatbot", "智能对话")}</span>
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
            <span>{t("30s Pitch Polisher", "30 秒回答润色")}</span>
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
            <span>{t("Mock Drill", "模拟练习")}</span>
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
            <span>{t("JD Analyzer", "职位分析")}</span>
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-2 text-[11px] text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800" role="status">
        {capabilitiesLoading ? t("Checking AI configuration…", "正在检查 AI 配置……") : capabilitiesError || (!capabilities?.configured
          ? t("AI is not configured on the server. The workspace owner must add the provider API key.", "服务端尚未配置 AI。工作区管理员需要添加提供商 API 密钥。")
          : canSearch ? t("Live search is available when enabled. Sign-in and workspace approval are required.", "启用后可使用联网搜索，需要登录并获得工作区授权。")
            : t("Live web search and research are unavailable with this provider. Chat, pitch polishing, mock drills, and JD analysis remain available.", "当前提供商不支持联网搜索与研究；仍可使用对话、回答润色、模拟练习和职位分析。"))}
      </div>

      {/* MODE 1: MULTI-TURN CHATBOT */}
      {activeMode === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden max-w-5xl w-full mx-auto p-3 sm:p-5">
          {/* Sub-header: Role Pills & Settings Bar */}
          <div className="mb-3 p-2.5 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Role Selection Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mr-1 hidden md:inline">
                {t("Role:", "角色：")}
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
                    title={role.defaultSearch && !canSearch ? searchUnavailableReason : roleText(role, 'description')}
                  >
                    {renderRoleIcon(role.icon, 'w-3.5 h-3.5')}
                    <span>{roleText(role, 'name')}</span>
                  </button>
                );
              })}
            </div>

            {/* Model & Search Grounding Controls */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Provider-supported Web Search Toggle */}
              <button
                disabled={!canSearch}
                aria-label={t("Web Search", "联网搜索")}
                aria-pressed={isSearchEnabled && canSearch}
                onClick={() => {
                  if (!canSearch) return;
                  const nextSearch = !isSearchEnabled;
                  setIsSearchEnabled(nextSearch);
                  if (nextSearch) {
                    setSelectedModel('standard');
                    showToast(t("Search Grounding enabled with the server’s standard model", "已使用服务端标准模型启用联网搜索"));
                  } else {
                    showToast(t("Search Grounding disabled", "联网搜索已关闭"));
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSearchEnabled
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
                title={canSearch ? t("Request web search with the server-configured model", "使用服务端配置的模型进行联网搜索") : searchUnavailableReason}
              >
                <Globe className={`w-3.5 h-3.5 ${isSearchEnabled ? 'text-emerald-500 animate-pulse' : ''}`} />
                <span className="hidden sm:inline">{t("Web Search", "联网搜索")}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isSearchEnabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              </button>

              {/* Model Dropdown */}
              <div className="relative">
                <select
                  aria-label={t("AI profile", "AI 档位")}
                  value={selectedModel}
                  onChange={(e) => {
                    const newModel = e.target.value as AIModelProfile;
                    setSelectedModel(newModel);
                    showToast(t(`Profile set to ${profileLabel(newModel)}; the server chooses the model`, `已选择${profileLabel(newModel)}档位，模型由服务端决定`));
                  }}
                  className="text-xs py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="standard">{t("Standard profile", "标准档位")}</option>
                  <option value="deep">{t("Deep profile", "深入档位")}</option>
                  <option value="fast">{t("Fast profile", "快速档位")}</option>
                </select>
              </div>

              {/* Configure System Instruction Button */}
              <button
                onClick={() => setShowRoleConfigModal(true)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                title={t("View or Customize System Instruction", "查看或自定义系统指令")}
              >
                <Settings2 className="w-4 h-4" />
              </button>

              {/* Export Chat */}
              <button
                onClick={handleExportChat}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                title={t("Export Transcript as Markdown", "导出 Markdown 对话记录")}
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Clear Chat */}
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-600 transition-colors"
                title={t("Clear Conversation", "清空对话")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Model & Role Info Bar */}
          <div className="mb-2 px-3 py-1.5 rounded-lg bg-zinc-100/70 dark:bg-[#12161f]/70 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{t("Active Persona:", "当前角色：")}</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">{roleText(selectedRole, 'name')}</span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span>{t("Profile:", "档位：")} <code className="text-zinc-800 dark:text-zinc-200 font-mono text-[10px]">{profileLabel(selectedModel)}</code></span>
            </div>
            <div className="flex items-center gap-2">
              {isSearchEnabled && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Globe className="w-3 h-3" /> {t("Live Search Grounding Active", "联网搜索已开启")}
                </span>
              )}
              <span className="text-zinc-400">{t(`${messages.filter(m => m.id !== 'welcome').length} messages in context`, `上下文中有 ${messages.filter(m => m.id !== 'welcome').length} 条消息`)}</span>
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
                        <span>{messageRole(msg)}</span>
                        {msg.modelUsed && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                            {msg.modelUsed}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopyMessage(msg.id, messageText(msg))}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1"
                        title={t("Copy message", "复制消息")}
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
                      <MarkdownRenderer content={messageText(msg)} />
                    </div>
                  )}

                  {/* Grounding Search Sources Panel (when present) */}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{t(`Web Search Sources (${msg.groundingSources.length} sources cited)`, `联网搜索来源（引用 ${msg.groundingSources.length} 个）`)}</span>
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
                            domain = t('source', '来源');
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
                    <span>{formatTime(msg.timestamp)}</span>
                    {msg.sender === 'user' && (
                      <button
                        onClick={() => handleCopyMessage(msg.id, messageText(msg))}
                        aria-label={t("Copy message", "复制消息")}
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
                  {t("Generating with the", "正在使用")} <span className="font-mono font-medium">{profileLabel(selectedModel)}</span> {t("profile", "档位生成")}
                  {isSearchEnabled && canSearch && t(" • Searching for live web sources...", " · 正在搜索实时网络来源……")}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="py-2 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
            <span className="text-zinc-400 text-[10px] shrink-0 font-medium">{t("Quick Starters:", "快速开始：")}</span>
            {[
              {
                text: t("Explain FlashAttention-2 vs FlashAttention-3 memory I/O trade-offs", "解释 FlashAttention-2 与 FlashAttention-3 的内存 I/O 权衡"),
                role: 'barRaiser',
              },
              {
                text: t("Latest research on DeepSeek-V3 / R1 Multi-Head Latent Attention (MLA)", "DeepSeek-V3 / R1 多头潜在注意力（MLA）的最新研究"),
                role: 'research',
                search: true,
              },
              {
                text: t("Derive why attention score divides by sqrt(d_k) with variance proof", "从方差推导注意力分数为什么要除以 sqrt(d_k)"),
                role: 'barRaiser',
              },
              {
                text: t("Drill me: KV-Cache memory calculation for 70B model with 4k context", "练习：计算 70B 模型、4k 上下文的 KV Cache 显存占用"),
                role: 'drill',
              },
              {
                text: t("Compare BM25 vs dense embeddings vs Reciprocal Rank Fusion (RRF) in RAG", "比较 RAG 中的 BM25、稠密向量检索与倒数排名融合（RRF）"),
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
                      setCustomSystemInstruction(roleText(role, 'systemInstruction'));
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
                aria-label={t("Message to AI Copilot", "发送给 AI 助手的消息")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t(`Ask ${roleText(selectedRole, 'name')} (e.g. derivations, GPU memory formulas, or interview practice)...`, `向${roleText(selectedRole, 'name')}提问，例如公式推导、GPU 显存或面试练习……`)}
                className="flex-1 bg-transparent px-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder:text-zinc-400"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors flex items-center justify-center"
                title={t("Send message", "发送消息")}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400 px-1">
              <span>{t("Enter to send • Multi-turn conversation history is maintained", "按 Enter 发送 · 自动保留多轮对话上下文")}</span>
              <span>
                {t('Profiles may use the same server-configured model.', '不同档位可能使用服务端配置的同一模型。')}
                {isSearchEnabled && canSearch && t(" Web search enabled.", " 已启用联网搜索。")}
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
              {t("30-Second Interview Answer Polisher", "30 秒面试回答润色")}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("Turn your rough technical rambling into a structured, punchy 30-second verbal answer that impresses interviewers.", "将零散的技术思路整理成结构清晰、重点突出的 30 秒口述回答。")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label htmlFor="aicopilot-field-0" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t("Interview Question", "面试问题")}
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
                  {t("Your Rough / Unorganized Thoughts", "你的初步思路")}
                </label>
                <textarea id="aicopilot-field-1"
                  rows={8}
                  value={roughAnswer}
                  onChange={(e) => setRoughAnswer(e.target.value)}
                  placeholder={t("Just dump what you know: e.g. If vectors are large dimension, dot product gets very large numbers, then softmax will saturate, gradient vanishes, so dividing by sqrt makes variance 1...", "先写下你知道的内容，例如：向量维度较大时，点积数值增大，softmax 容易饱和、梯度消失，所以除以平方根来控制方差……")}
                  className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs leading-relaxed text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <button
                onClick={handleRunPolisher}
                disabled={isLoading || !roughAnswer.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoading ? t("Polishing your answer...", "正在润色回答……") : t("Polish into 30s Pitch", "润色为 30 秒回答")}</span>
              </button>
            </div>

            {/* Polished Output Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {t("Polished Interview Delivery", "润色后的面试回答")}
              </span>

              {polishedOutput ? (
                <div className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                  <MarkdownRenderer content={polishedOutput} />
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-zinc-400">
                  {t("Your polished answer structure will appear here with verbal tips & key formulas.", "润色后的回答、表达建议与关键公式将显示在这里。")}
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
              {t("Mock Interview Question Generator", "模拟面试出题")}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("Generate a realistic interview question, then practice answering before requesting feedback.", "生成贴近真实面试的技术题目，先独立思考并练习作答。")}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="aicopilot-field-2" className="block text-zinc-500 mb-1 font-medium">{t("Domain Topic", "技术领域")}</label>
              <select id="aicopilot-field-2"
                value={mockTopic}
                onChange={(e) => setMockTopic(e.target.value)}
                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                <option value="Transformer & Attention Mechanics">{t("Transformer & Attention Mechanics", "Transformer 与注意力机制")}</option>
                <option value="LLM Distributed Training & Optimization">{t("LLM Distributed Training (ZeRO, FSDP, Megatron)", "大模型分布式训练（ZeRO、FSDP、Megatron）")}</option>
                <option value="Inference Optimization & KV Cache">{t("Inference Optimization (vLLM, Speculative, Quant)", "推理优化（vLLM、推测解码、量化）")}</option>
                <option value="Advanced RAG & Vector Retrieval">{t("Advanced RAG & Evaluation", "进阶 RAG 与评估")}</option>
                <option value="Autonomous Agent Architecture">{t("Autonomous Agent Architecture & Function Calling", "自主智能体架构与函数调用")}</option>
              </select>
            </div>

            <div>
              <label htmlFor="aicopilot-field-3" className="block text-zinc-500 mb-1 font-medium">{t("Difficulty Level", "岗位级别")}</label>
              <select id="aicopilot-field-3"
                value={mockDifficulty}
                onChange={(e) => setMockDifficulty(e.target.value)}
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                <option value="Mid-level Engineer">{t("Mid-level", "中级")}</option>
                <option value="Senior AI Algorithm Engineer">{t("Senior", "高级")}</option>
                <option value="Staff / Principal AI Researcher">{t("Staff / Principal", "资深 / 首席")}</option>
              </select>
            </div>

            <div className="self-end">
              <button
                onClick={handleRunMockQuestion}
                disabled={isLoading}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{t("Generate Question", "生成题目")}</span>
              </button>
            </div>
          </div>

          {mockQuestion && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {t("Question Prompt", "面试题目")}
                </span>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {mockQuestion.question}
                </h4>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                {t('Answer this question before requesting feedback. No model answer has been generated.', '请先尝试回答这道题，再请求反馈；当前尚未生成参考答案。')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 4: JD ANALYZER */}
      {activeMode === 'jd' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {t("Job Description (JD) AI Analyzer", "职位描述（JD）分析")}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("Paste a target job posting to extract high-yield questions, core tech stacks, and prepare a targeted study agenda.", "粘贴目标职位描述，提取高频考点与核心技术栈，制定有针对性的学习计划。")}
            </p>
          </div>

          <div className="space-y-3">
            <textarea
              aria-label={t("Job description", "职位描述")}
              rows={6}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder={t("Paste job description text here (e.g. Responsibilities, Requirements, Qualifications)...", "在这里粘贴职位描述（例如岗位职责、任职要求、资格条件）……")}
              className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs leading-relaxed text-zinc-900 dark:text-zinc-100"
            />
            <button
              onClick={handleRunJDAnalysis}
              disabled={isLoading || !jdText.trim()}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? t("Analyzing JD...", "正在分析职位……") : t("Analyze Job Description", "分析职位描述")}</span>
            </button>
          </div>

          {jdAnalysis && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 text-xs">
              <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {t("AI Target Analysis & Preparation Guide", "职位分析与备考指南")}
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
        <Dialog onClose={() => setShowRoleConfigModal(false)} aria-label={t("Copilot settings", "AI 助手设置")} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#12161f] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {t("Configure Persona & System Instruction", "配置角色与系统指令")}
                </h3>
              </div>
              <button aria-label={t("Close", "关闭")}
                onClick={() => setShowRoleConfigModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              ><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t("Active Persona", "当前角色")}
                </label>
                <p className="text-zinc-500 dark:text-zinc-400 mb-2">
                  {roleText(selectedRole, 'name')} — <span className="font-mono text-indigo-600 dark:text-indigo-400">{roleText(selectedRole, 'badge')}</span>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t("System Instruction (Passed to the AI Provider)", "系统指令（发送给 AI 提供商）")}
                </label>
                <p className="text-[11px] text-zinc-400 mb-2">
                  {t("Defines the behavior, rigor, tone, and domain focus of the multi-turn chatbot.", "设定多轮对话的行为、严谨程度、语气与技术领域。")}
                </p>
                <textarea
                  aria-label={t("System instruction", "系统指令")}
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
                    setCustomSystemInstruction(roleText(selectedRole, 'systemInstruction'));
                    showToast(t("Reset system instruction to role default", "系统指令已恢复为角色默认值"));
                  }}
                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{t("Reset to Default", "恢复默认")}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRoleConfigModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                  >
                    {t("Done", "完成")}
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
