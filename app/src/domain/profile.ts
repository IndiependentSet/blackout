import type { Profile } from './types';

/** How a player's handle is shown. */
export function displayName(p: Pick<Profile, 'username'> | null | undefined): string {
  return p && p.username ? '@' + p.username : '';
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;

/** Normalise typed handle input to the shape the profiles table accepts. */
export function cleanUsername(raw: string | null | undefined): string {
  return (raw || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, USERNAME_MAX);
}

/** A starting handle derived from an email; collisions are retried with a suffix by the caller. */
export function defaultUsername(email: string | null | undefined): string {
  const local = (email || 'staff').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 12);
  return local.length >= USERNAME_MIN ? local : local.padEnd(USERNAME_MIN, '0');
}

/** First letter for an avatar bubble. */
export function initial(p: Pick<Profile, 'username'> | null | undefined): string {
  return (displayName(p).replace('@', '')[0] || 'S').toUpperCase();
}
