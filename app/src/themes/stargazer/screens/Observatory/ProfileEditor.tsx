import { useHandleEditor } from '../../../../game/account/useHandleEditor';
import type { AuthState } from '../../../../services/auth/authContext';
import { Button } from '../../kit/Button';
import { Scroll } from '../../kit/Layout';
import { Eyebrow } from '../../kit/Page';
import { AvatarPicker } from './AvatarPicker';
import styles from './Observatory.module.css';

/* Observatory sub-page "Edit profile": the handle, then the picture beside it. Saving a handle, or Cancel, goes back. */
export function ProfileEditor({ userId, auth, onDone }: { userId: string; auth: AuthState; onDone: () => void }) {
  const handle = useHandleEditor(userId, auth.username, name => { auth.setHandle(name); onDone(); });
  return (
    <Scroll label="Edit profile">
      <section className={styles.card}>
        <Eyebrow tone="soft">Your handle</Eyebrow>
        <div className={styles.edit}>
          <input className={styles.input} aria-label="Your handle" value={handle.editing ? handle.draft : auth.username} maxLength={16}
            onChange={e => { if (!handle.editing) handle.start(); handle.setDraft(e.target.value); }} />
          <Button size="sm" disabled={!handle.editing || handle.saving} onClick={handle.save}>{handle.saving ? '…' : 'Save'}</Button>
          <Button size="sm" kind="ghost" onClick={() => { handle.cancel(); onDone(); }}>Cancel</Button>
        </div>
        {handle.error && <span className={styles.error} role="alert">{handle.error}</span>}
      </section>
      <Eyebrow tone="soft">Your picture</Eyebrow>
      <AvatarPicker userId={userId} auth={auth} />
    </Scroll>
  );
}
