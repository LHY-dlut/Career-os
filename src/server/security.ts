import type { RequestHandler } from 'express';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export type VerifyToken = (token: string) => Promise<{ uid: string }>;
export const verifyFirebaseToken: VerifyToken = async token => {
  const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });
  return getAuth(app).verifyIdToken(token, true);
};
export function requireIdentity(verify: VerifyToken, allowedUids: string[]): RequestHandler {
  return async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/.exec(req.header('Authorization') || '');
    if (!match) { res.status(401).json({ error: 'Sign in to use AI Copilot.' }); return; }
    try {
      const { uid } = await verify(match[1]);
      if (!allowedUids.length) { res.status(503).json({ error: 'AI access has not been configured by the workspace owner.' }); return; }
      if (!allowedUids.includes(uid)) { res.status(403).json({ error: 'AI access is limited to approved accounts.' }); return; }
      res.locals.uid = uid;
      next();
    } catch { res.status(401).json({ error: 'Your session is invalid or expired. Sign in again.' }); }
  };
}
export function originPolicy(origins: string[]): RequestHandler {
  return (req, res, next) => {
    const origin = req.header('Origin');
    if (origin) {
      if (!origins.includes(origin)) { res.status(403).json({ error: 'Origin is not allowed.' }); return; }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.vary('Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  };
}
