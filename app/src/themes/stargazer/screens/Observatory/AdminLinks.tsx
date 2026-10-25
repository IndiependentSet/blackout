import { ADMIN_GROUPS, ADMIN_PAGES } from '../../../../domain/adminPages';
import { Scroll } from '../../kit/Layout';
import { ListCard, ListRow } from '../../kit/ListCard';
import { Eyebrow } from '../../kit/Page';
import styles from './Observatory.module.css';

/* Me sub-page "Admin": every admin page, in the nav's two groups, one tappable row each. */
export function AdminLinks() {
  return (
    <Scroll label="Admin pages">
      {ADMIN_GROUPS.map(g => (
        <section key={g.id} className={styles.block} aria-label={g.label}>
          <Eyebrow tone="soft">{g.label}</Eyebrow>
          <ListCard>
            {ADMIN_PAGES.filter(p => p.group === g.id).map(p => (
              <ListRow key={p.id} title={p.label} description={p.hint} onClick={() => window.location.assign(p.href)} />
            ))}
          </ListCard>
        </section>
      ))}
    </Scroll>
  );
}
