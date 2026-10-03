import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Friendships } from '../../domain/types';
import { fail, ok } from '../../services/result';

const repo = vi.hoisted(() => ({
  getFriendships: vi.fn(), requestFriend: vi.fn(), acceptFriend: vi.fn(), removeFriendship: vi.fn(),
  getProfile: vi.fn(), searchPlayers: vi.fn(),
  getPlayerScore: vi.fn(), getBoardFor: vi.fn(),
  getMySquads: vi.fn(), createSquad: vi.fn(), joinSquadByCode: vi.fn(), leaveSquad: vi.fn(), getSquadMembers: vi.fn(),
}));
vi.mock('../../services/repositories/friendships', () => ({
  getFriendships: repo.getFriendships, requestFriend: repo.requestFriend, acceptFriend: repo.acceptFriend, removeFriendship: repo.removeFriendship,
}));
vi.mock('../../services/repositories/profiles', () => ({ getProfile: repo.getProfile, searchPlayers: repo.searchPlayers }));
vi.mock('../../services/repositories/leaderboards', () => ({ getPlayerScore: repo.getPlayerScore, getBoardFor: repo.getBoardFor }));
vi.mock('../../services/repositories/squads', () => ({
  getMySquads: repo.getMySquads, createSquad: repo.createSquad, joinSquadByCode: repo.joinSquadByCode,
  leaveSquad: repo.leaveSquad, getSquadMembers: repo.getSquadMembers,
}));

const { CrewScreen } = await import('./CrewScreen');

const ann = { id: 'a', username: 'ann' }, bob = { id: 'b', username: 'bob' };
const friendships = (over: Partial<Friendships> = {}): Friendships => ({ friends: [], incoming: [], outgoing: [], ...over });

beforeEach(() => {
  vi.clearAllMocks();
  repo.getProfile.mockResolvedValue(ok({ id: 'me', username: 'meow', invite_code: 'CAT-AAAA' }));
  repo.getPlayerScore.mockResolvedValue(ok({ user_id: 'x', name: '', score: 4, week_score: 2 }));
  repo.getBoardFor.mockResolvedValue(ok([{ user_id: 'me', name: 'meow', score: 9 }, { user_id: 'a', name: 'ann', score: 5 }]));
  repo.getMySquads.mockResolvedValue(ok([]));
  repo.getSquadMembers.mockResolvedValue(ok([]));
  repo.getFriendships.mockResolvedValue(ok(friendships()));
  repo.requestFriend.mockResolvedValue(ok(null));
  repo.acceptFriend.mockResolvedValue(ok(null));
  repo.removeFriendship.mockResolvedValue(ok(null));
});

const open = (onClose = () => {}) => render(<CrewScreen userId="me" onClose={onClose} />);

describe('Crew roster', () => {
  it('shows an empty crew with your invite code', async () => {
    open();
    expect(await screen.findByText(/NO WORKMATES YET/)).toBeInTheDocument();
    expect(screen.getAllByText('CAT-AAAA').length).toBeGreaterThan(0);
  });

  it('ranks you against your workmates', async () => {
    repo.getFriendships.mockResolvedValue(ok(friendships({ friends: [{ row: { id: '1', requester_id: 'me', addressee_id: 'a', status: 'accepted' }, person: ann }] })));
    open();
    expect(await screen.findByText('meow (YOU)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ann' })).toBeInTheDocument();
  });

  it('badges and answers incoming requests', async () => {
    repo.getFriendships.mockResolvedValue(ok(friendships({ incoming: [{ row: { id: '9', requester_id: 'b', addressee_id: 'me', status: 'pending' }, person: bob }] })));
    open();
    expect(await screen.findByText('TRANSFER REQUESTS')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'ACCEPT' }));
    await waitFor(() => expect(repo.acceptFriend).toHaveBeenCalledWith('9'));
    await waitFor(() => expect(repo.getFriendships).toHaveBeenCalledTimes(2));    // reloaded after the write
  });

  it('declining deletes the request', async () => {
    repo.getFriendships.mockResolvedValue(ok(friendships({ incoming: [{ row: { id: '9', requester_id: 'b', addressee_id: 'me', status: 'pending' }, person: bob }] })));
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'DECLINE' }));
    await waitFor(() => expect(repo.removeFriendship).toHaveBeenCalledWith('9'));
  });

  it('searches and sends a request', async () => {
    repo.searchPlayers.mockResolvedValue(ok([bob]));
    open();
    await userEvent.type(await screen.findByPlaceholderText(/handle or code/), 'bo');
    await userEvent.click(screen.getByRole('button', { name: 'SEARCH' }));
    expect(repo.searchPlayers).toHaveBeenCalledWith('bo', 'me');
    await userEvent.click(await screen.findByRole('button', { name: 'ADD' }));
    expect(repo.requestFriend).toHaveBeenCalledWith('me', 'b');
  });

  it('says so when nobody matches', async () => {
    repo.searchPlayers.mockResolvedValue(ok([]));
    open();
    await userEvent.type(await screen.findByPlaceholderText(/handle or code/), 'zz');
    await userEvent.click(screen.getByRole('button', { name: 'SEARCH' }));
    expect(await screen.findByText('NOBODY ON FILE UNDER THAT NAME.')).toBeInTheDocument();
  });

  it('drills into a workmate, compares head to head, and backs out', async () => {
    repo.getFriendships.mockResolvedValue(ok(friendships({ friends: [{ row: { id: '1', requester_id: 'me', addressee_id: 'a', status: 'accepted' }, person: ann }] })));
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'ann' }));
    expect(await screen.findByText('PERSONNEL FILE')).toBeInTheDocument();
    expect(screen.getByText('ON YOUR CREW')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'HEAD TO HEAD' }));
    expect(await screen.findByText('SITE-BY-SITE COMPARISON')).toBeInTheDocument();
    expect(screen.getByText('DEAD HEAT — SOMEBODY HIRE MORE CATS')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /BACK/ }));
    expect(screen.getByText('PERSONNEL FILE')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /BACK/ }));
    expect(screen.getByText('FIND A WORKMATE')).toBeInTheDocument();
  });

  it('closes from the top level', async () => {
    const onClose = vi.fn();
    open(onClose);
    await userEvent.click(await screen.findByRole('button', { name: /BACK TO SITE/ }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Squads', () => {
  const squad = { id: 's1', name: 'Night Shift', invite_code: 'SITE-1234', created_by: 'me' };

  it('lists your squads', async () => {
    repo.getMySquads.mockResolvedValue(ok([{ ...squad, role: 'foreman', members: 3 }]));
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'SQUADS' }));
    expect(await screen.findByText('Night Shift')).toBeInTheDocument();
    expect(screen.getByText('3 MEMBERS · FOREMAN')).toBeInTheDocument();
  });

  it('creates a squad and opens it with its invite code', async () => {
    repo.createSquad.mockResolvedValue(ok(squad));
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'SQUADS' }));
    await userEvent.type(screen.getByPlaceholderText('Night Shift Wreckers'), 'Night Shift');
    await userEvent.click(screen.getByRole('button', { name: /CREATE/ }));
    expect(repo.createSquad).toHaveBeenCalledWith('me', 'Night Shift');
    expect(await screen.findByText('SITE-1234')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /LEAVE SQUAD \(YOU’RE FOREMAN\)/ })).toBeInTheDocument();
  });

  it('shows why a join failed', async () => {
    repo.joinSquadByCode.mockResolvedValue(fail('NO SQUAD WITH THAT CODE.'));
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'SQUADS' }));
    await userEvent.type(screen.getByPlaceholderText('SITE-4M9X'), 'site-0000');
    await userEvent.click(screen.getByRole('button', { name: 'CLOCK ON TO SQUAD' }));
    expect(await screen.findByText('NO SQUAD WITH THAT CODE.')).toBeInTheDocument();
    expect(repo.joinSquadByCode).toHaveBeenCalledWith('me', 'SITE-0000');
  });

  it('leaves a squad and returns to the list', async () => {
    repo.getMySquads.mockResolvedValue(ok([{ ...squad, role: 'member', members: 2 }]));
    repo.leaveSquad.mockResolvedValue(ok(null));
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'SQUADS' }));
    await userEvent.click(await screen.findByText('Night Shift'));
    await userEvent.click(await screen.findByRole('button', { name: 'LEAVE SQUAD' }));
    expect(repo.leaveSquad).toHaveBeenCalledWith('me', 's1');
    expect(await screen.findByText('YOUR SQUADS')).toBeInTheDocument();
  });
});
