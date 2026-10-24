import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toBoard } from '../../../../domain/ranking';

const useBoard = vi.hoisted(() => vi.fn());
const progress = vi.hoisted(() => ({ value: null as null | { games: number; seasonGames: number } }));
vi.mock('../../../../game/hooks/useBoard', () => ({ useBoard }));
vi.mock('../../../../game/hooks/useLadderProgress', () => ({ useLadderProgress: () => progress.value }));

const { BoardPanel } = await import('./BoardPanel');

const state = (over = {}) => ({
  board: toBoard([{ place: 1, total: 1, user_id: 'a', username: 'ann', avatar: null, value: 1400, extra: 9, is_me: false }]),
  loading: false, error: null, audience: 'everyone', hasFriends: false, friendIds: new Set(['a']), setAudience: () => {}, reload: () => {}, ...over,
});

beforeEach(() => { useBoard.mockReset(); useBoard.mockReturnValue(state()); progress.value = null; });

describe('BoardPanel, the ladder', () => {
  it('reads the top few and the players around the reader', () => {
    render(<BoardPanel kind="duel" userId="me" />);
    expect(useBoard).toHaveBeenCalledWith(expect.objectContaining({ kind: 'duel', limit: 3, around: 3, enabled: true }));
  });

  it('reads an ordinary board as a plain top list', () => {
    render(<BoardPanel kind="rush" userId="me" />);
    expect(useBoard).toHaveBeenCalledWith(expect.objectContaining({ kind: 'rush', around: undefined }));
  });

  it('does not read a signed-in board for a signed-out player, and offers sign-in', async () => {
    const onSignIn = vi.fn();
    render(<BoardPanel kind="season" userId={null} day={412} onSignIn={onSignIn} />);
    expect(useBoard).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    expect(screen.getByText(/is for signed-in stargazers/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledOnce();
  });

  it('says how many ranked duels a newcomer still needs, and which month the season is', () => {
    progress.value = { games: 3, seasonGames: 1 };
    const { rerender } = render(<BoardPanel kind="duel" userId="me" />);
    expect(screen.getByText('3 of 5 ranked duels to appear on the ladder.')).toBeInTheDocument();
    useBoard.mockReturnValue(state());
    rerender(<BoardPanel kind="season" userId="me" day={412} />);
    expect(screen.getByText('1 of 3 ranked duels to appear this month.')).toBeInTheDocument();
    expect(screen.getByText(/days left|last day/)).toBeInTheDocument();
  });

  it('offers to challenge a fellow stargazer only when the page can start a challenge', async () => {
    const onChallenge = vi.fn();
    const { rerender } = render(<BoardPanel kind="duel" userId="me" />);
    expect(screen.queryByRole('button', { name: /Challenge/ })).toBeNull();
    rerender(<BoardPanel kind="duel" userId="me" onChallenge={onChallenge} />);
    await userEvent.click(screen.getByRole('button', { name: 'Challenge @ann' }));
    expect(onChallenge).toHaveBeenCalledWith('a');
  });
});
