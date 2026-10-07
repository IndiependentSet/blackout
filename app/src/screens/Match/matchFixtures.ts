import { vi, type Mock } from 'vitest';
import type { Match, MatchPlayer, MatchView } from '../../domain/types';
import type { MatchChannel, MatchChannelHandlers } from '../../services/realtime/matchChannel';
import { ok } from '../../services/result';
import type { MatchDeps } from './useMatch';

/* Shared by the match tests: a three-node path with one optimal cover (the middle node), and fakes for
   everything the match hook talks to. */

export const level = {
  nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }],
  edges: [[0, 1], [1, 2]] as [number, number][],
  adj: [[1], [0, 2], [1]],
  k: 1, sol: [1], stars: 1 as const,
};

export const START = Date.parse('2026-10-07T10:00:03.000Z');
export const END = Date.parse('2026-10-07T10:05:03.000Z');

export function matchRow(over: Partial<Match> = {}): Match {
  return {
    id: 'm1', level, created_by: 'me', opponent_id: 'you', status: 'active',
    created_at: '2026-10-07T10:00:00.000Z', starts_at: new Date(START).toISOString(), ends_at: new Date(END).toISOString(),
    ended_at: null, winner_id: null, ...over,
  };
}

export const playerRow = (user_id: string, over: Partial<MatchPlayer> = {}): MatchPlayer => ({
  match_id: 'm1', user_id, joined_at: null, finished_at: null, cats_used: null, result: null, ...over,
});

export const viewOf = (match: Match, players: MatchPlayer[] = [playerRow('me'), playerRow('you')]): MatchView => ({ match, players });

export interface FakeChannel extends MatchChannel {
  handlers: MatchChannelHandlers;
  sendProgress: Mock<(covered: number) => void>;
  close: Mock<() => void>;
}

/** Fake deps whose reads return whatever `state.view` holds at the time, and which remember the channel they opened. */
export function fakeDeps(view: MatchView | null): { deps: MatchDeps; state: { view: MatchView | null }; channels: FakeChannel[] } {
  const state = { view };
  const channels: FakeChannel[] = [];
  const deps: MatchDeps = {
    getMatch: vi.fn(async () => ok(state.view)),
    closeExpired: vi.fn(async () => ok(0)),
    submit: vi.fn(async () => ok(state.view ? state.view.match : matchRow())),
    forfeit: vi.fn(async () => ok(state.view ? state.view.match : matchRow())),
    accept: vi.fn(async () => ok(state.view ? state.view.match : matchRow())),
    decline: vi.fn(async () => ok(state.view ? state.view.match : matchRow())),
    profiles: vi.fn(async () => ok({ you: { id: 'you', username: 'rival' } })),
    openChannel: vi.fn((_matchId: string, _userId: string, handlers: MatchChannelHandlers) => {
      const ch: FakeChannel = { handlers, sendProgress: vi.fn<(covered: number) => void>(), close: vi.fn<() => void>() };
      channels.push(ch);
      return ch;
    }),
    now: () => Date.now(),
  };
  return { deps, state, channels };
}
