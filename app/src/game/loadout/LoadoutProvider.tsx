import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { EMPTY_LOADOUT } from '../../domain/cosmetics';
import type { CosmeticSlot } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import { useAuth } from '../../services/auth/authContext';
import { getWardrobe, setLoadout } from '../../services/repositories/cosmetics';
import { LoadoutContext, NO_OWNED, type LoadoutState } from './loadoutContext';

/* The player's wardrobe, held above every screen so the board and the staff office agree on
   what the cats wear. If the tables aren't there yet or the network is down, the cats are
   simply bare and the game plays exactly as it did. */
export function LoadoutProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const wardrobe = useResource(userId ? 'wardrobe:' + userId : null, () => getWardrobe(userId));
  const [saveError, setSaveError] = useState<string | null>(null);
  const { reload } = wardrobe;

  const equip = useCallback(async (slot: CosmeticSlot, id: string | null) => {
    setSaveError(null);
    const res = await setLoadout(slot, id);
    if (!res.ok) { setSaveError(res.error); return false; }
    reload();
    return true;
  }, [reload]);

  const data = wardrobe.data;
  const value = useMemo<LoadoutState>(() => ({
    loadout: data?.loadout ?? EMPTY_LOADOUT,
    owned: data?.owned ?? NO_OWNED,
    loading: !!userId && wardrobe.loading,
    error: wardrobe.error ?? saveError,
    equip,
  }), [data, userId, wardrobe.loading, wardrobe.error, saveError, equip]);

  return <LoadoutContext.Provider value={value}>{children}</LoadoutContext.Provider>;
}
