import { useLayoutEffect, useState } from 'react';
import { readTheme, writeTheme } from '../repositories/local';
import { useToast } from '../components/common/Toast';
export function useTheme(identity: string) {
  const [theme, setTheme] = useState(() => readTheme(identity));
  const { showToast } = useToast();
  useLayoutEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try { writeTheme(identity, next); setTheme(next); }
    catch { showToast('Theme preference could not be saved.', 'error'); }
  };
  return { isDark: theme === 'dark', toggleTheme };
}
