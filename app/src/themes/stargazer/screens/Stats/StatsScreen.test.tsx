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
const desk = { streak: 4, initial: 'M', avatar: null, onGo: vi.fn() };
const props = { userId: 'me', today: 412, desk, onBoard: vi.fn(), onSignIn: vi.fn(), onBack: vi.fn() };
const show = (over = {}) => render(<StatsScreen {...props} {...over} />);
const mode = (name: string) => userEvent.click(screen.getByRole('tab', { name }));
const place = { entry: { place: 3, userId: 'me', username: 'me', avatar: null, value: 1, extra: 1, isMe: true, trend: null, versus: null }, total: 20 };

describe('StatsScreen', () => {
  it('opens on the nights, one mode at a time', () => {
    hooks.stats = { stats: played, loading: false, error: null };
    hooks.place = null;
    show();
    const stats = within(screen.getByRole('region', { name: 'Your stats' }));
    expect(stats.getByText('12')).toBeInTheDocument();
    expect(stats.getByText('3 perfect nights · streak 4, best 9')).toBeInTheDocument();
    expect(stats.getByText('80%')).toBeInTheDocument();         // 64 of 80 skies at par
    expect(stats.getByText(/^1\D?500$/)).toBeInTheDocument();
    expect(stats.queryByText('1042')).toBeNull();
  });

  it('lays out the voyage, Rush and the duels as each mode is picked', async () => {
    hooks.stats = { stats: played, loading: false, error: null };
    hooks.place = null;
    show();
    await mode('Voyage');
    expect(screen.getByText('20 / 100')).toBeInTheDocument();
    expect(screen.getByText('41 of 300')).toBeInTheDocument();
    await mode('Rush');
    expect(screen.getByText('9 skies')).toBeInTheDocument();
    expect(screen.getByText('210 points in that run')).toBeInTheDocument();
    await mode('Duel');
    expect(screen.getByText('1042')).toBeInTheDocument();
    expect(screen.getByText('Peak 1070 · +31 this month')).toBeInTheDocument();
    expect(screen.getByText('6 · 4 · 1')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();         // 6 of 11 duels
    expect(screen.getByLabelText(/Last duels, newest first: won, lost, won/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Rating over your last 3 ranked duels/ })).toBeInTheDocument();
  });

  it('opens the mode’s boards from the leaderboard button', async () => {
    hooks.stats = { stats: played, loading: false, error: null };
    hooks.place = place;
    const onBoard = vi.fn();
    show({ onBoard });
    await userEvent.click(screen.getByRole('button', { name: /#3 of 20 this week, #3 of 20 all time/ }));
    expect(onBoard).toHaveBeenLastCalledWith(['week', 'night', 'alltime']);
    await mode('Duel');
    await userEvent.click(screen.getByRole('button', { name: /#3 of 20 on the ladder/ }));
    expect(onBoard).toHaveBeenLastCalledWith(['duel', 'season']);
  });

  it('says so for a mode not played yet instead of printing zeros', async () => {
    hooks.stats = { stats: parseStats({ nights: { played: 1, skies: 2, at_par: 2 } }), loading: false, error: null };
    show();
    await mode('Rush');
    expect(screen.getByText(/No runs yet/)).toBeInTheDocument();
    await mode('Duel');
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
