import { EMPTY_LOADOUT, resolveLoadout } from '../../domain/cosmetics';
import type { CosmeticSlot, Loadout } from '../../domain/types';
import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';

/** What a player owns and what they have on. The catalogue itself is `domain/cosmetics.ts`. */
export interface Wardrobe { owned: string[]; loadout: Loadout }

export const NO_WARDROBE: Wardrobe = { owned: [], loadout: EMPTY_LOADOUT };

interface OwnedRow { cosmetic_id: string }
interface WornRow { slot: string; cosmetic_id: string }

/* Cosmetics are unlocked by the server when a badge is earned, and worn through `set_loadout`
   (app/sql/2026-10-18-cosmetics.sql): the client can read its own rows and write none of them. */

/** The player's owned accessories and loadout. No user means a bare, empty wardrobe. */
export async function getWardrobe(userId: string | null): Promise<Result<Wardrobe>> {
  if (!userId) return ok(NO_WARDROBE);
  const [own, worn] = await Promise.all([
    supabase.from('player_cosmetics').select('cosmetic_id').eq('user_id', userId),
    supabase.from('player_loadout').select('slot, cosmetic_id').eq('user_id', userId),
  ]);
  const ownedRes = toResult('getOwnedCosmetics', (own.data ?? []) as OwnedRow[], own.error);
  if (!ownedRes.ok) return ownedRes;
  const wornRes = toResult('getLoadout', (worn.data ?? []) as WornRow[], worn.error);
  if (!wornRes.ok) return wornRes;

  const owned = ownedRes.data.map(r => r.cosmetic_id);
  const raw: Partial<Record<CosmeticSlot, string>> = {};
  for (const row of wornRes.data) {
    if (row.slot === 'head' || row.slot === 'neck') raw[row.slot] = row.cosmetic_id;
  }
  return ok({ owned, loadout: resolveLoadout(raw, owned) });
}

/** Put an accessory on, or take the slot's one off with null. The server checks the player owns it. */
export async function setLoadout(slot: CosmeticSlot, cosmeticId: string | null): Promise<Result<null>> {
  const { error } = await supabase.rpc('set_loadout', { p_slot: slot, p_cosmetic: cosmeticId });
  return toResult('setLoadout', null, error);
}
