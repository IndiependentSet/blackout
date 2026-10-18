import type { Cosmetic, CosmeticSlot, Loadout } from './types';

export const COSMETIC_SLOTS: readonly CosmeticSlot[] = ['head', 'neck'];

export const SLOT_LABEL: Record<CosmeticSlot, string> = { head: 'HEAD', neck: 'NECK' };

/* The catalogue. The ids and `unlockBadge` values are mirrored in
   app/sql/2026-10-18-cosmetics.sql (the `cosmetics` seed) — change one, change both. */
export const COSMETICS: readonly Cosmetic[] = [
  { id: 'hard-hat', slot: 'head', label: 'HARD HAT', unlockBadge: 'purrfect-shift', unlockLabel: 'EARN THE PURR-FECT SHIFT BADGE' },
  { id: 'party-hat', slot: 'head', label: 'PARTY HAT', unlockBadge: 'first-duel-win', unlockLabel: 'EARN THE FIRST DUEL WIN BADGE' },
  { id: 'bow-tie', slot: 'neck', label: 'BOW TIE', unlockBadge: 'streak-7', unlockLabel: 'EARN THE 7-DAY STREAK BADGE' },
  { id: 'scarf', slot: 'neck', label: 'SCARF', unlockBadge: 'campaign-3-stars', unlockLabel: 'EARN THE 3-STAR CAMPAIGN BADGE' },
];

export const EMPTY_LOADOUT: Loadout = { head: null, neck: null };

export const cosmeticById = (id: string): Cosmetic | undefined => COSMETICS.find(c => c.id === id);

export const cosmeticsInSlot = (slot: CosmeticSlot): Cosmetic[] => COSMETICS.filter(c => c.slot === slot);

/** Can this player wear it? Ownership is the server's call; this is the client's view of it. */
export const isOwned = (id: string, owned: readonly string[]): boolean => owned.includes(id);

/* What the server stored, made safe to draw: an unknown id, one filed under the wrong slot, or
   one the player doesn't own reads as bare. */
export function resolveLoadout(raw: Partial<Record<CosmeticSlot, string | null>> | null | undefined, owned: readonly string[]): Loadout {
  const out: Loadout = { ...EMPTY_LOADOUT };
  for (const slot of COSMETIC_SLOTS) {
    const id = raw?.[slot];
    const c = id ? cosmeticById(id) : undefined;
    if (c && c.slot === slot && isOwned(c.id, owned)) out[slot] = c.id;
  }
  return out;
}

/** The same loadout, so a memoised scene doesn't rebuild when nothing changed. */
export const sameLoadout = (a: Loadout, b: Loadout): boolean => COSMETIC_SLOTS.every(s => a[s] === b[s]);
