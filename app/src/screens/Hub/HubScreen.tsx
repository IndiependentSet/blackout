import { Button, Logo, Panel, StaffBadge, Tag, type StaffBadgeInfo } from '../../ui';
import { hubCards, type HubCard, type HubCardId } from './hubCards';
import styles from './HubScreen.module.css';

interface Props {
  day: number;
  perfect: number;
  total: number;
  campaignStat: string;
  survivalStat: string | null;
  streak?: number;
  challenges?: number;
  signedIn: boolean;
  badge: StaffBadgeInfo;
  onOpenDaily: () => void;
  onOpenCampaign: () => void;
  onOpenSurvival: () => void;
  onOpenMatch: () => void;
  onOpenAccount: () => void;
  onHowItWorks: () => void;
}

function Card({ card, onOpen }: { card: HubCard; onOpen: (() => void) | null }) {
  const soon = card.status === 'soon';
  return (
    <Panel tab={soon ? <>{card.title} · SOON</> : card.title} className={styles.card}>
      <p className={styles.blurb}>{card.blurb}</p>
      {card.stat && <div className={styles.stat}>{card.stat}</div>}
      <div className={styles.cta}>
        {soon || !onOpen
          ? <Button variant="muted" disabled>COMING SOON</Button>
          : <Button variant={card.status === 'signin' ? 'accent' : 'primary'} onClick={onOpen}>{card.cta}</Button>}
      </div>
    </Panel>
  );
}

/* The front door: one card per way to play. What each card shows comes from hubCards. */
export function HubScreen({ day, perfect, total, campaignStat, survivalStat, streak, challenges, signedIn, badge, onOpenDaily, onOpenCampaign, onOpenSurvival, onOpenMatch, onOpenAccount, onHowItWorks }: Props) {
  const openers: Record<HubCardId, (() => void) | null> = {
    daily: onOpenDaily,
    campaign: signedIn ? onOpenCampaign : onOpenAccount,
    survival: onOpenSurvival,
    match: signedIn ? onOpenMatch : onOpenAccount,
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.masthead}>
          <div className={styles.brand}>
            <span className={styles.kicker}>STRUCTURAL DEMOLITION</span>
            <Logo size="lg" />
          </div>
          <div className={styles.blurbWrap}>
            <span className={styles.division}>FELINE DIVISION · EST. 2019</span>
            <span className={styles.tagline}>Pick a job. Hire the <b>fewest cats</b> that flatten it.</span>
          </div>
          <StaffBadge {...badge} layout="stack" onClick={onOpenAccount} />
        </header>

        <Tag>JOBS</Tag>
        <div className={styles.grid}>
          {hubCards({ signedIn, day, perfect, total, campaignStat, survivalStat, streak, challenges }).map(c => <Card key={c.id} card={c} onOpen={openers[c.id]} />)}
        </div>

        <div className={styles.actions}>
          <Button variant="accent" size="xl" onClick={onHowItWorks}>HOW IT WORKS</Button>
        </div>
      </div>
    </div>
  );
}
