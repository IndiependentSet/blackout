import { CHAPTERS, type CampaignClears, type Chapter } from '../../../../domain/campaign';
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
  /** the last level of a world charted, with another world ahead: the flight there, instead of back to the voyage */
  onWorldDone?: (chapter: Chapter) => void;
}

/* One voyage level on the board; "Fly on" goes to the next level of the world once this one is charted. */
export function VoyagePlay({ chapter, startLevelNo, clears, record, saveClear, userId, onBack, onWorldDone }: Props) {
  const session = useCampaignSession(chapter, startLevelNo, clears, record, saveClear);
  const { state, levels, dispatch } = session;
  const nextIdx = state.idx + 1;
  const canFly = nextIdx < levels.length && !!levels[nextIdx];
  const last = nextIdx >= levels.length;
  const flyOn = last && !!onWorldDone && !!CHAPTERS[chapter.index + 1];
  return (
    <SkyPlay session={session} userId={userId} title={`${planetOf(chapter.index).name} · level ${state.idx + 1}`} onBack={onBack} backLabel="Voyage"
      primary={canFly
        ? { label: `Fly to ${nextIdx + 1}`, onClick: () => dispatch({ type: 'go', idx: nextIdx }) }
        : { label: last ? 'World charted · back to the voyage' : 'Back to the voyage', onClick: flyOn ? () => onWorldDone(chapter) : onBack }} />
  );
}
