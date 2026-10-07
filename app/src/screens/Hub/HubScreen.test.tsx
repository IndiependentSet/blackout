import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HubScreen } from './HubScreen';

function setup(signedIn: boolean) {
  const handlers = { onOpenDaily: vi.fn(), onOpenCampaign: vi.fn(), onOpenSurvival: vi.fn(), onOpenMatch: vi.fn(), onOpenAccount: vi.fn(), onHowItWorks: vi.fn() };
  render(<HubScreen day={3} perfect={2} total={7} campaignStat="CHAPTER 1 · LEVEL 4" survivalStat="BEST: 3 SITES · 41 PTS" signedIn={signedIn} badge={{ label: 'STAFF LOGIN', sub: 'sign in' }} {...handlers} />);
  return handlers;
}

describe('HubScreen', () => {
  it('opens the work order from the daily card', async () => {
    const h = setup(false);
    expect(screen.getByText('2/7 PURR-FECT')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'OPEN WORK ORDER' }));
    expect(h.onOpenDaily).toHaveBeenCalledOnce();
  });

  it('sends an anonymous player from the campaign card to the account screen', async () => {
    const h = setup(false);
    await userEvent.click(screen.getByRole('button', { name: 'SIGN IN' }));
    expect(h.onOpenAccount).toHaveBeenCalledOnce();
    expect(h.onOpenCampaign).not.toHaveBeenCalled();
  });

  it('opens the campaign for a signed-in player', async () => {
    const h = setup(true);
    expect(screen.getByText('CHAPTER 1 · LEVEL 4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'PLAY CAMPAIGN' }));
    expect(h.onOpenCampaign).toHaveBeenCalledOnce();
  });

  it('opens survival for anyone, signed in or not', async () => {
    const h = setup(false);
    expect(screen.getByText('BEST: 3 SITES · 41 PTS')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'PLAY SURVIVAL' }));
    expect(h.onOpenSurvival).toHaveBeenCalledOnce();
    expect(h.onOpenAccount).not.toHaveBeenCalled();
  });

  it('sends an anonymous player from the 1vs1 card to the account screen', async () => {
    const h = setup(false);
    await userEvent.click(screen.getByRole('button', { name: 'SIGN IN TO CHALLENGE' }));
    expect(h.onOpenAccount).toHaveBeenCalledOnce();
    expect(h.onOpenMatch).not.toHaveBeenCalled();
  });

  it('opens the 1vs1 lobby for a signed-in player', async () => {
    const h = setup(true);
    expect(screen.queryByRole('button', { name: 'COMING SOON' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'OPEN 1VS1 LOBBY' }));
    expect(h.onOpenMatch).toHaveBeenCalledOnce();
  });
});
