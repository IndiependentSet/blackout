import { createContext, useContext } from 'react';

/** What the rest of the app knows about the signed-in staff member. */
export interface AuthState {
  /** false until Supabase has reported the initial session */
  ready: boolean;
  userId: string | null;
  email: string | null;
  /** the raw username, or '' while loading / signed out */
  username: string;
  /** "@username", or '' while loading / signed out */
  handle: string;
  /** the stored avatar string (see domain/avatar.ts), or null for the initial */
  avatar: string | null;
  /** an in-place rename (the Staff ID card) so the badge never shows a stale name */
  setHandle: (username: string) => void;
  /** an in-place picture change, so every screen shows the new one at once */
  setAvatar: (avatar: string | null) => void;
}

export const SIGNED_OUT: AuthState = { ready: false, userId: null, email: null, username: '', handle: '', avatar: null, setHandle: () => {}, setAvatar: () => {} };
export const AuthContext = createContext<AuthState>(SIGNED_OUT);

export const useAuth = () => useContext(AuthContext);
