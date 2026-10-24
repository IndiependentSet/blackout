import { useState } from 'react';
import { figureOf } from '../../../../domain/nights';
import type { Level, SiteResult } from '../../../../domain/types';
import type { Place } from '../../../../game/hooks/useBoard';
import type { SkyNames } from '../../../../game/hooks/useSkyNames';
import { useClipboard } from '../../../../hooks/useClipboard';
import { Button } from '../../kit/Button';
import { Figure } from '../../kit/Figure';
import { ShareIcon } from '../../kit/icons';
import { Fit } from '../../kit/Layout';
import { DeskPage } from '../../kit/DeskPage';
import { Eyebrow, Note, TopBar } from '../../kit/Page';
import { PlaceLink } from '../../kit/PlaceLink';
import { nameIdeas, nightShareText } from '../../copy';
import styles from './NightCharted.module.css';

interface Props {
  day: number;
  results: (SiteResult | null)[];
  /** the night's last sky: the figure that is named */
  figure: Level | null;
  streak: number;
  signedIn: boolean;
  atlas: SkyNames;
  onSaved: () => void;
  onSignIn: () => void;
  /** where the player stands on tonight's board; null when not on it */
  place?: Place | null;
  onBoard?: () => void;
  onBack: () => void;
}

const MAX_NAME = 40;

/* Night charted (1d): all seven skies are charted, so the night's figure is the player's to name and keep. */
export function NightChartedScreen({ day, results, figure, streak, signedIn, atlas, place, onBoard, onSaved, onSignIn, onBack }: Props) {
  const ideas = nameIdeas(day);
  const named = atlas.names.find(n => n.day === day);
  const [name, setName] = useState(named?.name ?? ideas[0]);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useClipboard();
  const atPar = results.filter(r => r && r.status === 'perfect').length;
  const perfect = atPar === results.length;
  const lit = results.reduce((n, r) => n + (r ? r.used : 0), 0);
  const clean = name.trim();

  const save = async () => {
    if (!figure || !clean) return;
    setError(null);
    const e = await atlas.name(day, clean, figureOf(figure));
    if (e) setError(e); else onSaved();
  };

  return (
    <DeskPage active="tonight" tone="result" className={styles.page}>
      <TopBar onBack={onBack} backLabel="Tonight" />
      <Eyebrow>Night No. {day} · {perfect ? 'Perfect night' : `${results.length} of ${results.length} charted`}</Eyebrow>
      <h1 className={styles.title}>{perfect ? 'You found a new constellation.' : 'The whole night is charted.'}</h1>
      <Fit max={290}>{figure && <Figure figure={figure} mode="lit" lit={figure.sol} />}</Fit>

      <div className={styles.naming}>
        <label className={styles.label} htmlFor="sky-name">Name it</label>
        <input id="sky-name" className={styles.input} value={name} maxLength={MAX_NAME} onChange={e => setName(e.target.value)} />
        <div className={styles.ideas}>
          {ideas.filter(i => i !== name).map(i => <Button key={i} kind="soft" size="sm" onClick={() => setName(i)}>{i}</Button>)}
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}><b>{atPar} / {results.length}</b><span>at par</span></div>
        <div className={styles.stat}><b>{lit}</b><span>stars lit</span></div>
        <div className={styles.stat}><b>{streak}</b><span>night streak</span></div>
      </div>
      {place && onBoard && <PlaceLink place={place} label="tonight" onOpen={onBoard} />}
      {error && <Note tone="error">{error}</Note>}
      {named && !error && <Note>In your atlas as “{named.name}”. Save again to rename it.</Note>}

      <div className={styles.actions}>
        {signedIn
          ? <Button block disabled={!clean || atlas.saving || !figure} onClick={save}>{atlas.saving ? 'Adding…' : named ? 'Rename in my atlas' : 'Add to my atlas'}</Button>
          : <Button block onClick={onSignIn}>Sign in to keep it</Button>}
        <Button block kind="ghost" size="md" onClick={() => copy(nightShareText(day, results))}>
          <ShareIcon />{copied ? 'Copied — paste it anywhere' : 'Share my sky'}
        </Button>
      </div>
    </DeskPage>
  );
}
