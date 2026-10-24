import { placeText } from '../../../domain/ranking';
import type { Place } from '../../../game/hooks/useBoard';
import styles from './PlaceLink.module.css';

/** "#12 of 340 tonight · Board ›": the player's place on a board, and the way to open it. A line, not a panel. */
export function PlaceLink({ place, label, onOpen }: { place: Place; label: string; onOpen: () => void }) {
  return (
    <button className={styles.link} onClick={onOpen} aria-label={`${placeText(place.entry, place.total)} ${label}. Open the board`}>
      <b>{placeText(place.entry, place.total)}</b> {label}<span className={styles.go}>Board ›</span>
    </button>
  );
}
