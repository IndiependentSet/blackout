import type { SkyNames } from '../../../../game/hooks/useSkyNames';
import { Button } from '../../kit/Button';
import { Figure } from '../../kit/Figure';
import { Scroll } from '../../kit/Layout';
import { Note, Page, TopBar } from '../../kit/Page';
import { useWide } from '../../kit/useWide';
import { TabBar, type Tab } from '../../kit/TabBar';
import { plural, whenNamed } from '../../copy';
import styles from './Atlas.module.css';

interface Props {
  today: number;
  signedIn: boolean;
  atlas: SkyNames;
  onTab: (tab: Tab) => void;
  onSignIn: () => void;
  onTonight: () => void;
}

/* Atlas (1e): every figure the player has named, newest first. */
export function AtlasScreen({ today, signedIn, atlas, onTab, onSignIn, onTonight }: Props) {
  const wide = useWide();
  const { names } = atlas;
  return (
    <Page tone="night" className={wide ? styles.pageWide : styles.page}>
      <TopBar title="Atlas" onBack={wide ? () => onTab('tonight') : undefined} backLabel="Tonight"
        right={signedIn ? `${plural(names.length, 'named', 'named')}` : null} />
      {!signedIn && (
        <div className={styles.empty}>
          <Note>Chart all seven skies in a night and the figure is yours to name. Sign in to keep your atlas.</Note>
          <Button block onClick={onSignIn}>Sign in</Button>
        </div>
      )}
      {signedIn && atlas.error && <Note tone="error">Couldn’t open your atlas: {atlas.error}</Note>}
      {signedIn && !atlas.loading && !atlas.error && names.length === 0 && (
        <div className={styles.empty}>
          <Note>Your atlas is empty. Chart all seven of tonight’s skies and name the figure you find.</Note>
          <Button block onClick={onTonight}>Go to tonight</Button>
        </div>
      )}
      <Scroll label="Your constellations"><div className={wide ? styles.gridWide : styles.grid}>
        {names.map(n => (
          <article key={n.day} className={styles.card}>
            <Figure figure={n.figure} mode="atlas" className={styles.thumb} />
            <div className={styles.cardText}><b>{n.name}</b><span>{whenNamed(n.day, today)}</span></div>
          </article>
        ))}
      </div></Scroll>
      {!wide && <TabBar active="atlas" onOpen={onTab} />}
    </Page>
  );
}
