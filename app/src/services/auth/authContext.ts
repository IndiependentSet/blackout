import { createContext, useContext } from 'react';

/** What the rest of the app knows about the signed-in staff member. */
export interface AuthState {
  /** false until Supabase has reported the initial session */
  ready: boolean;
  userId: string | null;
  email: string | null;
  /** "@handle", or '' while loading / signed out */
  handle: string;
  /** an in-place rename (the Staff ID card) so the badge never shows a stale name */
  setHandle: (username: string) => void;
}

export const SIGNED_OUT: AuthState = { ready: false, userId: null, email: null, handle: '', setHandle: () => {} };
export const AuthContext = createContext<AuthState>(SIGNED_OUT);

export const useAuth = () => useContext(AuthContext);
