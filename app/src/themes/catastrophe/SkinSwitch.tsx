import styles from './SkinSwitch.module.css';

/** The floating pill on the classic board that swaps to the trial Stargazer look. */
export function SkinSwitch({ onSwitch }: { onSwitch: () => void }) {
  return <button className={styles.pill} onClick={onSwitch}>✦ Try Stargazer</button>;
}
