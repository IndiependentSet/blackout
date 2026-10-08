/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/* Three pages: the game, and the two admin pages (the generator playground
   and the generation config). The admin pages are their own chunks, so the
   game never downloads them, and are gated by sign-in plus public.admins. */
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: { main: 'index.html', playground: 'playground.html', generation: 'generation.html' },
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
