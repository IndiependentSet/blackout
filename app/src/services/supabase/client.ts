import { createClient } from '@supabase/supabase-js';

/* Public anon key — Supabase's model gates access with GRANTs (see app/sql/),
   not secrecy of this key, so it is meant to ship client-side. Users live
   entirely in Supabase Auth; nothing here is a custom auth/session system.
   Read from Vite env vars (inlined at build time, overridable per Vercel
   environment). */
const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey);

/** Magic-link / OAuth redirect target; each environment points at its own origin. */
export const APP_BASE_URL: string = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
