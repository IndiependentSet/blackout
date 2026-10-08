import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthState } from '../../services/auth/authContext';
import { fail, ok } from '../../services/result';

const isAdmin = vi.fn();
vi.mock('../../services/repositories/admin', () => ({ isAdmin: (...a: unknown[]) => isAdmin(...a) }));
const { AdminGate } = await import('./AdminGate');

const auth = (over: Partial<AuthState> = {}): AuthState => ({
  ready: true, userId: null, email: null, username: '', handle: '', setHandle: vi.fn(), ...over,
});
const renderWith = (a: AuthState) => render(
  <AuthContext.Provider value={a}><AdminGate><div>secret tools</div></AdminGate></AuthContext.Provider>);

beforeEach(() => { isAdmin.mockReset(); });

describe('AdminGate', () => {
  it('waits for the session', () => {
    renderWith(auth({ ready: false }));
    expect(screen.getByText('CHECKING BADGE…')).toBeInTheDocument();
    expect(screen.queryByText('secret tools')).toBeNull();
  });
  it('sends a signed-out visitor to sign in, without asking the db', () => {
    renderWith(auth());
    expect(screen.getByText('STAFF ONLY')).toBeInTheDocument();
    expect(isAdmin).not.toHaveBeenCalled();
  });
  it('turns away a signed-in non-admin', async () => {
    isAdmin.mockResolvedValue(ok(false));
    renderWith(auth({ userId: 'u', handle: '@meow' }));
    expect(await screen.findByText('MANAGEMENT ONLY')).toBeInTheDocument();
    expect(screen.queryByText('secret tools')).toBeNull();
  });
  it('lets an admin in', async () => {
    isAdmin.mockResolvedValue(ok(true));
    renderWith(auth({ userId: 'boss' }));
    expect(await screen.findByText('secret tools')).toBeInTheDocument();
    expect(isAdmin).toHaveBeenCalledWith('boss');
  });
  it('says so when the check fails', async () => {
    isAdmin.mockResolvedValue(fail('offline'));
    renderWith(auth({ userId: 'u' }));
    expect(await screen.findByText('offline')).toBeInTheDocument();
    expect(screen.queryByText('secret tools')).toBeNull();
  });
});
