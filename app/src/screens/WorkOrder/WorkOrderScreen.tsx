import { Button, Logo, Panel, StaffBadge, type StaffBadgeInfo } from '../../ui';
import { useWindowKey } from '../../hooks/useWindowKey';
import { BRIEF } from './copy';
import { DeploymentDiagram } from './DeploymentDiagram';
import styles from './WorkOrderScreen.module.css';

interface Props {
  day: number;
  /** the site the player will be dropped into (1-based) */
  siteNo: number;
  badge: StaffBadgeInfo;
  /** false while the orientation slideshow is over this screen */
  keysEnabled: boolean;
  onClockIn: () => void;
  onHowItWorks: () => void;
  onOpenAccount: () => void;
}

/* The work order: the brief, shown before play and again via RE-READ WORK ORDER. */
export function WorkOrderScreen({ day, siteNo, badge, keysEnabled, onClockIn, onHowItWorks, onOpenAccount }: Props) {
  useWindowKey(e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClockIn(); }
  }, keysEnabled);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.masthead}>
          <div className={styles.brand}>
            <span className={styles.kicker}>STRUCTURAL DEMOLITION</span>
            <Logo size="lg" />
          </div>
          <div className={styles.blurb}>
            <span className={styles.division}>FELINE DIVISION · EST. 2019</span>
            <span className={styles.tagline}>We don&apos;t own a wrecking ball. We own <b>cats</b>.</span>
          </div>
          <StaffBadge {...badge} layout="stack" onClick={onOpenAccount} />
        </header>

        <div className={styles.columns}>
          <div className={styles.order}>
            <Panel tab={`WORK ORDER #${day}`} className={styles.card}>
              <div className={styles.headline}>THE CLIENT WANTS THE INSIDE OF THIS HOUSE <span className={styles.accent}>GONE BY FRIDAY.</span></div>
              <div className={styles.lead}>
                Every fixture on site sits on a path between two <b>deployment pads</b>. Drop a cat on either end of a path and that fixture is scrap. Cats bill by the head, so hire the fewest that still flattens the lot.
              </div>
              <div className={styles.steps}>
                {BRIEF.map(s => (
                  <div key={s.n} className={styles.step}>
                    <span className={styles.stepNo}>{s.n}</span>
                    <div>
                      <div className={styles.stepHead}>{s.head}</div>
                      <div className={styles.stepBody}>{s.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.footer}>
                <span className={styles.week}>7 SITES · ONE WORKING WEEK</span>
                <span className={styles.goal}>Come in on budget and the invoice reads PURR-FECT.</span>
              </div>
            </Panel>
          </div>

          <div className={styles.side}>
            <div className={styles.floor}><DeploymentDiagram /></div>
            <div className={styles.disclaimer}>CATASTROPHE INC. is not liable for curtains, ankles, or emotional damage. Cats are non-refundable and cannot be reasoned with.</div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="accent" size="xl" onClick={onHowItWorks}>HOW IT WORKS</Button>
          <Button variant="primary" size="xl" onClick={onClockIn} style={{ padding: '0 34px', fontSize: 26 }}>CLOCK IN</Button>
          <span className={styles.hint}>OR PRESS ENTER · SITE {siteNo} IS WAITING</span>
        </div>
      </div>
    </div>
  );
}
