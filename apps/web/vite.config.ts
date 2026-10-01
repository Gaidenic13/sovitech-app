import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The Vite single-page app (docs/adr/0002-frontend-vite-fastify.md).
// Tailwind sources are set explicitly in src/styles.css, so company/** is never
// scanned (prompt 3 section 6).
//
// `/api` is proxied to the API on the same origin, so the signed session cookie and the CSRF
// cookie travel without CORS (docs/adr/0037-e2e-setup.md, docs/adr/0038-development-login.md):
// in development to the API's default port (apps/api/src/port.ts, 3000), and in the e2e run, which
// serves this build with `vite preview`, to the API the Playwright global setup starts (4174).
const API_DEV_ORIGIN = 'http://127.0.0.1:3000';
const API_E2E_ORIGIN = 'http://127.0.0.1:4174';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: { deny: ['**/company/**'] },
    proxy: { '/api': { target: API_DEV_ORIGIN, changeOrigin: false } },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    proxy: { '/api': { target: API_E2E_ORIGIN, changeOrigin: false } },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
