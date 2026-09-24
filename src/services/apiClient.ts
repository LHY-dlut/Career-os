import { auth } from './firebase';
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export async function apiFetch(path: string, init: RequestInit = {}) {
  const user = auth?.currentUser;
  if (!user) throw new Error('Sign in to use AI Copilot. Guest AI is disabled.');
  const token = await user.getIdToken();
  if (auth?.currentUser?.uid !== user.uid) throw new Error('Your account changed. Please retry.');
  try {
    return await fetch(`${baseUrl}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(45000) });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) throw new Error('AI request timed out. Please retry.');
    throw new Error('Could not reach the AI server. Check your connection and retry.');
  }
}
