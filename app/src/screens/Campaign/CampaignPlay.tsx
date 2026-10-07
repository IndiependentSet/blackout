import type { CampaignClears, Chapter } from '../../domain/campaign';
import { GameScreen } from '../../game/GameScreen';
import type { RecordClear, SaveClear } from '../../game/hooks/useCampaignClears';
import { useCampaignSession } from '../../game/useCampaignSession';
import type { StaffBadgeInfo } from '../../ui';

interface Props {
  chapter: Chapter;
  startLevelNo: number;
  clears: CampaignClears;
  record: RecordClear;
  saveClear: SaveClear;
  userId: string | null;
  badge: StaffBadgeInfo;
  onOpenAccount: () => void;
  onOpenHub: () => void;
}

/* One chapter on the board. Mounted only while it is being played, so its board state ends with it; the clears live above, in the Shell. */
export function CampaignPlay({ chapter, startLevelNo, clears, record, saveClear, userId, badge, onOpenAccount, onOpenHub }: Props) {
  const session = useCampaignSession(chapter, startLevelNo, clears, record, saveClear);
  return <GameScreen session={session} userId={userId} badge={badge} onOpenAccount={onOpenAccount} onOpenHub={onOpenHub} />;
}
