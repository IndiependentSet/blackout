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

/* Magic-link redirect target. VITE_APP_BASE_URL lets each environment
   (Vercel preview/prod, local) point the emailed link at its own origin
   instead of baking in whatever origin happened to trigger the request;
   falls back to window.location.origin so local dev needs no .env entry. */
export const APP_BASE_URL = import.meta.env.VITE_APP_BASE_URL || window.location.origin;

/* Columns safe to read for OTHER users (see 2026-09-08-crew-squads.sql's
   grant) — email is never selected for anyone but self via the auth
   session, so column discipline here is what keeps it private with RLS off. */
const PUBLIC_COLS = 'id, username, invite_code';

export function displayName(p) {
  return p && p.username ? '@' + p.username : '';
}

function inviteCode(prefix) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return prefix + '-' + s;
}

/* Same shape setUsername() below accepts — a starting point, not a
   guarantee: collisions are retried with a random suffix, not rejected. */
function defaultUsername(email) {
  const local = (email || 'staff').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 12);
  return local.length >= 3 ? local : local.padEnd(3, '0');
}

/* profiles is not an auth table — it only holds the public handle the
   leaderboard and crew search join against. username is only ever chosen
   here, once, at signup (auto-derived from email so nobody starts blank);
   later renames go through setUsername(), never through this path, so a
   handle the player later picks for themselves is never clobbered by a
   later sign-in re-deriving it from their email. */
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
  const base = defaultUsername(user.email);
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = attempt === 0 ? base : base.slice(0, 11) + '_' + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from('profiles')
      .insert({ id: user.id, email: user.email, username, invite_code: inviteCode('CAT') });
    if (!error) return;
    if (error.code !== '23505') { console.error('ensureProfile', error); return; }
  }
}

export async function getProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.from('profiles').select(PUBLIC_COLS).eq('id', userId).maybeSingle();
  if (error) { console.error('getProfile', error); return null; }
  return data;
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

// ---------- crew: handles ----------

export async function isUsernameFree(username, selfId) {
  const { data, error } = await supabase.from('profiles').select('id').ilike('username', username).limit(1);
  if (error) { console.error('isUsernameFree', error); return false; }
  return !data.length || data[0].id === selfId;
}

export async function setUsername(userId, raw) {
  const clean = (raw || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16);
  if (clean.length < 3) return { error: 'AT LEAST 3 CHARACTERS (A-Z, 0-9, _).' };
  if (!(await isUsernameFree(clean, userId))) return { error: 'THAT HANDLE IS TAKEN.' };
  const { error } = await supabase.from('profiles').update({ username: clean }).eq('id', userId);
  if (error) {
    console.error('setUsername', error);
    // 23505 = unique_violation — two people claiming the same handle in the
    // same instant race past the isUsernameFree() pre-check above; the
    // profiles.username unique constraint is the real backstop, this just
    // turns its raw Postgres error into the same copy as the pre-check.
    if (error.code === '23505') return { error: 'THAT HANDLE IS TAKEN.' };
    return { error: error.message };
  }
  return { username: clean, error: null };
}

// ---------- crew: search ----------

/* Handle prefix or exact personal invite code only — never email. Matches
   the CAT-7K2P shape ensureProfile()/createSquad() generate. */
export async function searchPlayers(term, selfId) {
  const q = (term || '').trim();
  if (q.length < 2) return { rows: [], error: null };
  const isCode = /^[A-Za-z]{3}-?[A-Za-z0-9]{4}$/.test(q);
  const filter = isCode
    ? 'invite_code.eq.' + q.toUpperCase().replace(/^([A-Za-z]{3})([A-Za-z0-9]{4})$/, '$1-$2')
    : 'username.ilike.' + q.replace(/[%,]/g, '') + '%';
  const { data, error } = await supabase.from('profiles').select(PUBLIC_COLS).or(filter).limit(20);
  if (error) { console.error('searchPlayers', error); return { rows: [], error: error.message }; }
  return { rows: (data || []).filter(p => p.id !== selfId), error: null };
}

export async function profilesByIds(ids) {
  if (!ids || !ids.length) return {};
  const { data, error } = await supabase.from('profiles').select(PUBLIC_COLS).in('id', ids);
  if (error) { console.error('profilesByIds', error); return {}; }
  const map = {};
  (data || []).forEach(p => { map[p.id] = p; });
  return map;
}

// ---------- crew: friendships (mutual, needs acceptance) ----------

export async function getFriendships(userId) {
  if (!userId) return { friends: [], incoming: [], outgoing: [], error: null };
  const { data, error } = await supabase.from('friendships')
    .select('*').or('requester_id.eq.' + userId + ',addressee_id.eq.' + userId);
  if (error) { console.error('getFriendships', error); return { friends: [], incoming: [], outgoing: [], error: error.message }; }
  const rows = data || [];
  const ids = new Set();
  rows.forEach(r => { ids.add(r.requester_id); ids.add(r.addressee_id); });
  ids.delete(userId);
  const people = await profilesByIds([...ids]);
  const of = id => people[id] || { id };
  return {
    friends: rows.filter(r => r.status === 'accepted')
      .map(r => ({ row: r, person: of(r.requester_id === userId ? r.addressee_id : r.requester_id) })),
    incoming: rows.filter(r => r.status === 'pending' && r.addressee_id === userId)
      .map(r => ({ row: r, person: of(r.requester_id) })),
    outgoing: rows.filter(r => r.status === 'pending' && r.requester_id === userId)
      .map(r => ({ row: r, person: of(r.addressee_id) })),
    error: null,
  };
}

export async function requestFriend(selfId, otherId) {
  const { error } = await supabase.from('friendships')
    .upsert({ requester_id: selfId, addressee_id: otherId, status: 'pending' },
      { onConflict: 'requester_id,addressee_id' });
  if (error) console.error('requestFriend', error);
  return { error: error ? error.message : null };
}

export async function acceptFriend(rowId) {
  const { error } = await supabase.from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', rowId);
  if (error) console.error('acceptFriend', error);
  return { error: error ? error.message : null };
}

export async function removeFriendship(rowId) {
  const { error } = await supabase.from('friendships').delete().eq('id', rowId);
  if (error) console.error('removeFriendship', error);
  return { error: error ? error.message : null };
}

// ---------- crew: squads ----------

async function squadCounts(ids) {
  if (!ids.length) return {};
  const { data, error } = await supabase.from('squad_members').select('squad_id').in('squad_id', ids);
  if (error) { console.error('squadCounts', error); return {}; }
  const out = {};
  (data || []).forEach(r => { out[r.squad_id] = (out[r.squad_id] || 0) + 1; });
  return out;
}

export async function getMySquads(userId) {
  if (!userId) return { rows: [], error: null };
  const { data, error } = await supabase.from('squad_members')
    .select('role, squad_id, squads(id, name, invite_code, created_by)').eq('user_id', userId);
  if (error) { console.error('getMySquads', error); return { rows: [], error: error.message }; }
  const rows = (data || []).filter(r => r.squads);
  const counts = await squadCounts(rows.map(r => r.squad_id));
  return { rows: rows.map(r => ({ ...r.squads, role: r.role, members: counts[r.squad_id] || 1 })), error: null };
}

export async function createSquad(userId, name) {
  const clean = (name || '').trim().slice(0, 40);
  if (clean.length < 2) return { error: 'GIVE THE SQUAD A NAME.' };
  const { data, error } = await supabase.from('squads')
    .insert({ name: clean, invite_code: inviteCode('SITE'), created_by: userId }).select().maybeSingle();
  if (error) return { error: error.message };
  const { error: memberErr } = await supabase.from('squad_members')
    .insert({ squad_id: data.id, user_id: userId, role: 'foreman' });
  if (memberErr) { console.error('createSquad', memberErr); return { error: memberErr.message }; }
  return { squad: data, error: null };
}

export async function joinSquadByCode(userId, code) {
  const c = (code || '').trim().toUpperCase();
  if (!c) return { error: 'ENTER AN INVITE CODE.' };
  const { data: squad, error: findErr } = await supabase.from('squads').select('*').eq('invite_code', c).maybeSingle();
  if (findErr) { console.error('joinSquadByCode', findErr); return { error: findErr.message }; }
  if (!squad) return { error: 'NO SQUAD WITH THAT CODE.' };
  const { error } = await supabase.from('squad_members')
    .upsert({ squad_id: squad.id, user_id: userId, role: 'member' }, { onConflict: 'squad_id,user_id' });
  if (error) return { error: error.message };
  return { squad, error: null };
}

export async function leaveSquad(userId, squadId) {
  const { error } = await supabase.from('squad_members').delete().eq('squad_id', squadId).eq('user_id', userId);
  if (error) console.error('leaveSquad', error);
  return { error: error ? error.message : null };
}

export async function getSquadMembers(squadId) {
  const { data, error } = await supabase.from('squad_members').select('user_id, role').eq('squad_id', squadId);
  if (error) { console.error('getSquadMembers', error); return { rows: [], error: error.message }; }
  return { rows: data || [], error: null };
}

// ---------- crew: scores & boards ----------
// Same player_scores view (2026-09-08-crew-squads.sql) filtered by an id
// list, so friends/squad boards and head-to-head use identical arithmetic
// to the global leaderboard_alltime/leaderboard_weekly views.

export async function getScores(userIds) {
  if (!userIds || !userIds.length) return { rows: [], error: null };
  const { data, error } = await supabase.from('player_scores').select('*').in('user_id', userIds);
  if (error) { console.error('getScores', error); return { rows: [], error: error.message }; }
  return { rows: data || [], error: null };
}

export async function getPlayerScore(userId) {
  const { rows } = await getScores([userId]);
  return rows[0] || { user_id: userId, name: '', score: 0, week_score: 0 };
}

export async function getBoardFor(userIds, scope) {
  const { rows } = await getScores(userIds);
  const key = scope === 'week' ? 'week_score' : 'score';
  return rows.map(r => ({ user_id: r.user_id, name: r.name, score: r[key] || 0 }))
    .sort((a, b) => b.score - a.score);
}
