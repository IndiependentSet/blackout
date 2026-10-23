import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { toBoard, type BoardRowData } from '../../../../domain/ranking';

const state = vi.hoisted(() => ({
  board: undefined as unknown, loading: false, error: null as string | null, audience: 'everyone', hasFriends: false,
  setAudience: () => {}, reload: () => {},
}));
vi.mock('../../../../game/hooks/useBoard', () => ({ useBoard: () => state }));

const { RushLobby } = await import('./RushLobby');

const row = (place: number, id: string, username: string, sites: number, isMe = false): BoardRowData =>
  ({ place, total: 2, user_id: id, username, avatar: null, value: sites, extra: sites * 10, is_me: isMe });

describe('RushLobby', () => {
  it('lists the leaderboard, pins the player’s place and starts the run on demand', () => {
    state.board = toBoard([row(1, 'a', 'ann', 9), row(2, 'b', 'bob', 4, true)]);
    const onStart = vi.fn();
    render(<RushLobby userId="b" best={null} onStart={onStart} onBack={() => {}} onSignIn={() => {}} />);
    expect(screen.getByText('@ann')).toBeTruthy();
    expect(screen.getByLabelText('your place').textContent).toContain('#2 of 2');
    fireEvent.click(screen.getByText('Start rush'));
    expect(onStart).toHaveBeenCalledOnce();
  });
  it('says so when nobody has run yet, and offers sign-in to a signed-out player', () => {
    state.board = toBoard([]);
    const onSignIn = vi.fn();
    render(<RushLobby userId={null} best={null} onStart={() => {}} onBack={() => {}} onSignIn={onSignIn} />);
    expect(screen.getByText(/No runs yet/)).toBeTruthy();
    fireEvent.click(screen.getByText('Sign in to see your place'));
    expect(onSignIn).toHaveBeenCalledOnce();
  });
});
