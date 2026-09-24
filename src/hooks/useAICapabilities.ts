import { useEffect, useState } from 'react';

export interface AICapabilities {
  provider: 'deepseek' | 'gemini';
  model: string;
  webSearch: boolean;
  configured: boolean;
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function useAICapabilities() {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        if (active) setError('AI configuration is unavailable. Reload to retry.');
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

  const canSearch = capabilities?.configured === true && capabilities.webSearch;
  const searchUnavailableReason = loading
    ? 'Checking server search support…'
    : error || (!capabilities?.configured
      ? 'AI is not configured on the server.'
      : !capabilities.webSearch ? 'The configured provider does not support live web search.' : '');

  return { capabilities, loading, error, canSearch, searchUnavailableReason };
}
