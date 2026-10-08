import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';

/* Whether the signed-in user is an admin (public.admins). This only decides
   what the admin pages show: every admin write is checked again in Postgres
   (app/sql/2026-10-07-admin-generation-config.sql). */
export async function isAdmin(userId: string | null): Promise<Result<boolean>> {
  if (!userId) return ok(false);
  const { data, error } = await supabase.rpc('is_admin');
  return toResult('isAdmin', data === true, error);
}
