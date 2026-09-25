import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './src/server/app.ts';
const directory = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.resolve(directory, directory.endsWith('dist-server') ? '../dist' : 'dist');
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
createApp({ staticDir }).listen(port, '0.0.0.0', () => console.log(`AI Career OS listening on port ${port}`));
