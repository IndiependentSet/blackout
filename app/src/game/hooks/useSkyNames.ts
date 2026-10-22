import { useCallback, useState } from 'react';
import type { SkyFigure, SkyName } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import { listSkyNames, nameSky } from '../../services/repositories/skyNames';

export interface SkyNames {
  names: SkyName[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  /** name (or rename) a night; resolves to an error message, or null once saved */
  name: (day: number, name: string, figure: SkyFigure) => Promise<string | null>;
}

/* The player's atlas: every night they have named. A signed-out player has an empty one and cannot add to it. */
export function useSkyNames(userId: string | null): SkyNames {
  const res = useResource(userId ? 'sky-names:' + userId : null, () => listSkyNames(userId));
  const [saving, setSaving] = useState(false);
  const { reload } = res;
  const name = useCallback(async (day: number, title: string, figure: SkyFigure) => {
    if (!userId) return 'Sign in to keep your constellations.';
    setSaving(true);
    const r = await nameSky(userId, day, title, figure);
    setSaving(false);
    if (!r.ok) return r.error;
    reload();
    return null;
  }, [userId, reload]);
  return { names: res.data ?? [], loading: res.loading, error: res.error, saving, name };
}
