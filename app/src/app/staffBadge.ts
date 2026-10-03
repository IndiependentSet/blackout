import { perfectCount } from '../game/state/selectors';
import { SITE_COUNT } from '../domain/sites';
import type { SiteResult } from '../domain/types';
import type { AuthState } from '../services/auth/authContext';
import type { StaffBadgeInfo } from '../ui';

/** What the staff-login button says: your handle and week so far, or an invitation to sign in. */
export function staffBadge(auth: Pick<AuthState, 'userId' | 'handle'>, results: (SiteResult | null)[]): StaffBadgeInfo {
  if (!auth.userId) return { label: 'STAFF LOGIN', sub: 'SAVE YOUR SCORE' };
  return { label: auth.handle || 'STAFF', sub: perfectCount(results) + '/' + SITE_COUNT + ' PURR-FECT' };
}
