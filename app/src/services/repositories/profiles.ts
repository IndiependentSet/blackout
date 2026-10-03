import type { User } from '@supabase/supabase-js';
import { cleanUsername, defaultUsername, USERNAME_MIN } from '../../domain/profile';
import type { Profile } from '../../domain/types';
import { logger } from '../logger';
import { fail, ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult, UNIQUE_VIOLATION } from '../supabase/guard';

/* Columns safe to read for OTHER users — email is never selected for anyone
   but self via the auth session, so column discipline here is what keeps it
   private with RLS off. */
export const PUBLIC_COLS = 'id, username, invite_code';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Random invite code such as CAT-7K2P / SITE-4M9X. */
export function inviteCode(prefix: string): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return prefix + '-' + s;
}

/* profiles is not an auth table — it only holds the public handle the
   leaderboard and crew search join against. The username is only chosen here,
   once, at signup (derived from the email); later renames go through
   setUsername(), so a handle the player picked is never clobbered by a later
   sign-in re-deriving it. */
export async function ensureProfile(user: User | null | undefined): Promise<void> {
  if (!user) return;
  const { data: existing, error: selErr } = await supabase.from('profiles')
    .select('id').eq('id', user.id).maybeSingle();
  if (selErr) { logger.error('ensureProfile', selErr); return; }
  if (existing) {
    const { error } = await supabase.from('profiles').update({ email: user.email }).eq('id', user.id);
    if (error) logger.error('ensureProfile', error);
    return;
  }
  const base = defaultUsername(user.email);
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = attempt === 0 ? base : base.slice(0, 11) + '_' + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from('profiles')
      .insert({ id: user.id, email: user.email, username, invite_code: inviteCode('CAT') });
    if (!error) return;
    if (error.code !== UNIQUE_VIOLATION) { logger.error('ensureProfile', error); return; }
  }
}

export async function getProfile(userId: string | null): Promise<Result<Profile | null>> {
  if (!userId) return ok(null);
  const { data, error } = await supabase.from('profiles').select(PUBLIC_COLS).eq('id', userId).maybeSingle();
  return toResult('getProfile', data as Profile | null, error);
}

export async function profilesByIds(ids: string[]): Promise<Result<Record<string, Profile>>> {
  if (!ids.length) return ok({});
  const { data, error } = await supabase.from('profiles').select(PUBLIC_COLS).in('id', ids);
  const res = toResult('profilesByIds', (data || []) as Profile[], error);
  if (!res.ok) return res;
  return ok(Object.fromEntries(res.data.map(p => [p.id, p])));
}

async function isUsernameFree(username: string, selfId: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('id').ilike('username', username).limit(1);
  if (error) { logger.error('isUsernameFree', error); return false; }
  return !data.length || data[0].id === selfId;
}

const TAKEN = 'THAT HANDLE IS TAKEN.';

export async function setUsername(userId: string, raw: string): Promise<Result<string>> {
  const clean = cleanUsername(raw);
  if (clean.length < USERNAME_MIN) return fail('AT LEAST 3 CHARACTERS (A-Z, 0-9, _).');
  if (!(await isUsernameFree(clean, userId))) return fail(TAKEN);
  const { error } = await supabase.from('profiles').update({ username: clean }).eq('id', userId);
  if (error) {
    logger.error('setUsername', error);
    /* two people claiming the same handle in the same instant race past the
       pre-check above; the unique constraint is the real backstop, and this
       turns its raw Postgres error into the same copy */
    return fail(error.code === UNIQUE_VIOLATION ? TAKEN : error.message);
  }
  return ok(clean);
}

/** Handle prefix or exact personal invite code only — never email. */
export async function searchPlayers(term: string, selfId: string): Promise<Result<Profile[]>> {
  const q = (term || '').trim();
  if (q.length < 2) return ok([]);
  const isCode = /^[A-Za-z]{3}-?[A-Za-z0-9]{4}$/.test(q);
  const filter = isCode
    ? 'invite_code.eq.' + q.toUpperCase().replace(/^([A-Za-z]{3})([A-Za-z0-9]{4})$/, '$1-$2')
    : 'username.ilike.' + q.replace(/[%,]/g, '') + '%';
  const { data, error } = await supabase.from('profiles').select(PUBLIC_COLS).or(filter).limit(20);
  const res = toResult('searchPlayers', (data || []) as Profile[], error);
  return res.ok ? ok(res.data.filter(p => p.id !== selfId)) : res;
}
