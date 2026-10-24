import type { GameSession } from '../../../../game/useGameSession';
import { SkyPlay } from '../../play/SkyPlay';
import { skyEntries } from '../../play/sky';
import { tonightState } from '../Tonight/tonight';

interface Props {
  session: GameSession;
  userId: string | null;
  onBack: () => void;
  /** all seven are charted: on to the night's result */
  onNightDone: () => void;
}

/* Tonight's seven skies on the board (1c, 1n). "Chart this sky" moves on to the next one still dark; once all
   seven are charted it opens the night's result instead. */
export function DailySky({ session, userId, onBack, onNightDone }: Props) {
  const { state, levels, set, dispatch } = session;
  const t = tonightState(state.results, state.idx);
  const goTo = (i: number) => { if (i >= 0 && i < set.count && levels[i]) dispatch({ type: 'go', idx: i }); };
  /* the next sky still dark after this one, wrapping round; failing that, simply the next */
  const nextDark = () => {
    for (let k = 1; k <= set.count; k++) { const i = (state.idx + k) % set.count; if (!state.results[i]) return i; }
    return state.idx + 1;
  };
  return (
    <SkyPlay session={session} userId={userId} active="tonight" title={`Sky ${state.idx + 1} of ${set.count}`} onBack={onBack} backLabel="Tonight"
      skies={{ entries: skyEntries(state.results, state.idx), heading: 'Tonight', canOpen: i => !!levels[i], onOpen: goTo }}
      primary={t.done ? { label: 'See tonight’s figure', onClick: onNightDone, disabled: false }
        : levels[nextDark()] ? { label: 'Chart this sky', onClick: () => goTo(nextDark()) }
        : { label: 'The next sky is still rising…', disabled: true }} />
  );
}
