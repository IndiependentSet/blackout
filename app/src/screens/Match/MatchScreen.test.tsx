import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { START, fakeDeps, matchRow, playerRow, viewOf } from './matchFixtures';
import { MatchScreen } from './MatchScreen';

vi.mock('../../services/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('../../services/supabase/client', () => ({ supabase: {}, APP_BASE_URL: 'http://localhost' }));

const badge = { label: 'STAFF LOGIN', sub: 'sign in' };
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const press = (key: string) => act(() => { fireEvent.keyDown(window, { key }); });
const catsHired = () => (screen.getByText('cats hired').previousElementSibling as HTMLElement).textContent;

function setup(deps: ReturnType<typeof fakeDeps>['deps']) {
  const handlers = { onOpenAccount: vi.fn(), onOpenLobby: vi.fn(), onOpenHub: vi.fn() };
  render(<MatchScreen matchId="m1" userId="me" badge={badge} deps={deps} {...handlers} />);
  return handlers;
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(START - 2_000); });
afterEach(() => vi.useRealTimers());

describe('MatchScreen: the board', () => {
  it('ignores taps until the countdown is over, then plays', async () => {
    const { deps, channels } = fakeDeps(viewOf(matchRow()));
    setup(deps);
    await flush();

    expect(screen.getByRole('timer', { name: 'starts in' })).toHaveTextContent('2');
    press('Enter');
    expect(catsHired()).toBe('0/1');

    await advance(2_500);
    expect(screen.getByRole('timer', { name: 'time left' })).toBeInTheDocument();
    press('Enter');
    expect(catsHired()).toBe('1/1');
    expect(channels[0].sendProgress).toHaveBeenLastCalledWith(1);
  });

  it('sends the cats to the server when the board is cleared', async () => {
    const { deps } = fakeDeps(viewOf(matchRow()));
    setup(deps);
    await flush();
    await advance(2_500);

    press('ArrowRight');
    press('Enter');
    await flush();
    expect(deps.submit).toHaveBeenCalledWith('m1', [1]);
  });

  it('does not send a cover that is not complete', async () => {
    const { deps } = fakeDeps(viewOf(matchRow()));
    setup(deps);
    await flush();
    await advance(2_500);
    press('Enter');
    await flush();
    expect(deps.submit).not.toHaveBeenCalled();
  });

  it('shows how far the opponent has got, and the dev-mock tag', async () => {
    const { deps, channels } = fakeDeps(viewOf(matchRow()));
    setup(deps);
    await flush();
    act(() => channels[0].handlers.onProgress('you', 1));
    expect(screen.getByRole('progressbar', { name: '@rival progress' })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByText('DEV MOCK')).toBeInTheDocument();
  });

  it('asks twice before forfeiting', async () => {
    const { deps } = fakeDeps(viewOf(matchRow()));
    setup(deps);
    await flush();
    await advance(2_500);
    fireEvent.click(screen.getByRole('button', { name: 'FORFEIT' }));
    expect(deps.forfeit).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'SURE? FORFEIT' })); });
    expect(deps.forfeit).toHaveBeenCalledWith('m1');
  });
});

describe('MatchScreen: the sheets', () => {
  it('lets the sender wait, and call the challenge off', async () => {
    const { deps } = fakeDeps(viewOf(matchRow({ status: 'pending', starts_at: null, ends_at: null })));
    setup(deps);
    await flush();
    expect(screen.getByText('WAITING FOR @rival')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'CANCEL CHALLENGE' })); });
    expect(deps.forfeit).toHaveBeenCalledWith('m1');
  });

  it('lets the receiver accept or decline', async () => {
    const { deps } = fakeDeps(viewOf(matchRow({ status: 'pending', created_by: 'you', opponent_id: 'me', starts_at: null, ends_at: null })));
    setup(deps);
    await flush();
    expect(screen.getByText('@rival CHALLENGED YOU')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'ACCEPT' })); });
    expect(deps.accept).toHaveBeenCalledWith('m1');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'DECLINE' })); });
    expect(deps.decline).toHaveBeenCalledWith('m1');
  });

  it('shows what the server refused', async () => {
    const { deps } = fakeDeps(viewOf(matchRow({ status: 'pending', created_by: 'you', opponent_id: 'me', starts_at: null, ends_at: null })));
    deps.accept = vi.fn(async () => ({ ok: false as const, error: 'that challenge is no longer open' }));
    setup(deps);
    await flush();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'ACCEPT' })); });
    expect(screen.getByRole('alert')).toHaveTextContent('THAT CHALLENGE IS NO LONGER OPEN');
  });

  it('closes with the result when the server has decided', async () => {
    const done = matchRow({ status: 'done', winner_id: 'me' });
    const players = [playerRow('me', { cats_used: 1, finished_at: new Date(START + 42_000).toISOString(), result: 'won' }), playerRow('you', { cats_used: 2, finished_at: new Date(START + 50_000).toISOString(), result: 'lost' })];
    const { deps } = fakeDeps(viewOf(done, players));
    const h = setup(deps);
    await flush();
    const sheet = screen.getByRole('dialog', { name: 'match result' });
    expect(sheet).toHaveTextContent('YOU WON');
    expect(sheet).toHaveTextContent('1 CAT · 0:42');
    expect(sheet).toHaveTextContent('2 CATS · 0:50');
    fireEvent.click(screen.getByRole('button', { name: 'BACK TO LOBBY' }));
    expect(h.onOpenLobby).toHaveBeenCalledOnce();
  });

  it('says so when you lost, and when nobody played', async () => {
    const lost = fakeDeps(viewOf(matchRow({ status: 'done', winner_id: 'you' })));
    const first = render(<MatchScreen matchId="m1" userId="me" badge={badge} deps={lost.deps} onOpenAccount={vi.fn()} onOpenLobby={vi.fn()} onOpenHub={vi.fn()} />);
    await flush();
    expect(screen.getByRole('dialog', { name: 'match result' })).toHaveTextContent('YOU LOST');
    first.unmount();

    const void_ = fakeDeps(viewOf(matchRow({ status: 'void', starts_at: null, ends_at: null })));
    render(<MatchScreen matchId="m1" userId="me" badge={badge} deps={void_.deps} onOpenAccount={vi.fn()} onOpenLobby={vi.fn()} onOpenHub={vi.fn()} />);
    await flush();
    expect(screen.getByRole('dialog', { name: 'match result' })).toHaveTextContent('NO CONTEST');
  });

  it('says so when the match is not yours to see', async () => {
    const { deps } = fakeDeps(null);
    setup(deps);
    await flush();
    expect(screen.getByText('THAT MATCH IS NOT YOURS TO SEE.')).toBeInTheDocument();
  });

  it('says so when the match cannot be read', async () => {
    const { deps } = fakeDeps(null);
    deps.getMatch = vi.fn(async () => ({ ok: false as const, error: 'relation "matches" does not exist' }));
    setup(deps);
    await flush();
    expect(screen.getByText('RELATION "MATCHES" DOES NOT EXIST')).toBeInTheDocument();
  });
});
