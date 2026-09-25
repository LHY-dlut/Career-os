import { useI18n } from '../i18n/I18nProvider';
import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Database,
  Sparkles,
  Shield,
  User as UserIcon,
  LogOut,
  LogIn,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { useAICapabilities } from '../hooks/useAICapabilities';

interface SettingsProps {
  user: any;
  onSignIn: () => void;
  onSignOut: () => void;
  onRefreshData: () => Promise<void>;
  onExport: () => Promise<string>;
  onRestore: (json: string) => Promise<void>;
  onReset: () => Promise<void>;
  onLoadStarter: () => Promise<void>;
  canLoadStarter: boolean;
}

export const Settings: React.FC<SettingsProps> = ({
  user,
  onSignIn,
  onSignOut,
  onRefreshData, onExport, onRestore, onReset, onLoadStarter, canLoadStarter,
}) => {
  const { t, language, setLanguage } = useI18n();
  const { showToast } = useToast();
  const { capabilities, loading: capabilitiesLoading, error: capabilitiesError } = useAICapabilities();
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [loadingStarter, setLoadingStarter] = useState(false);

  // Export JSON
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const json = await onExport();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai_career_os_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t("All data exported as JSON backup", "已将全部数据导出为 JSON 备份"));
    } catch (e: any) {
      showToast(t("Export failed", "导出失败"), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Import JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 20_000_000) { showToast(t("Backup exceeds 20 MB.", "备份文件超过 20 MB。"), 'error'); return; }
    if (!confirm(t("Replace all data in this guest workspace with this backup? This cannot be undone.", "用此备份替换当前访客工作区的全部数据？此操作无法撤销。"))) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await onRestore(json);
        showToast(t("Backup restored to this browser’s guest workspace", "已将备份恢复到此浏览器的访客工作区"));
      } catch (err: any) {
        showToast(err.message || t("Backup validation failed. Nothing was replaced.", "备份校验失败，原有数据未被替换。"), 'error');
      }
    };
    reader.readAsText(file);
  };

  // Reset to default seed
  const handleResetSeed = async () => {
    if (
      confirm(
        t("Reset all data back to the default curated technical interview dataset? Your current data will be replaced.", "重置为默认技术面试学习资料？当前访客工作区的数据将被替换。")
      )
    ) {
      setIsResetting(true);
      try {
        await onReset();
        showToast(t("Reset to default seed data complete", "已重置为默认学习资料"));
      } catch (err) {
        showToast(t("Reset failed", "重置失败"), 'error');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-in fade-in">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t("System & Account Settings", "系统与账号设置")}</h2>
        <p className="text-xs text-zinc-500">{t("Manage your account workspace, backups, and study materials", "管理账号工作区、数据备份与学习资料")}</p>
      </div>

      {/* Account / User Section */}
      <section className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
        <label htmlFor="interface-language" className="block text-sm font-semibold">{t('Interface language', '界面语言')}</label>
        <p className="text-xs text-zinc-500">{t('Saved in this browser. Your articles, questions and interview notes keep their original language.', '选择会保存在此浏览器中。文章、题目和面试笔记保留原文。')}</p>
        <select id="interface-language" value={language} onChange={event => setLanguage(event.target.value === 'en' ? 'en' : 'zh')} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
          <option value="zh">简体中文</option>
          <option value="en">English</option>
        </select>
      </section>

      <div className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <UserIcon className="w-4 h-4" />
          <span>{t("User Authentication", "账号登录")}</span>
        </div>

        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || t("User", "用户")}
                  className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {user.displayName || t("Signed-in User", "已登录用户")}
                </div>
                <div className="text-[11px] text-zinc-500">{user.email}</div>
                <div className="text-[10px] text-zinc-400 font-mono">UID: {user.uid}</div>
              </div>
            </div>

            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("Sign Out", "退出登录")}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800">
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{t("Guest Mode (Local Storage)", "访客模式（本地存储）")}</div>
              <p className="text-[11px] text-zinc-500 mt-0.5">{t("Sign in to open your separate cloud workspace. Guest records stay in this browser.", "登录后将打开独立的云端工作区，访客记录仍保留在此浏览器。")}</p>
            </div>

            <button
              onClick={onSignIn}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t("Sign In with Google", "使用 Google 登录")}</span>
            </button>
          </div>
        )}
      </div>

      {/* Cloud & Architecture Status */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <Database className="w-4 h-4" />
          <span>{t("Architecture & Connectivity", "存储与连接状态")}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">{t("Persistence", "数据存储")}</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{user ? t("Firestore account workspace", "Firestore 云端工作区") : t("Local guest workspace", "本地访客工作区")}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">{t("AI Engine", "AI 引擎")}</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{capabilities ? `${capabilities.provider === 'deepseek' ? 'DeepSeek' : 'Gemini'} · ${capabilities.model}` : capabilitiesLoading ? t("Checking server configuration…", "正在检查服务配置…") : t("Configuration unavailable", "配置暂不可用")}</span>
            </div>
            <p className="text-[11px] text-zinc-500" role="status">{capabilitiesError || (capabilities ? `${capabilities.configured ? t("API key configured", "已填写 API Key") : t("API key not configured", "尚未填写 API Key")} · ${capabilities.webSearch ? t("Web search supported", "支持联网搜索") : t("No live web search", "不支持实时联网搜索")}` : t("Server-managed AI configuration", "AI 配置由服务端管理"))}</p>
            <p className="text-[11px] text-zinc-500">{t("Sign-in and workspace approval required. API keys stay on the server.", "需要登录并获得工作区授权，API Key 仅保存在服务端。")}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">{t("Security Rules", "安全规则")}</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t("User-Scoped Invariants", "按用户隔离数据")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Restore Data */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <Download className="w-4 h-4" />
          <span>{t("Data Backup & Recovery", "数据备份与恢复")}</span>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-400">{t("Export the current workspace as JSON. Restore and reset apply only to the guest workspace; cloud restore/reset are not available. Backups contain study and career records; browser theme preferences are separate.", "将当前工作区导出为 JSON。恢复与重置仅适用于访客工作区，暂不支持云端恢复或重置。备份包含学习与求职记录，浏览器主题和语言偏好单独保存。")}</p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {canLoadStarter && <button disabled={loadingStarter} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium" onClick={async () => { setLoadingStarter(true); try { await onLoadStarter(); showToast(t("Starter study materials added. Progress starts from zero.", "已添加入门学习资料，学习进度从零开始。")); } catch (cause) { showToast(cause instanceof Error ? cause.message : t("Could not load starter materials.", "无法加载入门资料。"), 'error'); } finally { setLoadingStarter(false); } }}>{t("Load Starter Study Materials", "加载入门学习资料")}</button>}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t("Export Backup (JSON)", "导出备份（JSON）")}</span>
          </button>

          {!user && <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t("Restore Backup", "恢复备份")}</span>
            <input
              type="file"
              aria-label={t("Restore Backup", "恢复备份")}
              accept=".json"
              onChange={handleImport}
              className="sr-only"
            />
          </label>}

          {!user && <button
            onClick={handleResetSeed}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-xs font-medium hover:bg-rose-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("Reset Local Demo Data", "重置本地示例数据")}</span>
          </button>}
        </div>
      </div>
    </div>
  );
};
