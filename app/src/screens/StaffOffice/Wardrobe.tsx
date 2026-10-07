import { useState } from 'react';
import { accessoryFor, hasArt } from '../../assets/cosmetics';
import { COSMETIC_SLOTS, EMPTY_LOADOUT, SLOT_LABEL, cosmeticsInSlot, isOwned } from '../../domain/cosmetics';
import type { Cosmetic } from '../../domain/types';
import { useLoadout } from '../../game/loadout/loadoutContext';
import { Button, Message, Panel, Tag, cx } from '../../ui';
import styles from './Wardrobe.module.css';

/* A thumbnail only when the accessory has been drawn; otherwise a plain "ART COMING" box. */
function Swatch({ item }: { item: Cosmetic }) {
  const art = hasArt(item.id) ? accessoryFor({ ...EMPTY_LOADOUT, [item.slot]: item.id }, 'whiskers') : undefined;
  return (
    <div className={styles.swatch} aria-hidden="true">
      {art ? <img className={styles.art} src={art.wakeA[0]} alt="" /> : <>ART<br />COMING</>}
    </div>
  );
}

/** What the cats wear: unlocked accessories can be put on or taken off; the rest say how to earn them. */
export function Wardrobe() {
  const { loadout, owned, loading, error, equip } = useLoadout();
  const [busy, setBusy] = useState(false);

  const toggle = async (item: Cosmetic) => {
    setBusy(true);
    try { await equip(item.slot, loadout[item.slot] === item.id ? null : item.id); } finally { setBusy(false); }
  };

  return (
    <Panel tab="WARDROBE" tone="orchid">
      {loading && <Message tone="muted">OPENING THE WARDROBE&hellip;</Message>}
      {error && <Message tone="error">WARDROBE UNAVAILABLE &mdash; {error}</Message>}
      <div className={styles.slots}>
        {COSMETIC_SLOTS.map(slot => (
          <div key={slot} className={styles.slot}>
            <div className={styles.slotName}>{SLOT_LABEL[slot]}</div>
            {cosmeticsInSlot(slot).map(item => {
              const mine = isOwned(item.id, owned);
              const worn = loadout[slot] === item.id;
              return (
                <div key={item.id} className={cx(styles.item, !mine && styles.locked)}>
                  <Swatch item={item} />
                  <div className={styles.info}>
                    <div className={styles.label}>{item.label}</div>
                    <div className={styles.hint}>{mine ? (worn ? 'WORN ON ALL YOUR CATS' : 'UNLOCKED') : item.unlockLabel}</div>
                  </div>
                  {worn && <Tag size="sm">WORN</Tag>}
                  <Button variant={worn ? 'paper' : 'primary'} size="mini" disabled={!mine || busy} onClick={() => toggle(item)}>
                    {!mine ? 'LOCKED' : worn ? 'TAKE OFF' : 'WEAR'}
                  </Button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Panel>
  );
}
