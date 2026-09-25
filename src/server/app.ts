import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createApiRouter } from './apiRouter.ts';
import { originPolicy, verifyFirebaseToken, type VerifyToken } from './security.ts';

export function createApp(options: { verifyToken?: VerifyToken; allowedUids?: string[]; allowedOrigins?: string[]; staticDir?: string; rateLimit?: number } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
  const origins = options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://127.0.0.1:5173')).split(',').map(s => s.trim()).filter(Boolean);
  if (origins.includes('*')) throw new Error('ALLOWED_ORIGINS must contain exact origins.');
  app.use('/api', originPolicy(origins));
  app.use('/api', createApiRouter({ verifyToken: options.verifyToken || verifyFirebaseToken, allowedUids: options.allowedUids ?? (process.env.AI_ALLOWED_UIDS || '').split(',').map(s => s.trim()).filter(Boolean), rateLimit: options.rateLimit }));
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API endpoint not found.' }); });
  if (options.staticDir) {
    app.use(express.static(options.staticDir));
    app.get('*', (_req, res) => { res.sendFile(path.join(options.staticDir!, 'index.html')); });
  }
  app.use((error: { status?: number; type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    res.status(status).json({ error: status === 413 ? 'Request body is too large.' : status === 400 ? 'Invalid JSON body.' : 'Request failed. Please retry.' });
  });
  return app;
}
