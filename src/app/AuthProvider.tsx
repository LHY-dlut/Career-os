import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from '../services/firebase';
import { useToast } from '../components/common/Toast';

interface AuthState { user: User | null; loading: boolean; signIn: () => Promise<void>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const { showToast } = useToast();
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, current => { setUser(current); setLoading(false); }, () => { setLoading(false); showToast('Could not restore your sign-in. Please sign in again.', 'error'); });
  }, [showToast]);
  const signIn = async () => {
    try { await signInWithGoogle(); showToast('Signed in. Loading your cloud workspace.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Sign-in failed.', 'error'); }
  };
  const signOut = async () => {
    try { await signOutUser(); showToast('Signed out. Guest workspace restored.'); }
    catch { showToast('Sign-out failed.', 'error'); }
  };
  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is missing.');
  return context;
}
