import { useRef } from 'react';
import { AVATAR_ICONS, iconAvatar, parseAvatar } from '../../../../domain/avatar';
import { initial } from '../../../../domain/profile';
import { useAvatarEditor } from '../../../../game/account/useAvatarEditor';
import type { AuthState } from '../../../../services/auth/authContext';
import { AvatarArt } from '../../kit/AvatarArt';
import { Button } from '../../kit/Button';
import { Scroll } from '../../kit/Layout';
import { Avatar, Eyebrow } from '../../kit/Page';
import { cx } from '../../kit/cx';
import styles from './Observatory.module.css';

/* Observatory sub-page: choose the picture beside your handle: a drawn icon, a photo of your own, or your initial. */
export function AvatarPicker({ userId, auth }: { userId: string; auth: AuthState }) {
  const editor = useAvatarEditor(userId, auth.setAvatar);
  const file = useRef<HTMLInputElement>(null);
  const current = parseAvatar(auth.avatar);
  return (
    <Scroll label="Your picture">
      <div className={styles.pickerNow}>
        <Avatar letter={initial({ username: auth.username })} avatar={auth.avatar} size={72} />
        <div className={styles.pickerActions}>
          <input ref={file} type="file" accept="image/*" hidden aria-label="Choose a photo"
            onChange={e => { const f = e.target.files?.[0]; if (f) editor.saveFile(f); e.target.value = ''; }} />
          <Button size="sm" disabled={editor.saving} onClick={() => file.current?.click()}>{editor.saving ? '…' : 'Use my own photo'}</Button>
          <Button size="sm" kind="ghost" disabled={editor.saving || !auth.avatar} onClick={() => editor.save(null)}>Use my initial</Button>
        </div>
      </div>
      {editor.error && <span className={styles.error} role="alert">{editor.error}</span>}
      <Eyebrow tone="soft">Or pick one from the sky</Eyebrow>
      <div className={styles.iconGrid}>
        {AVATAR_ICONS.map(i => (
          <button key={i.id} className={cx(styles.iconPick, current?.kind === 'icon' && current.id === i.id && styles.iconPicked)}
            aria-label={i.label} aria-pressed={current?.kind === 'icon' && current.id === i.id} disabled={editor.saving}
            onClick={() => editor.save(iconAvatar(i.id))}>
            <span className={styles.iconArt}><AvatarArt id={i.id} /></span>
          </button>
        ))}
      </div>
    </Scroll>
  );
}
