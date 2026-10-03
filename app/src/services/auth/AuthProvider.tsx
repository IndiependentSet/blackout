import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { displayName } from '../../domain/profile';
import { ensureProfile, getProfile } from '../repositories/profiles';
import { supabase } from '../supabase/client';
import { AuthContext, type AuthState } from './authContext';

/* Sign-in state is derived purely from Supabase's own session — never from
   app-owned storage — and there is exactly one subscription to it. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  /* tagged with the user it belongs to, so a stale handle can never show for
     someone else without any reset-in-effect */
  const [named, setNamed] = useState<{ id: string; handle: string } | null>(null);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => { if (live) { setSession(data.session); setReady(true); } });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setReady(true); });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!user) return;
    let live = true;
    ensureProfile(user)
      .then(() => getProfile(user.id))
      .then(res => { if (live && res.ok) setNamed({ id: user.id, handle: displayName(res.data) }); });
    return () => { live = false; };
  }, [user]);

  const value = useMemo<AuthState>(() => ({
    ready,
    userId,
    email: user?.email ?? null,
    handle: named && named.id === userId ? named.handle : '',
    setHandle: (username: string) => { if (userId) setNamed({ id: userId, handle: displayName({ username }) }); },
  }), [ready, user, userId, named]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
