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
      showToast('All data exported as JSON backup');
    } catch (e: any) {
      showToast('Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Import JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 20_000_000) { showToast('Backup exceeds 20 MB.', 'error'); return; }
    if (!confirm('Replace all data in this guest workspace with this backup? This cannot be undone.')) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await onRestore(json);
        showToast('Backup restored to this browser’s guest workspace');
      } catch (err: any) {
        showToast(err.message || 'Backup validation failed. Nothing was replaced.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Reset to default seed
  const handleResetSeed = async () => {
    if (
      confirm(
        'Reset all data back to the default curated technical interview dataset? Your current data will be replaced.'
      )
    ) {
      setIsResetting(true);
      try {
        await onReset();
        showToast('Reset to default seed data complete');
      } catch (err) {
        showToast('Reset failed', 'error');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-in fade-in">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          System & Account Settings
        </h2>
        <p className="text-xs text-zinc-500">
          Manage your account workspace, backups, and study materials
        </p>
      </div>

      {/* Account / User Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <UserIcon className="w-4 h-4" />
          <span>User Authentication</span>
        </div>

        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {user.displayName || 'Signed-in User'}
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
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800">
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Guest Mode (Local Storage)
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Sign in to open your separate cloud workspace. Guest records stay in this browser.
              </p>
            </div>

            <button
              onClick={onSignIn}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          </div>
        )}
      </div>

      {/* Cloud & Architecture Status */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <Database className="w-4 h-4" />
          <span>Architecture & Connectivity</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">Persistence</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{user ? 'Firestore account workspace' : 'Local guest workspace'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">AI Engine</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{capabilities ? `${capabilities.provider === 'deepseek' ? 'DeepSeek' : 'Gemini'} · ${capabilities.model}` : capabilitiesLoading ? 'Checking server configuration…' : 'Configuration unavailable'}</span>
            </div>
            <p className="text-[11px] text-zinc-500" role="status">{capabilitiesError || (capabilities ? `${capabilities.configured ? 'API key configured' : 'API key not configured'} · ${capabilities.webSearch ? 'Web search supported' : 'No live web search'}` : 'Server-managed AI configuration')}</p>
            <p className="text-[11px] text-zinc-500">Sign-in and workspace approval required. API keys stay on the server.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">Security Rules</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>User-Scoped Invariants</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Restore Data */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#12161f] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <Download className="w-4 h-4" />
          <span>Data Backup & Recovery</span>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Export the current workspace as JSON. Restore and reset apply only to the guest workspace; cloud restore/reset are not available. Backups contain study and career records; browser theme preferences are separate.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {canLoadStarter && <button disabled={loadingStarter} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium" onClick={async () => { setLoadingStarter(true); try { await onLoadStarter(); showToast('Starter study materials added. Progress starts from zero.'); } catch (cause) { showToast(cause instanceof Error ? cause.message : 'Could not load starter materials.', 'error'); } finally { setLoadingStarter(false); } }}>Load Starter Study Materials</button>}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>Export Backup (JSON)</span>
          </button>

          {!user && <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-emerald-500" />
            <span>Restore Backup</span>
            <input
              type="file"
              aria-label="Restore Backup"
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
            <span>Reset Local Demo Data</span>
          </button>}
        </div>
      </div>
    </div>
  );
};
