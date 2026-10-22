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
  const [named, setNamed] = useState<{ id: string; username: string; avatar: string | null } | null>(null);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => { if (live) { setSession(data.session); setReady(true); } });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setReady(true); });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;
  const username = named && named.id === userId ? named.username : '';
  const avatar = named && named.id === userId ? named.avatar : null;
  useEffect(() => {
    if (!user) return;
    let live = true;
    ensureProfile(user)
      .then(() => getProfile(user.id))
      .then(res => { if (live && res.ok) setNamed({ id: user.id, username: (res.data && res.data.username) || '', avatar: (res.data && res.data.avatar) || null }); });
    return () => { live = false; };
  }, [user]);

  const value = useMemo<AuthState>(() => ({
    ready,
    userId,
    email: user?.email ?? null,
    username,
    handle: displayName({ username }),
    avatar,
    setHandle: (username: string) => { if (userId) setNamed(n => ({ id: userId, username, avatar: n && n.id === userId ? n.avatar : null })); },
    setAvatar: (avatar: string | null) => { if (userId) setNamed(n => ({ id: userId, username: n && n.id === userId ? n.username : '', avatar })); },
  }), [ready, user, userId, username, avatar]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
