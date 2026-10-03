import type { MySquad, Squad, SquadMember, SquadRole } from '../../domain/types';
import { logger } from '../logger';
import { fail, ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';
import { inviteCode } from './profiles';

const SQUAD_NAME_MAX = 40;

async function squadCounts(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const { data, error } = await supabase.from('squad_members').select('squad_id').in('squad_id', ids);
  if (error) { logger.error('squadCounts', error); return {}; }
  const out: Record<string, number> = {};
  (data || []).forEach((r: { squad_id: string }) => { out[r.squad_id] = (out[r.squad_id] || 0) + 1; });
  return out;
}

interface MembershipRow { role: SquadRole; squad_id: string; squads: Squad | null }

export async function getMySquads(userId: string | null): Promise<Result<MySquad[]>> {
  if (!userId) return ok([]);
  const { data, error } = await supabase.from('squad_members')
    .select('role, squad_id, squads(id, name, invite_code, created_by)').eq('user_id', userId);
  const res = toResult('getMySquads', (data || []) as unknown as MembershipRow[], error);
  if (!res.ok) return res;
  const rows = res.data.filter((r): r is MembershipRow & { squads: Squad } => !!r.squads);
  const counts = await squadCounts(rows.map(r => r.squad_id));
  return ok(rows.map(r => ({ ...r.squads, role: r.role, members: counts[r.squad_id] || 1 })));
}

export async function createSquad(userId: string, name: string): Promise<Result<Squad>> {
  const clean = (name || '').trim().slice(0, SQUAD_NAME_MAX);
  if (clean.length < 2) return fail('GIVE THE SQUAD A NAME.');
  const { data, error } = await supabase.from('squads')
    .insert({ name: clean, invite_code: inviteCode('SITE'), created_by: userId }).select().maybeSingle();
  if (error) return fail(error.message);
  const squad = data as Squad;
  const { error: memberErr } = await supabase.from('squad_members')
    .insert({ squad_id: squad.id, user_id: userId, role: 'foreman' });
  if (memberErr) { logger.error('createSquad', memberErr); return fail(memberErr.message); }
  return ok(squad);
}

export async function joinSquadByCode(userId: string, code: string): Promise<Result<Squad>> {
  const c = (code || '').trim().toUpperCase();
  if (!c) return fail('ENTER AN INVITE CODE.');
  const { data: squad, error: findErr } = await supabase.from('squads').select('*').eq('invite_code', c).maybeSingle();
  if (findErr) { logger.error('joinSquadByCode', findErr); return fail(findErr.message); }
  if (!squad) return fail('NO SQUAD WITH THAT CODE.');
  const { error } = await supabase.from('squad_members')
    .upsert({ squad_id: squad.id, user_id: userId, role: 'member' }, { onConflict: 'squad_id,user_id' });
  if (error) return fail(error.message);
  return ok(squad as Squad);
}

export async function leaveSquad(userId: string, squadId: string): Promise<Result<null>> {
  const { error } = await supabase.from('squad_members').delete().eq('squad_id', squadId).eq('user_id', userId);
  return toResult('leaveSquad', null, error);
}

export async function getSquadMembers(squadId: string): Promise<Result<SquadMember[]>> {
  const { data, error } = await supabase.from('squad_members').select('user_id, role').eq('squad_id', squadId);
  return toResult('getSquadMembers', (data || []) as SquadMember[], error);
}
