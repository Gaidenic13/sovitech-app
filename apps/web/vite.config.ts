import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The Vite single-page app (docs/adr/0002-frontend-vite-fastify.md).
// Tailwind sources are set explicitly in src/styles.css, so company/** is never
// scanned (prompt 3 section 6).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: { deny: ['**/company/**'] },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
