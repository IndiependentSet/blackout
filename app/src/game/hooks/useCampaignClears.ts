import { useCallback, useMemo, useState } from 'react';
import { campaignStars, mergeClear, type CampaignClears } from '../../domain/campaign';
import type { CampaignClear, HintTier, SiteResult } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import { getCampaignClears, recordCampaignClear } from '../../services/repositories/campaign';
import { fail, type Result } from '../../services/result';

export type RecordClear = (levelNo: number, run: SiteResult, consulted: 0 | HintTier) => void;
export type SaveClear = (levelNo: number, run: SiteResult, consulted: 0 | HintTier) => Promise<Result<null>>;

/** loading: asking the server · server: the record is read from and saved to the server · memory: this page only */
export type Persistence = 'loading' | 'server' | 'memory';

const NONE: CampaignClears = new Map();

/* The signed-in player's campaign record. What the server holds is loaded once
   per account; a clear is added to the in-memory record straight away (so the
   map moves on at once) and written to the server by `save`. If the server can
   not be reached, or a save fails, the record carries on in memory and
   `persistence` says so. A record belongs to the account that made it: another
   account (or none) starts from an empty one. */
export function useCampaignClears(userId: string | null): {
  clears: CampaignClears; record: RecordClear; save: SaveClear; persistence: Persistence;
} {
  const [store, setStore] = useState<{ owner: string | null; clears: CampaignClears }>({ owner: null, clears: NONE });
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const remote = useResource<CampaignClear[]>(userId ? 'campaign:' + userId : null, () => getCampaignClears(userId));

  const local = store.owner === userId ? store.clears : NONE;
  const clears = useMemo<CampaignClears>(() => {
    if (!userId || !remote.data) return local;
    const merged = new Map<number, CampaignClear>(remote.data.map(c => [c.levelNo, c]));
    for (const c of local.values()) merged.set(c.levelNo, mergeClear(merged.get(c.levelNo), c));
    return merged;
  }, [userId, remote.data, local]);

  const record = useCallback<RecordClear>((levelNo, run, consulted) => {
    setStore(prev => {
      const mine = prev.owner === userId ? prev.clears : NONE;
      const next = new Map(mine);
      next.set(levelNo, mergeClear(mine.get(levelNo), { levelNo, run, campaignStars: campaignStars(run, consulted) }));
      return { owner: userId, clears: next };
    });
  }, [userId]);

  const save = useCallback<SaveClear>(async (levelNo, run, consulted) => {
    if (!userId) return fail('SIGN IN TO SAVE YOUR PROGRESS');
    const res = await recordCampaignClear(userId, levelNo, run, campaignStars(run, consulted));
    setFailedFor(cur => (res.ok ? (cur === userId ? null : cur) : userId));
    return res;
  }, [userId]);

  const persistence: Persistence = !userId ? 'memory'
    : remote.loading ? 'loading'
    : remote.error || failedFor === userId ? 'memory' : 'server';

  return { clears, record, save, persistence };
}
