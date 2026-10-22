import styles from './SkinSwitch.module.css';

/** The floating pill that takes the hidden CATASTROPHE INC. look back to Stargazer. */
export function SkinSwitch({ onSwitch }: { onSwitch: () => void }) {
  return <button className={styles.pill} onClick={onSwitch}>✦ Back to Stargazer</button>;
}
