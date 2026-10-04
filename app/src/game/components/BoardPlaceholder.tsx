import { CAM_A } from '../constants';
import styles from './Board.module.css';

/** The empty frame shown while the first level is still being generated, so the layout doesn't jump. */
export function BoardPlaceholder() {
  return <div className={styles.frame} style={{ aspectRatio: CAM_A }} aria-busy="true" />;
}
