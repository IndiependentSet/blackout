import { ADMIN_PAGES } from '../../domain/adminPages';
import { Button, Panel } from '../../ui';
import styles from './StaffOffice.module.css';

/* The admin pages, listed on the staff office for admins only. Each one is a full page of its own (its own entry
   in the build), so the links are plain navigations. The list is only shown here; every write is checked in Postgres.
   The panel is parchment, so its buttons are the light variant: `glass` is cream text for the dark pages and vanishes here. */
export function AdminTools({ admin }: { admin: boolean | null }) {
  if (!admin) return null;
  return (
    <Panel tab="ADMIN TOOLS">
      <div className={styles.adminList}>
        {ADMIN_PAGES.map(p => (
          <Button key={p.id} variant="secondary" size="nav" onClick={() => window.location.assign(p.href)} title={p.hint}>
            {p.label} ›
          </Button>
        ))}
      </div>
    </Panel>
  );
}
