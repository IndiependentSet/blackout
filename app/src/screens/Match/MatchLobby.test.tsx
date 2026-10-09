import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FriendLink, MatchView } from '../../domain/types';
import { ok } from '../../services/result';
import { matchRow, playerRow, viewOf } from './matchFixtures';
import { MatchLobby } from './MatchLobby';
import type { LobbyDeps } from './useLobby';

vi.mock('../../services/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('../../services/supabase/client', () => ({ supabase: {}, APP_BASE_URL: 'http://localhost' }));

const friend = (id: string, username: string): FriendLink => ({
  row: { id: 'f-' + id, requester_id: 'me', addressee_id: id, status: 'accepted' }, person: { id, username },
});

function setup(over: Partial<LobbyDeps> = {}, props: { preselect?: string | null } = {}) {
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
  const handlers = { onOpenMatch: vi.fn(), onBack: vi.fn() };
  const view = render(<MatchLobby userId="me" deps={deps} {...props} {...handlers} />);
  return { deps, view, ...handlers };
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
});
