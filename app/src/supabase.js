import { createClient } from '@supabase/supabase-js';

/* Public anon key — Supabase's model gates access with GRANTs (see
   supabase-schema.sql), not secrecy of this key, so it's meant to ship
   client-side. Users live entirely in Supabase Auth; nothing here is a
   custom auth/session system.
   Read from Vite env vars (VITE_ prefix = inlined at build time, so this
   is what Vercel's per-environment project settings can override) with the
   live project's values as fallback, so local dev works with no .env file. */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function nickFromEmail(email) {
  if (!email) return '';
  const n = email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  return n || 'STAFF';
}

/* same charset/casing as nickFromEmail's default, so a hand-typed nickname
   reads like the rest of the crew roster */
export function sanitizeNickname(raw) {
  const n = (raw || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  return n.slice(0, 24);
}

/* profiles is not an auth table — it only holds the public nickname the
   leaderboard joins against. Only ever created here, once, so a nickname
   the player later picks for themselves is never clobbered by a later
   sign-in re-deriving it from their email. */
export async function ensureProfile(user) {
  if (!user) return;
  const { data: existing, error: selErr } = await supabase.from('profiles')
    .select('id').eq('id', user.id).maybeSingle();
  if (selErr) { console.error('ensureProfile', selErr); return; }
  if (existing) {
    const { error } = await supabase.from('profiles').update({ email: user.email }).eq('id', user.id);
    if (error) console.error('ensureProfile', error);
    return;
  }
  const { error } = await supabase.from('profiles')
    .insert({ id: user.id, email: user.email, nickname: nickFromEmail(user.email) });
  if (error) console.error('ensureProfile', error);
}

export async function getProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.from('profiles').select('nickname').eq('id', userId).maybeSingle();
  if (error) { console.error('getProfile', error); return null; }
  return data;
}

export async function updateNickname(userId, raw) {
  if (!userId) return { error: 'not signed in' };
  const nickname = sanitizeNickname(raw);
  if (!nickname) return { error: 'PICK A NICKNAME' };
  const { error } = await supabase.from('profiles').update({ nickname }).eq('id', userId);
  if (error) { console.error('updateNickname', error); return { error: error.message }; }
  return { error: null, nickname };
}

/* stars is the level's own difficulty rating (engine.js's difficulty(), 1-3
   — the same number the ✦✦✦ under SITE N shows). The leaderboard score
   itself is computed in the DB (see app/sql/…-weighted-score.sql) from
   stars and how far catsUsed landed from par, not from on_budget alone. */
export async function recordClear(userId, dayNumber, siteIndex, catsUsed, par, stars) {
  if (!userId) return { error: null };
  const { error } = await supabase.from('site_clears').upsert({
    user_id: userId, day_number: dayNumber, site_index: siteIndex,
    cats_used: catsUsed, par, stars, on_budget: catsUsed <= par,
  }, { onConflict: 'user_id,day_number,site_index' });
  if (error) console.error('recordClear', error);
  return { error: error ? error.message : null };
}

export async function getAllTimeCount(userId) {
  if (!userId) return { count: 0, error: null };
  const { count, error } = await supabase.from('site_clears')
    .select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('on_budget', true);
  if (error) { console.error('getAllTimeCount', error); return { count: 0, error: error.message }; }
  return { count: count || 0, error: null };
}

export async function getLeaderboard(scope) {
  const view = scope === 'week' ? 'leaderboard_weekly' : 'leaderboard_alltime';
  const { data, error } = await supabase.from(view).select('*').order('score', { ascending: false }).limit(20);
  if (error) { console.error('getLeaderboard', error); return { rows: [], error: error.message }; }
  return { rows: data || [], error: null };
}
