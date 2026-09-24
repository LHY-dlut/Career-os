import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'zh' | 'en';
// A device display preference, separate from account records and workspace backups.
export const LANGUAGE_STORAGE_KEY = 'ai_career_os:browser:language';

const labels: Record<string, string> = {
  Dashboard: '学习总览', 'Knowledge Base': '知识库', 'Question Bank': '面试题库',
  'Spaced Review': '间隔复习', 'Coding Lab': '编程练习', 'Applications CRM': '投递管理',
  'Interviews & Retro': '面试与复盘', 'AI Copilot': 'AI 助手', 'Settings & Data': '设置与数据',
  dashboard: '学习总览', knowledge: '知识库', questions: '面试题库', review: '间隔复习',
  coding: '编程练习', applications: '投递管理', interviews: '面试与复盘', copilot: 'AI 助手', settings: '设置',
  All: '全部', Easy: '简单', Medium: '中等', Hard: '困难', Low: '低', High: '高',
  Unseen: '未学习', Learning: '学习中', Reviewing: '复习中', Mastered: '已掌握',
  Again: '重来', Good: '良好', Completed: '已完成', Struggled: '有困难', Partial: '部分完成', Abandoned: '已放弃',
  Wishlist: '意向清单', Applied: '已投递', Assessment: '笔试测评', Interviewing: '面试中',
  Offer: '已获录用', Rejected: '未通过', Withdrawn: '已撤回',
  Scheduled: '已安排', Pending: '待反馈', Passed: '已通过', Failed: '未通过', Cancelled: '已取消',
  'Full-time': '全职', Internship: '实习', Contract: '合同制', Remote: '远程',
  Transformer: 'Transformer', LLM: '大语言模型', RAG: '检索增强生成', Agent: '智能体',
  'Text-to-SQL': 'Text-to-SQL', 'Machine Learning': '机器学习', 'Deep Learning': '深度学习',
  NLP: '自然语言处理', Inference: '推理优化', 'Project Deep Dive': '项目深挖', 'System Design': '系统设计',
  '01 Transformer': '01 Transformer', '02 LLM': '02 大语言模型', '03 RAG': '03 检索增强生成',
  '04 Agent': '04 智能体', '05 Text-to-SQL': '05 Text-to-SQL', '06 Machine Learning': '06 机器学习',
  '07 Deep Learning': '07 深度学习', '08 NLP': '08 自然语言处理',
  'LLM From Scratch': '从零实现 LLM', 'RAG From Scratch': '从零实现 RAG',
  'Agent From Scratch': '从零实现智能体', 'LeetCode Hot 100': 'LeetCode 热题 100',
  'ACM / Coding Interview': 'ACM / 编程面试',
};

// Known application errors only: arbitrary user content and provider output stay intact.
const messages: Record<string, string> = {
  'Sign in to use AI Copilot. Guest AI is disabled.': '请先登录以使用 AI 助手，访客模式不开放 AI 调用。',
  'Your account changed. Please retry.': '账号已切换，请重试。',
  'AI request timed out. Please retry.': 'AI 请求超时，请重试。',
  'Could not reach the AI server. Check your connection and retry.': '无法连接 AI 服务，请检查网络后重试。',
  'DeepSeek is not configured. Ask the owner to set DEEPSEEK_API_KEY on the server.': '尚未配置 DeepSeek，请在服务端设置 DEEPSEEK_API_KEY。',
  'Gemini is not configured. Ask the owner to set GEMINI_API_KEY on the server.': '尚未配置 Gemini，请在服务端设置 GEMINI_API_KEY。',
  'Web research is not available with the configured DeepSeek API. Regular AI chat is available.': '当前 DeepSeek 接口不支持联网检索，可使用普通 AI 对话。',
  'Study collections must be empty before loading starter materials.': '知识库、题库和编程练习为空时，才能加载入门资料。',
  'Google sign-in is not configured. Guest mode is available.': '尚未配置 Google 登录，可以继续使用访客模式。',
  'Sign in to use AI Copilot.': '请先登录以使用 AI 助手。',
  'AI access has not been configured by the workspace owner.': '工作区所有者尚未配置 AI 访问权限。',
  'AI access is limited to approved accounts.': '只有获得授权的账号才能调用 AI。',
  'Your session is invalid or expired. Sign in again.': '登录状态无效或已过期，请重新登录。',
  'Too many requests. Retry in a minute.': '请求过于频繁，请一分钟后重试。',
  'AI minute limit reached. Retry later.': '已达到每分钟 AI 调用上限，请稍后重试。',
  'AI daily limit reached.': '已达到今日 AI 调用上限。',
  'Workspace AI daily limit reached.': '工作区已达到今日 AI 调用上限。',
  'Invalid request. Check required fields and input length.': '请求无效，请检查必填项和输入长度。',
  'The AI provider could not complete this request. Please retry.': 'AI 服务未能完成本次请求，请重试。',
  'The AI provider setting is invalid. Ask the owner to check the server configuration.': 'AI 服务配置无效，请检查服务端配置。',
  'Workspace could not be loaded.': '无法加载工作区。',
  'A save is already in progress.': '正在保存，请稍候。',
  'Save in progress.': '正在保存。',
  'Workspace is not ready.': '工作区尚未准备就绪。',
  'Your account changed while saving.': '保存时账号发生了切换。',
  'Save failed. Please retry.': '保存失败，请重试。',
  'Please wait for saving to finish.': '请等待保存完成。',
  'Restore is available only in the idle guest workspace.': '仅可在访客工作区没有进行保存时恢复备份。',
  'Reset is available only in the idle guest workspace.': '仅可在访客工作区没有进行保存时重置数据。',
  'Record belongs to a different account.': '这条记录属于其他账号。',
};

function savedLanguage(): Language {
  try { return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'zh'; }
  catch { return 'zh'; }
}

interface I18nValue {
  language: Language;
  locale: 'zh-CN' | 'en-US';
  setLanguage: (language: Language) => void;
  t: (english: string, chinese: string) => string;
  label: (value: string) => string;
  translateMessage: (message: string) => string;
}
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(savedLanguage);
  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* Private browsing still supports this session. */ }
  }, []);
  const t = useCallback((english: string, chinese: string) => language === 'zh' ? chinese : english, [language]);
  const label = useCallback((value: string) => language === 'zh' ? labels[value] || value : value, [language]);
  const translateMessage = useCallback((value: string) => language === 'zh' ? messages[value] || value : value, [language]);
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = language === 'zh' ? 'AI Career OS · 学习与求职工作台' : 'AI Career OS';
  }, [language]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) updateLanguage(event.newValue === 'en' ? 'en' : 'zh');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const value = useMemo<I18nValue>(() => ({ language, locale: language === 'zh' ? 'zh-CN' : 'en-US', setLanguage, t, label, translateMessage }), [language, setLanguage, t, label, translateMessage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('I18nProvider is missing.');
  return value;
}
