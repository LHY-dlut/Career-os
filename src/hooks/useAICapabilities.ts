import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';

export interface AICapabilities {
  provider: 'deepseek' | 'gemini';
  model: string;
  webSearch: boolean;
  configured: boolean;
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function useAICapabilities() {
  const { t } = useI18n();
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    async function load() {
      try {
        // This endpoint exposes public configuration only; no account token is needed.
        const response = await fetch(`${baseUrl}/api/capabilities`, { signal: controller.signal });
        if (!response.ok) throw new Error('AI configuration is unavailable. Reload to retry.');
        const value: unknown = await response.json();
        if (!value || typeof value !== 'object' ||
          !('provider' in value) || (value.provider !== 'deepseek' && value.provider !== 'gemini') ||
          !('model' in value) || typeof value.model !== 'string' || !value.model.trim() ||
          !('webSearch' in value) || typeof value.webSearch !== 'boolean' ||
          !('configured' in value) || typeof value.configured !== 'boolean') {
          throw new Error('AI configuration is unavailable. Reload to retry.');
        }
        if (active) setCapabilities(value as AICapabilities);
      } catch {
        if (active) setFailed(true);
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const error = failed ? t('AI configuration is unavailable. Reload to retry.', 'AI 配置暂不可用，请刷新后重试。') : '';
  const canSearch = capabilities?.configured === true && capabilities.webSearch;
  const searchUnavailableReason = loading
    ? t('Checking server search support…', '正在检查服务端搜索能力…')
    : error || (!capabilities?.configured
      ? t('AI is not configured on the server.', '服务端尚未配置 AI。')
      : !capabilities.webSearch ? t('The configured provider does not support live web search.', '当前模型服务不支持实时联网搜索。') : '');

  return { capabilities, loading, error, canSearch, searchUnavailableReason };
}
