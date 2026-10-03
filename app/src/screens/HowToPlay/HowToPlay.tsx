import { Button, Tag, cx } from '../../ui';
import { slides as buildSlides } from './slides';
import { useSlideshow } from './useSlideshow';
import styles from './HowToPlay.module.css';

interface Props {
  sites: readonly string[];
  /** leave without finishing */
  onClose: () => void;
  /** finished the last slide: on to the game */
  onStart: () => void;
}

/* ---- CATASTROPHE INC. orientation: the "how it works" slideshow ----
   Shown over the work order. Every illustration is a tiny live board drawn with
   the same stickers, pads and two-tone paths as the real game, so what a new
   hire learns here is exactly what they will see on site. Nothing in here
   touches the engine; the training site is a hand-made graph whose cheapest
   crew ({hub, D}) is unique, same as every real level. */
export default function HowToPlay({ sites, onClose, onStart }: Props) {
  const deck = buildSlides(sites);
  const { index, dir, last, go, next, swipe } = useSlideshow({ count: deck.length, onNext: onStart, onClose });
  const slide = deck[index];

  return (
    <div role="dialog" aria-modal="true" aria-label="How CATASTROPHE INC. works" className={styles.scrim}>
      <div className={styles.card} {...swipe}>
        <div className={styles.top}>
          <Tag size="sm" style={{ fontSize: 13, padding: '3px 12px', borderRadius: 9, boxShadow: 'var(--lift-sm)' }}>ORIENTATION · {index + 1}/{deck.length}</Tag>
          <button type="button" className={styles.skip} onClick={onClose} aria-label="skip the orientation">SKIP ✕</button>
        </div>

        <div key={index} className={cx(styles.slide, dir > 0 ? styles.fromRight : styles.fromLeft)}>
          <div>
            <div className={styles.kicker}>{slide.kicker}</div>
            <div className={styles.title}>{slide.title}</div>
          </div>
          <div className={styles.body}>{slide.body}</div>
          {slide.demo}
        </div>

        <div className={styles.nav}>
          <Button variant="secondary" size="lg" onClick={() => go(index - 1)} disabled={index === 0} aria-label="previous slide"
            style={{ minHeight: 48, padding: '0 12px', borderWidth: 4, fontSize: 18, boxShadow: '0 5px 0 var(--ink)', opacity: index === 0 ? 0.35 : 1 }}>←</Button>
          <div className={styles.dots}>
            {deck.map((_, n) => (
              <button key={n} type="button" onClick={() => go(n)} aria-label={`slide ${n + 1}`} aria-current={n === index}
                className={cx(styles.dot, n < index && styles.seen, n === index && styles.here)} />
            ))}
          </div>
          <Button variant={index === last ? 'mint' : 'primary'} size="lg" onClick={next}
            style={{ minHeight: 48, padding: '0 14px', borderWidth: 4, fontSize: 18, boxShadow: '0 5px 0 var(--ink)', whiteSpace: 'nowrap' }}>{index === last ? 'CLOCK IN' : 'NEXT →'}</Button>
        </div>
      </div>
    </div>
  );
}
