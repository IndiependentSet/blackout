import { APP_BASE_URL, supabase } from '../supabase/client';
import { type Result } from '../result';
import { toResult } from '../supabase/guard';

export type OAuthProvider = 'google';

export async function sendMagicLink(email: string): Promise<Result<null>> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: APP_BASE_URL } });
  return toResult('sendMagicLink', null, error);
}

export async function signInWithOAuth(provider: OAuthProvider): Promise<Result<null>> {
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: APP_BASE_URL } });
  return toResult('signInWithOAuth', null, error);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
