import type { CampaignClears } from '../../domain/campaign';
import type { Persistence } from '../../game/hooks/useCampaignClears';
import { usePoolPublished } from '../../game/hooks/usePoolPublished';
import { IS_MOCK_SOURCE } from '../../services/levels';
import { UNPUBLISHED_COPY } from '../../services/repositories/levelPools';
import { Button, Logo, Message, Panel, StaffBadge, Tag, type StaffBadgeInfo } from '../../ui';
import { ChapterList } from './ChapterList';
import styles from './Campaign.module.css';

const PERSISTENCE_NOTE: Record<Persistence, string> = {
  loading: 'LOADING YOUR RECORD…',
  server: 'SAVED TO YOUR STAFF FILE',
  memory: 'PROGRESS NOT SAVED YET',
};

interface Props {
  signedIn: boolean;
  clears: CampaignClears;
  persistence: Persistence;
  badge: StaffBadgeInfo;
  onOpenLevel: (levelNo: number) => void;
  onOpenAccount: () => void;
  onBack: () => void;
}

/* The campaign map. The campaign needs a staff login, so a signed-out player gets the way to one instead of the map. */
export function CampaignScreen({ signedIn, clears, persistence, badge, onOpenLevel, onOpenAccount, onBack }: Props) {
  const pool = usePoolPublished('campaign');
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.masthead}>
          <div className={styles.brand}>
            <span className={styles.kicker}>STRUCTURAL DEMOLITION</span>
            <Logo size="lg" />
          </div>
          <div className={styles.blurbWrap}>
            <span className={styles.division}>CAMPAIGN · 7 CHAPTERS</span>
            <span className={styles.tagline}>Clear a level to open the next. Easy jobs first.</span>
          </div>
          <StaffBadge {...badge} layout="stack" onClick={onOpenAccount} />
        </header>

        {signedIn ? (
          <>
            <div className={styles.notes}>
              <Tag>LEVELS</Tag>
              {IS_MOCK_SOURCE && <Tag tone="orchid" size="sm">DEV MOCK</Tag>}
              <span className={styles.note}>{PERSISTENCE_NOTE[persistence]}</span>
            </div>
            {pool === 'empty' && <Message tone="muted">{UNPUBLISHED_COPY}</Message>}
            <ChapterList clears={clears} onOpenLevel={pool === 'empty' ? () => {} : onOpenLevel} />
          </>
        ) : (
          <div className={styles.gate}>
            <Panel tab="STAFF LOGIN REQUIRED">
              <p className={styles.gateText}>The campaign keeps your record, so it needs a staff login. The daily shift is open to everyone.</p>
              <Button variant="accent" onClick={onOpenAccount}>SIGN IN</Button>
            </Panel>
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="glass" onClick={onBack}>BACK TO DASHBOARD</Button>
        </div>
      </div>
    </div>
  );
}
