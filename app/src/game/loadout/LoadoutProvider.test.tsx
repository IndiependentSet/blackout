import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, SIGNED_OUT } from '../../services/auth/authContext';

const repo = vi.hoisted(() => ({ getWardrobe: vi.fn(), setLoadout: vi.fn() }));
vi.mock('../../services/repositories/cosmetics', () => repo);

const { LoadoutProvider } = await import('./LoadoutProvider');
const { useLoadout } = await import('./loadoutContext');

function Probe() {
  const { loadout, owned, error, equip } = useLoadout();
  return (
    <div>
      <div data-testid="head">{loadout.head ?? 'bare'}</div>
      <div data-testid="owned">{owned.join(',')}</div>
      <div data-testid="error">{error ?? ''}</div>
      <button onClick={() => equip('head', 'hard-hat')}>wear</button>
    </div>
  );
}

const mount = (userId: string | null) => render(
  <AuthContext.Provider value={{ ...SIGNED_OUT, ready: true, userId }}>
    <LoadoutProvider><Probe /></LoadoutProvider>
  </AuthContext.Provider>);

const wardrobe = (head: string | null) => ({ ok: true, data: { owned: ['hard-hat'], loadout: { head, neck: null } } });

beforeEach(() => { repo.getWardrobe.mockReset(); repo.setLoadout.mockReset(); });

describe('LoadoutProvider', () => {
  it('leaves the cats bare and asks nothing when nobody is signed in', () => {
    mount(null);
    expect(screen.getByTestId('head')).toHaveTextContent('bare');
    expect(repo.getWardrobe).not.toHaveBeenCalled();
  });

  it('loads the signed-in player\'s wardrobe', async () => {
    repo.getWardrobe.mockResolvedValue(wardrobe('hard-hat'));
    mount('u1');
    await waitFor(() => expect(screen.getByTestId('head')).toHaveTextContent('hard-hat'));
    expect(screen.getByTestId('owned')).toHaveTextContent('hard-hat');
    expect(repo.getWardrobe).toHaveBeenCalledWith('u1');
  });

  it('keeps the cats bare and reports a failed load without throwing', async () => {
    repo.getWardrobe.mockResolvedValue({ ok: false, error: 'no such table' });
    mount('u1');
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('no such table'));
    expect(screen.getByTestId('head')).toHaveTextContent('bare');
  });

  it('saves through set_loadout, then reloads what the server says', async () => {
    repo.getWardrobe.mockResolvedValueOnce(wardrobe(null)).mockResolvedValueOnce(wardrobe('hard-hat'));
    repo.setLoadout.mockResolvedValue({ ok: true, data: null });
    mount('u1');
    await waitFor(() => expect(screen.getByTestId('owned')).toHaveTextContent('hard-hat'));
    await userEvent.click(screen.getByText('wear'));
    expect(repo.setLoadout).toHaveBeenCalledWith('head', 'hard-hat');
    await waitFor(() => expect(screen.getByTestId('head')).toHaveTextContent('hard-hat'));
  });

  it('keeps the old loadout and shows the error when the server refuses', async () => {
    repo.getWardrobe.mockResolvedValue(wardrobe(null));
    repo.setLoadout.mockResolvedValue({ ok: false, error: 'you have not unlocked that accessory' });
    mount('u1');
    await waitFor(() => expect(screen.getByTestId('owned')).toHaveTextContent('hard-hat'));
    await userEvent.click(screen.getByText('wear'));
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('not unlocked'));
    expect(screen.getByTestId('head')).toHaveTextContent('bare');
    expect(repo.getWardrobe).toHaveBeenCalledTimes(1);
  });
});
