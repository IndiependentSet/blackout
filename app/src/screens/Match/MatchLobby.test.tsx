import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FriendLink, MatchView } from '../../domain/types';
import { ok } from '../../services/result';
import { matchRow, playerRow, viewOf } from './matchFixtures';
import { MatchLobby } from './MatchLobby';
import type { LadderDeps } from './useLadder';
import type { LobbyDeps } from './useLobby';
import type { SearchDeps } from './useMatchmaking';

vi.mock('../../services/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('../../services/supabase/client', () => ({ supabase: {}, APP_BASE_URL: 'http://localhost' }));

const friend = (id: string, username: string): FriendLink => ({
  row: { id: 'f-' + id, requester_id: 'me', addressee_id: id, status: 'accepted' }, person: { id, username },
});

function setup(over: Partial<LobbyDeps> = {}, props: { preselect?: string | null } = {}, extra: { search?: Partial<SearchDeps>; ladder?: Partial<LadderDeps> } = {}) {
  const deps: LobbyDeps = {
    list: vi.fn(async () => ok([] as MatchView[])),
    friends: vi.fn(async () => ok({ friends: [friend('a', 'ann'), friend('b', 'bob')], incoming: [], outgoing: [] })),
    record: vi.fn(async () => ok(null)),
    profiles: vi.fn(async () => ok({ a: { id: 'a', username: 'ann' }, b: { id: 'b', username: 'bob' } })),
    closeExpired: vi.fn(async () => ok(0)),
    create: vi.fn(async () => ok('new-match')),
    accept: vi.fn(async () => ok(matchRow())),
    decline: vi.fn(async () => ok(matchRow())),
    watch: vi.fn(() => vi.fn()),
    ...over,
  };
  const searchDeps: SearchDeps = { find: vi.fn(async () => ok(null)), leave: vi.fn(async () => ok(null)), now: () => Date.now(), ...extra.search };
  const ladderDeps: LadderDeps = { ladder: vi.fn(async () => ok([])), mine: vi.fn(async () => ok(null)), ...extra.ladder };
  const handlers = { onOpenMatch: vi.fn(), onBack: vi.fn() };
  const view = render(<MatchLobby userId="me" deps={deps} searchDeps={searchDeps} ladderDeps={ladderDeps} {...props} {...handlers} />);
  return { deps, searchDeps, ladderDeps, view, ...handlers };
}

const incomingFrom = (id: string, who: string): MatchView =>
  viewOf(matchRow({ id, status: 'pending', created_by: who, opponent_id: 'me', starts_at: null, ends_at: null }), [playerRow(who), playerRow('me')]);

describe('MatchLobby', () => {
  it('lists your workmates and challenges one, and the server picks the level', async () => {
    const { deps, onOpenMatch } = setup();
    await userEvent.click((await screen.findAllByRole('button', { name: 'CHALLENGE' }))[0]);
    await waitFor(() => expect(onOpenMatch).toHaveBeenCalledWith('new-match'));
    expect(deps.create).toHaveBeenCalledWith('a');
  });

  it('puts the workmate picked on the crew roster first', async () => {
    setup({}, { preselect: 'b' });
    const names = await screen.findAllByText(/^@(ann|bob)$/);
    expect(names.map(n => n.textContent)).toEqual(['@bob', '@ann']);
  });

  it('does not offer a second challenge to someone you already have an open match with', async () => {
    setup({ list: vi.fn(async () => ok([viewOf(matchRow({ opponent_id: 'a' }))])) });
    const buttons = await screen.findAllByRole('button', { name: 'CHALLENGE' });
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();
    expect(screen.getByText('ALREADY PLAYING')).toBeInTheDocument();
  });

  it('says so when there are no workmates', async () => {
    setup({ friends: vi.fn(async () => ok({ friends: [], incoming: [], outgoing: [] })) });
    expect(await screen.findByText(/NO WORKMATES YET/)).toBeInTheDocument();
  });

  it('shows what the server refused when a challenge fails', async () => {
    const { onOpenMatch } = setup({ create: vi.fn(async () => ({ ok: false as const, error: 'only friends and squad mates can be challenged' })) });
    await userEvent.click((await screen.findAllByRole('button', { name: 'CHALLENGE' }))[0]);
    expect(await screen.findByText('ONLY FRIENDS AND SQUAD MATES CAN BE CHALLENGED')).toBeInTheDocument();
    expect(onOpenMatch).not.toHaveBeenCalled();
  });

  it('accepts a challenge and opens it', async () => {
    const { deps, onOpenMatch } = setup({ list: vi.fn(async () => ok([incomingFrom('m9', 'a')])) });
    await userEvent.click(await screen.findByRole('button', { name: 'ACCEPT' }));
    await waitFor(() => expect(onOpenMatch).toHaveBeenCalledWith('m9'));
    expect(deps.accept).toHaveBeenCalledWith('m9');
  });

  it('does not open a challenge the server would not let you accept', async () => {
    const { onOpenMatch } = setup({
      list: vi.fn(async () => ok([incomingFrom('m9', 'a')])),
      accept: vi.fn(async () => ({ ok: false as const, error: 'that challenge is no longer open' })),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'ACCEPT' }));
    expect(await screen.findByText('THAT CHALLENGE IS NO LONGER OPEN')).toBeInTheDocument();
    expect(onOpenMatch).not.toHaveBeenCalled();
  });

  it('declines a challenge and reads the list again', async () => {
    const { deps } = setup({ list: vi.fn(async () => ok([incomingFrom('m9', 'a')])) });
    await userEvent.click(await screen.findByRole('button', { name: 'DECLINE' }));
    expect(deps.decline).toHaveBeenCalledWith('m9');
    await waitFor(() => expect(vi.mocked(deps.list).mock.calls.length).toBe(2));
  });

  it('returns to a match that is on the clock', async () => {
    const { onOpenMatch } = setup({ list: vi.fn(async () => ok([viewOf(matchRow({ id: 'm5', opponent_id: 'b' }))])) });
    await userEvent.click(await screen.findByRole('button', { name: 'RETURN TO SITE' }));
    expect(onOpenMatch).toHaveBeenCalledWith('m5');
  });

  it('shows your record and how recent matches ended', async () => {
    setup({
      record: vi.fn(async () => ok({ user_id: 'me', name: 'me', played: 3, won: 2, lost: 1, drawn: 0 })),
      list: vi.fn(async () => ok([viewOf(matchRow({ id: 'm3', status: 'done', winner_id: 'me', opponent_id: 'a' }))])),
    });
    expect(await screen.findByText('WON', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('settles expired matches before reading the list, and watches for changes until it closes', async () => {
    const stop = vi.fn();
    const { deps, view } = setup({ watch: vi.fn(() => stop) });
    await screen.findAllByRole('button', { name: 'CHALLENGE' });
    expect(deps.closeExpired).toHaveBeenCalled();
    expect(deps.watch).toHaveBeenCalledWith('me', expect.any(Function));
    view.unmount();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('goes back to the dashboard', async () => {
    const { onBack } = setup();
    await userEvent.click(screen.getByRole('button', { name: /DASHBOARD/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('looks for an opponent and opens the match it finds', async () => {
    const { searchDeps, onOpenMatch } = setup({}, {}, { search: { find: vi.fn(async () => ok('ranked-1')) } });
    await userEvent.click(await screen.findByRole('button', { name: 'HARD SITE' }));
    await waitFor(() => expect(onOpenMatch).toHaveBeenCalledWith('ranked-1'));
    expect(searchDeps.find).toHaveBeenCalledWith(1);
  });

  it('shows the search while it waits, and leaves the queue when cancelled', async () => {
    const { searchDeps } = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'STANDARD SITE' }));
    expect(await screen.findByRole('status')).toHaveTextContent('LOOKING FOR A WORKMATE');
    await userEvent.click(screen.getByRole('button', { name: 'CANCEL' }));
    expect(searchDeps.leave).toHaveBeenCalledOnce();
    expect(await screen.findByRole('button', { name: 'STANDARD SITE' })).toBeInTheDocument();
  });

  it('shows the player\'s rating and the ladder, with them marked', async () => {
    const row = (id: string, username: string, rating: number) => ({ user_id: id, username, rating, games: 4, won: 2, lost: 2, drawn: 0 });
    setup({}, {}, { ladder: {
      ladder: vi.fn(async () => ok([row('x', 'zed', 1210), row('me', 'mia', 1103)])),
      mine: vi.fn(async () => ok(row('me', 'mia', 1103))),
    } });
    expect(await screen.findByText('@zed')).toBeInTheDocument();
    expect(screen.getAllByText('1103').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('says so when nobody has played a ranked match yet', async () => {
    setup();
    expect(await screen.findByText(/NO RANKED MATCHES YET/)).toBeInTheDocument();
  });
});
