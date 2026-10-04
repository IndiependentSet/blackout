import { useCallback, useState } from 'react';
import { sendMagicLink, signInWithOAuth, type OAuthProvider } from '../../services/repositories/auth';

type Phase = 'idle' | 'sending' | 'sent';

/** The passwordless sign-in flow: send a link (or go via OAuth) and report where it got to. */
export function useMagicLink() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');

  const send = useCallback(async (email: string) => {
    setPhase('sending'); setError('');
    const r = await sendMagicLink(email);
    if (r.ok) setPhase('sent'); else { setPhase('idle'); setError(r.error); }
  }, []);

  const oauth = useCallback(async (provider: OAuthProvider) => {
    setError('');
    const r = await signInWithOAuth(provider);
    if (!r.ok) setError(r.error);
  }, []);

  const reset = useCallback(() => { setPhase('idle'); setError(''); }, []);
  const clearError = useCallback(() => setError(''), []);

  return { phase, error, send, oauth, reset, clearError };
}
