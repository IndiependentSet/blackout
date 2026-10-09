/* Dev helpers for the local Supabase (tools/db-local.sh runs these through tsx):
 *
 *   local.ts seed            test players, a friendship, an admin, and the three level pools
 *   local.ts pools [MODE…]   (re)publish the default pools, as the admin; all modes if none named
 *   local.ts login NAME      print a one-click sign-in link for admin | alice | bob
 *
 * Local only: it reads the keys of the running stack from `supabase status`
 * and refuses anything that isn't 127.0.0.1. Not type-checked by `npm run check`
 * (it lives outside src/); keep it small.
 */
import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_CURVES, curveRuleErrors, generateSlot, poolSlots, solve } from '../src/domain/generation';

const POOL_MODES = ['campaign', 'survival', 'match'] as const;
type PoolMode = (typeof POOL_MODES)[number];

const APP_URL = 'http://localhost:5180';   // the dev port, see vite.config.ts
const ADMIN_PASSWORD = 'local-admin-password';   // only the admin has one: the pools are published by signing in as them
const PLAYERS = [
  { key: 'admin', username: 'boss', email: 'admin@local.test' },
  { key: 'alice', username: 'alice', email: 'alice@local.test' },
  { key: 'bob', username: 'bob', email: 'bob@local.test' },
] as const;

function stackEnv(): Record<string, string> {
  const out = execFileSync('npx', ['--yes', 'supabase', 'status', '-o', 'env'], { encoding: 'utf8' });
  const env: Record<string, string> = {};
  for (const line of out.split('\n')) {
    const m = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim());
    if (m) env[m[1]] = m[2];
  }
  for (const k of ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY']) if (!env[k]) throw new Error(`supabase status has no ${k}: is the stack running? (npm run db:up)`);
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(env.API_URL)) throw new Error(`refusing to touch ${env.API_URL}: this is for the local stack only`);
  return env;
}

const env = stackEnv();
const service = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = <T>(what: string, r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

async function ensurePlayer(p: (typeof PLAYERS)[number]): Promise<string> {
  const created = await service.auth.admin.createUser({
    email: p.email, email_confirm: true, ...(p.key === 'admin' && { password: ADMIN_PASSWORD }),
  });
  let id = created.data.user?.id;
  if (!id) {   // already there
    const list = must('list users', await service.auth.admin.listUsers({ perPage: 200 }));
    id = list.users.find(u => u.email === p.email)?.id;
  }
  if (!id) throw new Error(`could not create or find ${p.email}: ${created.error?.message}`);
  must('profile ' + p.username, await service.from('profiles').upsert({
    id, email: p.email, username: p.username, invite_code: 'CAT-' + (p.username.toUpperCase() + 'XXXXXX').slice(0, 6),
  }, { onConflict: 'id' }).select('id'));
  return id;
}

async function seedPlayers() {
  const ids: Record<string, string> = {};
  for (const p of PLAYERS) ids[p.key] = await ensurePlayer(p);
  must('admin row', await service.from('admins').upsert({ user_id: ids.admin }, { onConflict: 'user_id' }).select('user_id'));
  must('friendship', await service.from('friendships').upsert(
    { requester_id: ids.alice, addressee_id: ids.bob, status: 'accepted' }, { onConflict: 'requester_id,addressee_id' },
  ).select('id'));
  console.log('players: boss (admin), alice and bob (friends): sign in with admin@local.test, alice@local.test, bob@local.test');
}

async function adminClient(): Promise<SupabaseClient> {
  const c = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false } });
  must('admin sign-in', await c.auth.signInWithPassword({ email: 'admin@local.test', password: ADMIN_PASSWORD }));
  return c;
}

async function publishPools(modes: readonly PoolMode[]) {
  const admin = await adminClient();
  for (const mode of modes) {
    const curve = DEFAULT_CURVES[mode];
    const errors = curveRuleErrors(mode, curve);
    if (errors.length) throw new Error(`${mode}: ${errors.join('; ')}`);
    const slots = poolSlots(mode, curve);
    const entries = [];
    const t0 = Date.now();
    for (const [i, slot] of slots.entries()) {
      const { level } = generateSlot(curve, slot);
      const r = solve(level);
      if (r.count !== 1 || r.k !== level.k) throw new Error(`${mode} slot ${slot.slot}: not a unique cover`);
      entries.push({ slot: slot.slot, tier: slot.tier, level });
      process.stdout.write(`\r${mode}: ${i + 1}/${slots.length}`);
    }
    const version = must(`publish ${mode}`, await admin.rpc('publish_level_pool', {
      p_mode: mode, p_curve: curve, p_levels: entries, p_note: 'local seed',
    }));
    console.log(`\r${mode}: published v${version} (${slots.length} levels, ${Math.round((Date.now() - t0) / 1000)} s)`);
  }
}

async function publishedModes(): Promise<Set<PoolMode>> {
  const rows = must('level_pools', await service.from('level_pools').select('mode'));
  return new Set((rows as { mode: PoolMode }[]).map(r => r.mode));
}

async function login(name: string) {
  const p = PLAYERS.find(x => x.key === name || x.username === name);
  if (!p) throw new Error(`no such player ${name}: admin, alice or bob`);
  const link = must('link', await service.auth.admin.generateLink({ type: 'magiclink', email: p.email, options: { redirectTo: APP_URL } }));
  console.log(link.properties.action_link);
}

const [cmd = 'seed', ...rest] = process.argv.slice(2);
if (cmd === 'seed') {
  await seedPlayers();
  const have = await publishedModes();
  const todo = POOL_MODES.filter(m => !have.has(m));
  if (todo.length) await publishPools(todo);
  else console.log('pools: already published (npm run local:pools to publish them again as a new version)');
} else if (cmd === 'pools') {
  const modes = rest.length ? rest.map(m => { if (!POOL_MODES.includes(m as PoolMode)) throw new Error(`unknown mode ${m}`); return m as PoolMode; }) : POOL_MODES;
  await publishPools(modes);
} else if (cmd === 'login') {
  await login(rest[0] ?? 'alice');
} else {
  console.error('usage: local.ts seed | pools [campaign|survival|match…] | login admin|alice|bob');
  process.exit(2);
}
