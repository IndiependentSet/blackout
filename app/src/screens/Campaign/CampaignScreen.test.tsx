import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CampaignClears } from '../../domain/campaign';
import { scoreRun } from '../../domain/scoring';
import type { CampaignClear } from '../../domain/types';
import type { Persistence } from '../../game/hooks/useCampaignClears';
import { CampaignScreen } from './CampaignScreen';

const badge = { label: 'STAFF LOGIN', sub: 'sign in' };
const clear = (levelNo: number): CampaignClear => ({ levelNo, run: scoreRun({ stars: 2, k: 3 }, 3), campaignStars: 3 });
const clearsOf = (...nos: number[]): CampaignClears => new Map(nos.map(n => [n, clear(n)]));

function setup(signedIn: boolean, clears: CampaignClears = new Map(), persistence: Persistence = 'memory') {
  const handlers = { onOpenLevel: vi.fn(), onOpenAccount: vi.fn(), onBack: vi.fn() };
  render(<CampaignScreen signedIn={signedIn} clears={clears} persistence={persistence} badge={badge} {...handlers} />);
  return handlers;
}

describe('CampaignScreen', () => {
  it('opens only level 1 for a new player', () => {
    setup(true);
    expect(screen.getByRole('button', { name: 'level 1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'level 2, locked' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'level 100, locked' })).toBeDisabled();
  });

  it('does not open a locked level', async () => {
    const h = setup(true);
    await userEvent.click(screen.getByRole('button', { name: 'level 2, locked' }));
    expect(h.onOpenLevel).not.toHaveBeenCalled();
  });

  it('opens the level after the last clear, and lets a cleared one be replayed', async () => {
    const h = setup(true, clearsOf(1, 2));
    expect(screen.getByRole('button', { name: 'level 1, 3 of 3 stars' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'level 4, locked' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'level 3' }));
    expect(h.onOpenLevel).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'level 1, 3 of 3 stars' }));
    expect(h.onOpenLevel).toHaveBeenLastCalledWith(1);
  });

  it('opens chapter 2 once chapter 1 is done', () => {
    setup(true, clearsOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
    expect(screen.getByRole('button', { name: 'level 11' })).toBeEnabled();
    expect(screen.getByText('10/10 CLEARED · 30/30 ★')).toBeInTheDocument();
  });

  it('says plainly that the levels are a mock and, when the server is out of reach, that nothing is saved', () => {
    setup(true);
    expect(screen.getByText('DEV MOCK')).toBeInTheDocument();
    expect(screen.getByText('PROGRESS NOT SAVED YET')).toBeInTheDocument();
  });

  it('says the progress is saved once the server holds the record', () => {
    setup(true, new Map(), 'server');
    expect(screen.getByText('SAVED TO YOUR STAFF FILE')).toBeInTheDocument();
    expect(screen.queryByText('PROGRESS NOT SAVED YET')).toBeNull();
  });

  it('says the record is loading while the server is asked', () => {
    setup(true, new Map(), 'loading');
    expect(screen.getByText('LOADING YOUR RECORD…')).toBeInTheDocument();
  });

  it('sends a signed-out player to sign in instead of showing the map', async () => {
    const h = setup(false);
    expect(screen.queryByRole('button', { name: 'level 1' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'SIGN IN' }));
    expect(h.onOpenAccount).toHaveBeenCalledOnce();
  });
});
