import { useState } from 'react';
import { isEmail } from '../../../../game/account/email';
import { useMagicLink } from '../../../../game/account/useMagicLink';
import { Button } from '../../kit/Button';
import { Eyebrow, Note } from '../../kit/Page';
import styles from './Observatory.module.css';

/* Signing in: a one-tap link by email, or Google. Signing in keeps your atlas, streak and duels. */
export function SignIn() {
  const link = useMagicLink();
  const [email, setEmail] = useState('');
  const valid = isEmail(email);

  if (link.phase === 'sent') {
    return (
      <section className={styles.card}>
        <Eyebrow>Check your inbox</Eyebrow>
        <h2 className={styles.cardTitle}>A sign-in link is on its way to {email}.</h2>
        <p className={styles.copy}>Open it on this device and you’re in. Nothing yet? Look in spam, or try again.</p>
        <Button kind="ghost" size="md" onClick={link.reset}>Use a different email</Button>
      </section>
    );
  }
  return (
    <section className={styles.card}>
      <Eyebrow>Join the night watch</Eyebrow>
      <h2 className={styles.cardTitle}>Sign in to keep your atlas, your streak and your duels.</h2>
      <p className={styles.copy}>No password: we email you a one-tap link.</p>
      <label className={styles.label} htmlFor="sg-email">Email</label>
      <input id="sg-email" className={styles.input} type="email" value={email} placeholder="you@example.com"
        onChange={e => { setEmail(e.target.value); link.clearError(); }}
        onKeyDown={e => { if (e.key === 'Enter' && valid) link.send(email.trim()); }} />
      {link.error && <Note tone="error">{link.error}</Note>}
      <Button block disabled={!valid || link.phase === 'sending'} onClick={() => link.send(email.trim())}>
        {link.phase === 'sending' ? 'Sending…' : 'Email me a link'}
      </Button>
      <Button block kind="outline" size="md" onClick={() => link.oauth('google')}>Continue with Google</Button>
    </section>
  );
}
