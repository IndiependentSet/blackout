import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessoryArt } from '../../domain/types';
import { BARE, LoadoutContext, type LoadoutState } from '../../game/loadout/loadoutContext';

let drawn: string[] = [];
vi.mock('../../assets/cosmetics', () => ({
  hasArt: (id: string) => drawn.includes(id),
  accessoryFor: (loadout: { head: string | null; neck: string | null } | undefined): AccessoryArt | undefined => {
    const id = loadout?.head ?? loadout?.neck;
    return id ? { wakeA: [id + '.png'], wakeB: [id + '-b.png'] } : undefined;
  },
}));

const { Wardrobe } = await import('./Wardrobe');

const equip = vi.fn<LoadoutState['equip']>(async () => true);
const show = (over: Partial<LoadoutState> = {}) =>
  render(<LoadoutContext.Provider value={{ ...BARE, equip, ...over }}><Wardrobe /></LoadoutContext.Provider>);

beforeEach(() => { equip.mockClear(); drawn = []; });

describe('Wardrobe', () => {
  it('lists every accessory, locked ones saying how to earn them', () => {
    show();
    expect(screen.getAllByRole('button', { name: 'LOCKED' })).toHaveLength(4);
    for (const b of screen.getAllByRole('button', { name: 'LOCKED' })) expect(b).toBeDisabled();
    expect(screen.getByText('EARN THE PURR-FECT SHIFT BADGE')).toBeInTheDocument();
    expect(screen.getByText('HARD HAT')).toBeInTheDocument();
    expect(screen.getByText('SCARF')).toBeInTheDocument();
  });

  it('says ART COMING where the accessory has not been drawn', () => {
    show();
    expect(screen.getAllByText(/COMING/)).toHaveLength(4);
  });

  it('shows a picture instead once the art exists', () => {
    drawn = ['hard-hat'];
    const { container } = show();
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(screen.getAllByText(/COMING/)).toHaveLength(3);
  });

  it('puts an unlocked accessory on in its own slot', async () => {
    show({ owned: ['hard-hat'] });
    await userEvent.click(screen.getByRole('button', { name: 'WEAR' }));
    expect(equip).toHaveBeenCalledWith('head', 'hard-hat');
  });

  it('takes a worn accessory off by sending null for the slot', async () => {
    show({ owned: ['scarf'], loadout: { head: null, neck: 'scarf' } });
    expect(screen.getByText('WORN')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'TAKE OFF' }));
    expect(equip).toHaveBeenCalledWith('neck', null);
  });

  it('says so without blocking when the wardrobe is unavailable', () => {
    show({ error: 'relation "player_cosmetics" does not exist' });
    expect(screen.getByText(/WARDROBE UNAVAILABLE/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'LOCKED' })).toHaveLength(4);
  });

  it('shows a loading line while it opens', () => {
    show({ loading: true });
    expect(screen.getByText(/OPENING THE WARDROBE/)).toBeInTheDocument();
  });
});
