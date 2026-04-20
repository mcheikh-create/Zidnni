// Zidnni/frontend/vite.config.js
// Maqasid: حفظ العقل
//
// Proxies /api and /ws to the backend on :3001 so the frontend can call
// same-origin paths during development.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
});
