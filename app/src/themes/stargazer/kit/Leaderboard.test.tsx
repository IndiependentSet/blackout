import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BOARD_ROWS, toBoard, type BoardRowData } from '../../../domain/ranking';
import { Leaderboard, type LeaderboardProps } from './Leaderboard';

const row = (place: number, id: string, over: Partial<BoardRowData> = {}): BoardRowData =>
  ({ place, total: 3, user_id: id, username: id, avatar: null, value: 100 - place, extra: 2, is_me: false, ...over });

const base: LeaderboardProps = {
  kind: 'night', board: undefined, loading: false, error: null, audience: 'everyone', hasFriends: false,
  onAudience: vi.fn(), signedIn: true, onSignIn: vi.fn(),
};
const show = (over: Partial<LeaderboardProps>) => render(<Leaderboard {...base} {...over} />);

describe('Leaderboard', () => {
  it('says how the board is ordered', () => {
    show({ board: toBoard([]) });
    expect(screen.getByText(/Points from tonight’s skies/)).toBeInTheDocument();
  });

  it('lists the rows and pins the player’s place under them', () => {
    show({ board: toBoard([row(1, 'ann'), row(2, 'bob', { is_me: true }), row(3, 'cy')]) });
    expect(screen.getByRole('region', { name: 'Tonight leaderboard' })).toHaveTextContent('@ann');
    expect(screen.getByLabelText('your place')).toHaveTextContent('You · #2 of 3');
    expect(screen.getByLabelText('your place')).toHaveTextContent('98 pts');
  });

  it('shows the player below the cut once, with a gap standing for the players between', () => {
    const top = Array.from({ length: BOARD_ROWS }, (_, i) => row(i + 1, 'p' + i, { total: 300 }));
    show({ board: toBoard([...top, row(47, 'me', { total: 300, is_me: true })]) });
    expect(screen.queryAllByText('@me (you)')).toHaveLength(0);
    expect(screen.getByLabelText('your place')).toHaveTextContent('#47 of 300');
    expect(screen.getByText('⋯')).toBeInTheDocument();
  });

  it('tells a player who is not on the board how to get on it', () => {
    show({ board: toBoard([row(1, 'ann')]) });
    expect(screen.getByText('Chart a sky tonight to appear here.')).toBeInTheDocument();
    expect(screen.queryByLabelText('your place')).toBeNull();
  });

  it('offers sign-in to a signed-out player', async () => {
    const onSignIn = vi.fn();
    show({ board: toBoard([row(1, 'ann')]), signedIn: false, onSignIn });
    await userEvent.click(screen.getByRole('button', { name: 'Sign in to see your place' }));
    expect(onSignIn).toHaveBeenCalledOnce();
  });

  it('reads as loading, as an error, and as empty, each with the rule still showing', () => {
    const { rerender } = show({ loading: true });
    expect(screen.getByText('Reading the board…')).toBeInTheDocument();
    rerender(<Leaderboard {...base} error="offline" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t read the board. offline');
    rerender(<Leaderboard {...base} board={toBoard([])} />);
    expect(screen.getByText('Nobody has charted a sky tonight yet. Be the first.')).toBeInTheDocument();
    expect(screen.getByText(/Points from tonight’s skies/)).toBeInTheDocument();
  });

  it('switches between fellow stargazers and everyone only for a player who has friends', async () => {
    const onAudience = vi.fn();
    const { rerender } = show({ board: toBoard([row(1, 'ann')]), hasFriends: false });
    expect(screen.queryByRole('tab', { name: 'Everyone' })).toBeNull();
    rerender(<Leaderboard {...base} board={toBoard([row(1, 'ann')])} hasFriends audience="friends" onAudience={onAudience} />);
    expect(screen.getByRole('tab', { name: 'Fellow stargazers' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Everyone' }));
    expect(onAudience).toHaveBeenCalledWith('everyone');
  });

  it('words an empty circle differently from an empty board', () => {
    show({ board: toBoard([]), hasFriends: true, audience: 'friends' });
    expect(screen.getByText('None of your fellow stargazers are on this board yet.')).toBeInTheDocument();
  });

  it('lists the top rows and the ones around the player with a gap between, and the trend and record on a duel row', () => {
    show({
      kind: 'duel', around: true,
      board: toBoard([
        row(1, 'ann', { value: 1400, total: 40 }), row(2, 'bob', { value: 1390, total: 40 }),
        row(20, 'cy', { value: 1200, total: 40, trend: 18, won_vs: 4, lost_vs: 2 }),
        row(21, 'me', { value: 1190, total: 40, is_me: true, trend: -9 }),
        row(22, 'di', { value: 1180, total: 40, trend: 0, won_vs: 1, lost_vs: 3 }),
      ]),
    });
    expect(screen.getAllByText('⋯')).toHaveLength(1);
    expect(screen.getByText('You lead 4–2')).toBeInTheDocument();
    expect(screen.getByText('They lead 3–1')).toBeInTheDocument();
    expect(screen.getByLabelText('up 18 over the last five duels')).toBeInTheDocument();
    expect(screen.getAllByLabelText('down 9 over the last five duels')).toHaveLength(2); // in the list and on the pinned row
    expect(screen.queryByLabelText(/up 0|down 0/)).toBeNull();                          // no trend when the rating has not moved
  });

  it('offers to challenge a fellow stargazer from their row, never yourself or a stranger', async () => {
    const onChallenge = vi.fn();
    show({
      kind: 'duel', onChallenge, challengeable: new Set(['bob', 'me']),
      board: toBoard([row(1, 'ann'), row(2, 'bob'), row(3, 'me', { is_me: true })]),
    });
    expect(screen.getAllByRole('button', { name: /Challenge/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Challenge @bob' }));
    expect(onChallenge).toHaveBeenCalledWith(expect.objectContaining({ userId: 'bob' }));
  });

  it('says how far a newcomer is from the ladder instead of the board’s own line', () => {
    show({ kind: 'duel', board: toBoard([row(1, 'ann')]), joinText: '3 of 5 ranked duels to appear on the ladder.' });
    expect(screen.getByText('3 of 5 ranked duels to appear on the ladder.')).toBeInTheDocument();
  });

  it('puts the season’s days left beside its rule', () => {
    show({ kind: 'season', board: toBoard([]), note: 'October · 9 days left' });
    expect(screen.getByText('October · 9 days left')).toBeInTheDocument();
  });
});
