import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import { createApp } from './src/server/app.ts';
export default defineConfig({
  plugins: [react(), tailwindcss(), { name: 'api-server', configureServer(server) { server.middlewares.use(createApp()); } }],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, '.') } },
  server: { port: 5173, host: '0.0.0.0' },
});
