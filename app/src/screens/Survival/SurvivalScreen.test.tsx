import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SURVIVAL_LIMIT_MS, type RunSummary } from '../../domain/survival';
import type { SurvivalSession } from '../../game/useSurvivalSession';
import { ok } from '../../services/result';
import * as repo from '../../services/repositories/survival';
import { SurvivalScreen } from './SurvivalScreen';
import { SurvivalSummary } from './SurvivalSummary';

vi.mock('../../services/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('../../services/repositories/survival', () => ({
  startSurvivalRun: vi.fn(async () => ({ ok: true, data: 'run-1' })),
  submitSurvivalSite: vi.fn(async () => ({ ok: true, data: { sites: 1, perfect: 1, score: 20 } })),
  getSurvivalLeaderboard: vi.fn(async () => ({ ok: true, data: [] })),
  getBestRun: vi.fn(async () => ({ ok: true, data: null })),
}));

/* The real session, except that a test can say what the run has come to without playing it through. */
let override: Partial<SurvivalSession> | null = null;
vi.mock('../../game/useSurvivalSession', async importOriginal => {
  const real = await importOriginal<typeof import('../../game/useSurvivalSession')>();
  return { ...real, useSurvivalSession: (...args: Parameters<typeof real.useSurvivalSession>) => ({ ...real.useSurvivalSession(...args), ...override }) };
});

const badge = { label: 'STAFF LOGIN', sub: 'sign in' };
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

function setup(over: { userId?: string | null; best?: RunSummary | null } = {}) {
  const handlers = { onFinish: vi.fn(), onOpenAccount: vi.fn(), onOpenHub: vi.fn() };
  render(<SurvivalScreen userId={over.userId ?? null} badge={badge} best={over.best ?? null} {...handlers} />);
  return handlers;
}

beforeEach(() => { vi.useFakeTimers(); override = null; vi.mocked(repo.getSurvivalLeaderboard).mockResolvedValue(ok([])); vi.mocked(repo.getBestRun).mockResolvedValue(ok(null)); });
afterEach(() => vi.useRealTimers());

describe('SurvivalScreen', () => {
  it('shows the clock, the run so far and the dev-mock tag while a run is on', async () => {
    setup();
    await flush();
    expect(screen.getByRole('timer')).toHaveTextContent('3:00');
    expect(screen.getByText('0 SITES')).toBeInTheDocument();
    expect(screen.getByText('DEV MOCK')).toBeInTheDocument();
    expect(screen.getByText('SIGN IN TO RANK')).toBeInTheDocument();
    await advance(61_000);
    expect(screen.getByRole('timer')).toHaveTextContent('1:59');
    expect(screen.queryByRole('dialog', { name: 'survival summary' })).not.toBeInTheDocument();
  });

  it('does not ask a signed-in player to sign in', async () => {
    setup({ userId: 'u1' });
    await flush();
    expect(screen.queryByText('SIGN IN TO RANK')).not.toBeInTheDocument();
  });

  it('ends with a summary when the clock runs out, and starts a fresh run on PLAY AGAIN', async () => {
    const h = setup();
    await flush();
    await advance(SURVIVAL_LIMIT_MS);
    expect(screen.getByRole('dialog', { name: 'survival summary' })).toBeInTheDocument();
    expect(screen.getByText('NO SITES FLATTENED THIS TIME')).toBeInTheDocument();
    expect(h.onFinish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'PLAY AGAIN' }));
    await flush();
    expect(screen.queryByRole('dialog', { name: 'survival summary' })).not.toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('3:00');
  });

  it('reports a run that flattened sites exactly once, and flags a new session record', async () => {
    const summary: RunSummary = { sites: 3, perfect: 2, score: 41 };
    override = { over: true, remainingMs: 0, summary };
    const h = setup({ best: { sites: 2, perfect: 2, score: 50 } });
    await flush();
    expect(h.onFinish).toHaveBeenCalledExactlyOnceWith(summary);
    expect(screen.getByText('NEW RECORD FOR THIS SESSION')).toBeInTheDocument();
    expect(screen.getByText('SITES FLATTENED')).toBeInTheDocument();
  });

  it('reports a run walked away from, not an empty one', async () => {
    override = { summary: { sites: 2, perfect: 1, score: 25 } };
    const h = setup();
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'DASHBOARD' }));
    expect(h.onFinish).toHaveBeenCalledExactlyOnceWith({ sites: 2, perfect: 1, score: 25 });
    expect(h.onOpenHub).toHaveBeenCalledOnce();
  });

  it('leaves without reporting when nothing was flattened', async () => {
    const h = setup();
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'DASHBOARD' }));
    expect(h.onFinish).not.toHaveBeenCalled();
    expect(h.onOpenHub).toHaveBeenCalledOnce();
  });
});

describe('SurvivalScreen leaderboard', () => {
  const rows = [
    { user_id: 'a', username: 'tom', sites: 9, perfect: 8, score: 300 },
    { user_id: 'u1', username: 'me', sites: 4, perfect: 3, score: 120 },
  ];

  it('reads the board once the run is over and the last site is banked, and lists it in the summary', async () => {
    vi.mocked(repo.getSurvivalLeaderboard).mockResolvedValue(ok(rows));
    override = { over: true, remainingMs: 0, summary: { sites: 4, perfect: 3, score: 120 }, recorded: true, recording: 'ranked' };
    setup({ userId: 'u1' });
    await flush();
    const board = screen.getByRole('list', { name: 'survival leaderboard' });
    expect(board).toHaveTextContent('1. tom');
    expect(board).toHaveTextContent('2. me');
    expect(board).toHaveTextContent('9 SITES');
  });

  it('waits for the server to answer for the last site before it reads the board', async () => {
    override = { over: true, remainingMs: 0, summary: { sites: 4, perfect: 3, score: 120 }, recorded: false, recording: 'syncing' };
    setup({ userId: 'u1' });
    await flush();
    expect(repo.getSurvivalLeaderboard).not.toHaveBeenCalled();
  });

  it('beats the server record, not only this session\'s', async () => {
    vi.mocked(repo.getBestRun).mockResolvedValue(ok({ sites: 6, perfect: 6, score: 400 }));
    override = { over: true, remainingMs: 0, summary: { sites: 4, perfect: 3, score: 120 }, recorded: true, recording: 'ranked' };
    setup({ userId: 'u1' });
    await flush();
    expect(screen.getByText(`BEST: 6 SITES · ${(400).toLocaleString()} PTS`)).toBeInTheDocument();
    expect(screen.queryByText('NEW PERSONAL RECORD')).not.toBeInTheDocument();
  });

  it('says so, without stopping the run, when it was not saved', async () => {
    override = { over: true, remainingMs: 0, summary: { sites: 1, perfect: 1, score: 20 }, recorded: true, recording: 'unsaved' };
    setup({ userId: 'u1' });
    await flush();
    expect(screen.getByText('THIS RUN WAS NOT SAVED TO THE LEADERBOARD')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PLAY AGAIN' })).toBeEnabled();
  });

  it('shows the board to a signed-out player too, with an invitation to sign in', async () => {
    vi.mocked(repo.getSurvivalLeaderboard).mockResolvedValue(ok(rows));
    override = { over: true, remainingMs: 0, summary: { sites: 2, perfect: 2, score: 50 }, recorded: true, recording: 'local' };
    setup();
    await flush();
    expect(screen.getByRole('list', { name: 'survival leaderboard' })).toBeInTheDocument();
    expect(screen.getByText('SIGN IN TO RANK YOUR RUNS')).toBeInTheDocument();
  });
});

describe('SurvivalSummary', () => {
  const summary: RunSummary = { sites: 4, perfect: 3, score: 1234 };
  const props = { summary, before: null, isRecord: false, signedIn: true, onAgain: vi.fn(), onOpenHub: vi.fn() };

  it('lists what the run came to', () => {
    render(<SurvivalSummary {...props} />);
    expect(screen.getByText('SITES FLATTENED')).toBeInTheDocument();
    expect(screen.getByText('3/4')).toBeInTheDocument();
    expect(screen.getByText(`${(1234).toLocaleString()} PTS`)).toBeInTheDocument();
  });

  it('names the session best when this run is not it', () => {
    render(<SurvivalSummary {...props} before={{ sites: 6, perfect: 6, score: 2000 }} />);
    expect(screen.getByText(`BEST: 6 SITES · ${(2000).toLocaleString()} PTS`)).toBeInTheDocument();
    expect(screen.queryByText('NEW RECORD FOR THIS SESSION')).not.toBeInTheDocument();
  });

  it('only asks a signed-out player to sign in', () => {
    const { rerender } = render(<SurvivalSummary {...props} signedIn={false} />);
    expect(screen.getByText('SIGN IN TO RANK YOUR RUNS')).toBeInTheDocument();
    rerender(<SurvivalSummary {...props} signedIn />);
    expect(screen.queryByText('SIGN IN TO RANK YOUR RUNS')).not.toBeInTheDocument();
  });
});
