import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const board = vi.hoisted(() => ({ rows: undefined as unknown, loading: false }));
vi.mock('../../../../game/hooks/useSurvivalRanking', () => ({ useSurvivalBoard: () => board }));

const { RushLobby } = await import('./RushLobby');

const row = (user_id: string, username: string, sites: number) => ({ user_id, username, sites, perfect: 0, score: sites * 10 });

describe('RushLobby', () => {
  it('lists the leaderboard and starts the run on demand', () => {
    board.rows = [row('a', 'ann', 9), row('b', 'bob', 4)];
    const onStart = vi.fn();
    render(<RushLobby userId="b" best={null} onStart={onStart} onBack={() => {}} />);
    expect(screen.getByText('ann')).toBeTruthy();
    expect(screen.getByText('bob')).toBeTruthy();
    fireEvent.click(screen.getByText('Start rush'));
    expect(onStart).toHaveBeenCalledOnce();
  });
  it('says so when nobody has run yet', () => {
    board.rows = [];
    render(<RushLobby userId={null} best={null} onStart={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/No runs yet/)).toBeTruthy();
    expect(screen.getByText(/Sign in to rank/)).toBeTruthy();
  });
});
