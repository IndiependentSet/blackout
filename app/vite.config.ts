/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/* Four pages: the game, and the three admin pages (the generator playground,
   the generation config and the level pools). The admin pages are their own chunks, so the
   game never downloads them, and are gated by sign-in plus public.admins. */
/* The dev server has its own port (5180): the auth emails link back to it, so a
   different app on localhost:5173 (a second Supabase project) would catch the login. */
export default defineConfig({
  plugins: [react()],
  server: { port: 5180, strictPort: true },
  build: {
    rolldownOptions: {
      input: { main: 'index.html', playground: 'playground.html', generation: 'generation.html', pools: 'pools.html' },
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
