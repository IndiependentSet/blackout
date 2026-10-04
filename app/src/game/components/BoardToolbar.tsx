import { cx } from '../../ui';
import styles from './BoardToolbar.module.css';

interface Props {
  expanded: boolean;
  dim: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  onToggleExpand: () => void;
  onToggleDim: () => void;
}

/* The camera's own controls, floated over the board. DIM turns the house
   lights down so the puzzle is all that is left standing. */
export function BoardToolbar({ expanded, dim, onZoomOut, onZoomIn, onFit, onToggleExpand, onToggleDim }: Props) {
  const tools = [
    { k: 'out', text: '–', label: 'zoom out', go: onZoomOut },
    { k: 'in', text: '+', label: 'zoom in', go: onZoomIn },
    { k: 'fit', text: 'FIT', label: 'frame the whole site', go: onFit },
    { k: 'exp', text: expanded ? '↘↖' : '↖↘', label: expanded ? 'shrink the board' : 'expand the board', go: onToggleExpand },
    { k: 'dim', text: 'DIM', label: dim ? 'turn the house lights back up' : 'dim the house', go: onToggleDim, on: dim },
  ];
  return (
    <div className={styles.bar}>
      {tools.map(t => (
        <button key={t.k} type="button" className={cx(styles.tool, t.on && styles.on)} onClick={t.go} aria-label={t.label} title={t.label}>
          {t.text}
        </button>
      ))}
    </div>
  );
}
