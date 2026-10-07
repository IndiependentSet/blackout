/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/* The generator playground (playground.html) is always served by `npm run dev`.
   It is built only for Vercel preview deployments (so a PR can be tried on a
   phone) or when PLAYGROUND=1 — never into a production deployment. */
/* the app's tsconfig has no Node types (they'd leak into src/); this file only needs env */
declare const process: { env: Record<string, string | undefined> };
const withPlayground = process.env.VERCEL_ENV === 'preview' || process.env.PLAYGROUND === '1';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: { main: 'index.html', ...(withPlayground ? { playground: 'playground.html' } : {}) },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    include: ['src/**/*.test.{ts,tsx,js}'],
    env: { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-key' },
  },
});
