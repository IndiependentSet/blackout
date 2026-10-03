import { Button, Field, Message, Panel } from '../../ui';
import { isEmail } from './email';
import type { OAuthProvider } from '../../services/repositories/auth';
import styles from './StaffOffice.module.css';


interface FormProps {
  email: string;
  sending: boolean;
  error: string;
  onEmail: (v: string) => void;
  onSend: () => void;
  onOAuth: (p: OAuthProvider) => void;
}

/** Punch in with a magic link, or Google. */
export function SignInForm({ email, sending, error, onEmail, onSend, onOAuth }: FormProps) {
  const valid = isEmail(email);
  return (
    <Panel tab="STAFF SIGN-IN" className={styles.signin}>
      <div className={styles.headline}>PUNCH IN WITH YOUR WORK EMAIL. <span className={styles.accent}>NO PASSWORD.</span></div>
      <div className={styles.copy}>We&apos;ll send a one-tap punch-in link. Use it to keep your invoice history and see how you rank against the rest of the crew.</div>
      <Field type="email" value={email} onChange={e => onEmail(e.target.value)} placeholder="you@yourcompany.com" style={{ minHeight: 50, padding: '0 16px', fontSize: 15 }} />
      {!!error && <Message tone="error">{error}</Message>}
      <Button size="lg" variant={valid ? 'primary' : 'muted'} onClick={onSend} disabled={sending || !valid}
        style={{ opacity: sending ? 0.7 : valid ? 1 : 0.6 }}>{sending ? 'SENDING…' : 'SEND PUNCH-IN LINK'}</Button>
      <div className={styles.divider}><div className={styles.rule} /><div className={styles.or}>OR</div><div className={styles.rule} /></div>
      <Button variant="paper" onClick={() => onOAuth('google')} style={{ minHeight: 50, fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 14, letterSpacing: '.03em' }}>CONTINUE WITH GOOGLE</Button>
      <Button variant="muted" disabled className={styles.soon} style={{ minHeight: 50, fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 14, letterSpacing: '.03em' }}>GITHUB — COMING SOON</Button>
    </Panel>
  );
}

/** "Check your inbox". */
export function LinkSent({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <Panel tab="CHECK YOUR INBOX" className={styles.signin}>
      <div className={`${styles.headline} ${styles.sent}`}>A PUNCH-IN LINK IS ON ITS WAY TO <span className={styles.accent}>{email}</span></div>
      <div className={styles.copy}>Tap the link in that email on this device and you&apos;re clocked in. Didn&apos;t get it? Check spam, or the mailroom cat probably sat on it.</div>
      <a href="#" className={styles.again} onClick={e => { e.preventDefault(); onBack(); }}>&#8249; use a different email</a>
    </Panel>
  );
}
