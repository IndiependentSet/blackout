/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/* The generator playground (playground.html) is always served by `npm run dev`.
   It is built only for Vercel preview deployments (so a PR can be tried on a
   phone) or when PLAYGROUND=1 — never into a production deployment. */
const withPlayground = process.env.VERCEL_ENV === 'preview' || process.env.PLAYGROUND === '1';
const page = (f: string) => fileURLToPath(new URL(f, import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: { main: page('index.html'), ...(withPlayground ? { playground: page('playground.html') } : {}) },
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
