import { useI18n } from '../i18n/I18nProvider';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from '../services/firebase';
import { useToast } from '../components/common/Toast';

interface AuthState { user: User | null; loading: boolean; signIn: () => Promise<void>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const { showToast } = useToast();
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, current => { setUser(current); setLoading(false); }, () => { setLoading(false); showToast(t("Could not restore your sign-in. Please sign in again.", "无法恢复登录状态，请重新登录。"), 'error'); });
  }, [showToast, t]);
  const signIn = async () => {
    try { await signInWithGoogle(); showToast(t("Signed in. Loading your cloud workspace.", "登录成功，正在加载云端工作区。")); }
    catch (error) { showToast(error instanceof Error ? error.message : t("Sign-in failed.", "登录失败。"), 'error'); }
  };
  const signOut = async () => {
    try { await signOutUser(); showToast(t("Signed out. Guest workspace restored.", "已退出登录并恢复访客工作区。")); }
    catch { showToast(t("Sign-out failed.", "退出登录失败。"), 'error'); }
  };
  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is missing.');
  return context;
}
