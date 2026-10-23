import { CHAPTERS, type CampaignClears } from '../../../../domain/campaign';
import { CAMPAIGN_LEVELS } from '../../../../domain/types';
import { Scroll } from '../../kit/Layout';
import { TopBar } from '../../kit/Page';
import styles from './Voyage.module.css';
import { ChapterCard, NextWorld, Stop, WorldsRow } from './VoyageView';
import { WAVE } from './wave';

interface Props {
  chapter: number;
  /** stops charted in this world, and levels charted in all */
  done: number;
  cleared: number;
  reach: number;
  clears?: CampaignClears;
  /** the parts that move, each 0 to 1 and left alone (undefined) once they have settled */
  fill?: number;
  unlock?: number;
  burst?: number;
  pop?: number;
  ring?: number;
  /** the current stop's glow */
  glow?: number;
  /** show the end of the path, where a finished world's last stop is */
  end?: boolean;
}

/* The real Voyage screen, drawn from the same parts, for the beats of the flight that show it. */
export function FlightScreen({ chapter, done, cleared, reach, clears, fill, unlock, burst, pop, ring, glow, end }: Props) {
  const ch = CHAPTERS[chapter];
  const size = ch.to - ch.from + 1;
  return (
    <div className={styles.flightScreen} inert>
      <TopBar title="Voyage" onBack={() => {}} backLabel="Tonight" right={`${cleared} / ${CAMPAIGN_LEVELS}`} />
      <WorldsRow current={ch.index} reach={reach} ring={ring} />
      <ChapterCard chapter={ch} cleared={done} fill={fill} pop={pop} />
      <Scroll label="Levels" fade className={styles.flightPath}><div className={styles.path} style={end ? { marginTop: 'auto' } : undefined}>
        {Array.from({ length: size }, (_, i) => {
          const n = ch.from + i;
          const over = clears?.get(n);
          return <Stop key={n} local={i + 1} state={i < done ? 'done' : i === done ? 'current' : 'locked'} offset={WAVE[i % WAVE.length]}
            over={over ? over.run.used - over.run.par : undefined} burst={i === size - 1 ? burst : undefined} glow={glow} />;
        })}
      </div></Scroll>
      <NextWorld next={CHAPTERS[ch.index + 1]} locked={ch.index + 1 > reach} unlock={unlock} />
    </div>
  );
}
