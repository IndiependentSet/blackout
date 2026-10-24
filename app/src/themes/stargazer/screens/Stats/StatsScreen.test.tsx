import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { parseStats } from '../../../../domain/stats';

const hooks = vi.hoisted(() => ({
  stats: { stats: undefined as unknown, loading: false, error: null as string | null },
  place: null as unknown,
}));
vi.mock('../../../../game/hooks/useStats', () => ({ useStats: () => hooks.stats }));
vi.mock('../../../../game/hooks/useBoard', () => ({ useMyPlace: () => hooks.place }));

const { StatsScreen } = await import('./StatsScreen');

const played = parseStats({
  nights: { played: 12, perfect: 3, skies: 80, at_par: 64, points: 1500, best_points: 110, first_day: 150 },
  streak: { current: 4, best: 9 },
  voyage: { levels: 20, stars: 41, at_par: 15, points: 600 },
  rush: { runs: 5, best_sites: 9, best_score: 210, total_sites: 31 },
  duel: { rating: 1042, games: 8, peak: 1070, season_gain: 31, season_games: 5, played: 11, won: 6, lost: 4, drawn: 1, form: ['won', 'lost', 'won'], history: [1000, 1016, 1042] },
});
const props = { userId: 'me', today: 412, onBoard: vi.fn(), onSignIn: vi.fn(), onBack: vi.fn() };
const show = (over = {}) => render(<StatsScreen {...props} {...over} />);

describe('StatsScreen', () => {
  it('lays out every mode’s numbers', () => {
    hooks.stats = { stats: played, loading: false, error: null };
    hooks.place = null;
    show();
    const stats = within(screen.getByRole('region', { name: 'Your stats' }));
    expect(stats.getByText('80%')).toBeInTheDocument();         // 64 of 80 skies at par
    expect(stats.getByText(/^1\D?500$/)).toBeInTheDocument();
    expect(stats.getByText('20 / 100')).toBeInTheDocument();
    expect(stats.getByText('41 / 300')).toBeInTheDocument();
    expect(stats.getByText('9 skies')).toBeInTheDocument();
    expect(stats.getByText('1042')).toBeInTheDocument();
    expect(stats.getByText('+31')).toBeInTheDocument();         // rating gained this month
    expect(stats.getByText('6–4–1')).toBeInTheDocument();
    expect(stats.getByText('55%')).toBeInTheDocument();         // 6 of 11 duels
    expect(stats.getByLabelText(/Last duels, newest first: won, lost, won/)).toBeInTheDocument();
    expect(stats.getByRole('img', { name: /Rating over your last 3 ranked duels/ })).toBeInTheDocument();
  });

  it('opens a board from the place a player holds on it', async () => {
    hooks.stats = { stats: played, loading: false, error: null };
    hooks.place = { entry: { place: 3, userId: 'me', username: 'me', avatar: null, value: 1, extra: 1, isMe: true, trend: null, versus: null }, total: 20 };
    const onBoard = vi.fn();
    show({ onBoard });
    await userEvent.click(screen.getAllByRole('button', { name: /#3 of 20 on the ladder/ })[0]);
    expect(onBoard).toHaveBeenCalledWith(['duel', 'season']);
  });

  it('opens the nights boards from the place on each, this week and all time', async () => {
    hooks.stats = { stats: played, loading: false, error: null };
    hooks.place = { entry: { place: 3, userId: 'me', username: 'me', avatar: null, value: 1, extra: 1, isMe: true, trend: null, versus: null }, total: 20 };
    const onBoard = vi.fn();
    show({ onBoard });
    await userEvent.click(screen.getByRole('button', { name: /#3 of 20 all time/ }));
    expect(onBoard).toHaveBeenCalledWith(['alltime', 'night', 'week']);
    await userEvent.click(screen.getByRole('button', { name: /#3 of 20 this week/ }));
    expect(onBoard).toHaveBeenLastCalledWith(['week', 'night', 'alltime']);
  });

  it('says so for a mode not played yet instead of printing zeros', () => {
    hooks.stats = { stats: parseStats({ nights: { played: 1, skies: 2, at_par: 2 } }), loading: false, error: null };
    show();
    expect(screen.getByText(/No runs yet/)).toBeInTheDocument();
    expect(screen.getByText(/No duels yet/)).toBeInTheDocument();
  });

  it('welcomes a new player with what to do, not a page of zeros', () => {
    hooks.stats = { stats: parseStats({}), loading: false, error: null };
    show();
    expect(screen.getByText(/Nothing charted yet/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your stats' })).toBeNull();
  });

  it('reads as loading and as an error', () => {
    hooks.stats = { stats: undefined, loading: true, error: null };
    const { rerender } = show();
    expect(screen.getByText('Reading your logbook…')).toBeInTheDocument();
    hooks.stats = { stats: undefined, loading: false, error: 'offline' };
    rerender(<StatsScreen {...props} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t read your stats. offline');
  });

  it('offers sign-in to a signed-out player', async () => {
    hooks.stats = { stats: undefined, loading: false, error: null };
    const onSignIn = vi.fn();
    show({ userId: null, onSignIn });
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledOnce();
  });
});
