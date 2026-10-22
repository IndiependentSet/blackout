import type { CampaignClears, Chapter } from '../../../../domain/campaign';
import type { RecordClear, SaveClear } from '../../../../game/hooks/useCampaignClears';
import { useCampaignSession } from '../../../../game/useCampaignSession';
import { SkyPlay } from '../../play/SkyPlay';
import { planetOf } from '../../copy';

interface Props {
  chapter: Chapter;
  startLevelNo: number;
  clears: CampaignClears;
  record: RecordClear;
  saveClear: SaveClear;
  userId: string | null;
  onBack: () => void;
}

/* One voyage level on the board; "Fly on" goes to the next level of the world once this one is charted. */
export function VoyagePlay({ chapter, startLevelNo, clears, record, saveClear, userId, onBack }: Props) {
  const session = useCampaignSession(chapter, startLevelNo, clears, record, saveClear);
  const { state, levels, dispatch } = session;
  const nextIdx = state.idx + 1;
  const canFly = nextIdx < levels.length && !!levels[nextIdx];
  const last = nextIdx >= levels.length;
  return (
    <SkyPlay session={session} userId={userId} title={`${planetOf(chapter.index).name} · level ${state.idx + 1}`} onBack={onBack} backLabel="Voyage"
      primary={canFly
        ? { label: `Fly to ${nextIdx + 1}`, onClick: () => dispatch({ type: 'go', idx: nextIdx }) }
        : { label: last ? 'World charted · back to the voyage' : 'Back to the voyage', onClick: onBack }} />
  );
}
