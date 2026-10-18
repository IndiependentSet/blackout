import { createContext, useContext } from 'react';
import { EMPTY_LOADOUT } from '../../domain/cosmetics';
import type { CosmeticSlot, Loadout } from '../../domain/types';

/** What the signed-in player owns and wears, for the board and the wardrobe alike. */
export interface LoadoutState {
  loadout: Loadout;
  /** ids of the accessories the player has unlocked */
  owned: string[];
  loading: boolean;
  /** a message when the wardrobe couldn't be read or saved; never blocks play */
  error: string | null;
  /** wear an accessory in a slot, or take the slot off with null; resolves true once it stuck */
  equip: (slot: CosmeticSlot, id: string | null) => Promise<boolean>;
}

export const NO_OWNED: string[] = [];

/** Signed out, or no provider: every cat is bare. */
export const BARE: LoadoutState = { loadout: EMPTY_LOADOUT, owned: NO_OWNED, loading: false, error: null, equip: async () => false };

export const LoadoutContext = createContext<LoadoutState>(BARE);

export const useLoadout = () => useContext(LoadoutContext);
