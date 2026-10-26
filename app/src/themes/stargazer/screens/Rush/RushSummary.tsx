import type { RunSummary } from '../../../../domain/survival';
import { Button } from '../../kit/Button';
import { DeskPage } from '../../kit/DeskPage';
import { Split } from '../../kit/Layout';
import { Eyebrow, Note } from '../../kit/Page';
import { plural } from '../../copy';
import { BoardPanel } from '../Board/BoardPanel';
import styles from './Rush.module.css';

interface Props {
  summary: RunSummary;
  before: RunSummary | null;
  isRecord: boolean;
  signedIn: boolean;
  unsaved: boolean;
  /** the run is banked on the server, so the board can be read without missing it */
  recorded: boolean;
  userId: string | null;
  onSignIn: () => void;
  onAgain: () => void;
  onBack: () => void;
}

/* Dawn: what a Meteor Rush run came to, and everyone's best runs. */
export function RushSummary({ summary, before, isRecord, signedIn, unsaved, recorded, userId, onSignIn, onAgain, onBack }: Props) {
  const record = isRecord ? (signedIn ? 'A new personal best.' : 'A new best for this visit.')
    : before && before.sites > 0 ? `Your best is ${plural(before.sites, 'sky', 'skies')}.` : 'No skies charted this time.';
  return (
    <DeskPage active="rush" tone="rush" className={styles.summary}>
      <Split
        before={<>
          <Eyebrow tone="mars">Meteor Rush · dawn</Eyebrow>
          <h1 className={styles.summaryTitle}>{summary.sites === 0 ? 'The sun came up.' : `${plural(summary.sites, 'sky', 'skies')} before dawn.`}</h1>
          <div className={styles.stats}>
            <div className={styles.stat}><b>{summary.sites}</b><span>charted</span></div>
            <div className={styles.stat}><b>{summary.perfect}</b><span>at par</span></div>
            <div className={styles.stat}><b>{summary.score.toLocaleString()}</b><span>points</span></div>
          </div>
          <Note>{record}</Note>
        </>}
        lead={<BoardPanel kind="rush" userId={userId} enabled={recorded || !signedIn} onSignIn={onSignIn} />}
        after={<>
          {unsaved && <Note tone="error">This run wasn’t saved to the leaderboard.</Note>}
          <div className={styles.actions}>
            <Button block onClick={onAgain}>Rush again</Button>
            <Button block kind="ghost" size="md" onClick={onBack}>Back to tonight</Button>
          </div>
        </>} />
    </DeskPage>
  );
}
