import { describe, expect, it } from 'vitest';
import type { Friendships } from '../../domain/types';
import { boardRows } from './boardRows';
import { bar, verdict } from './versus';
import { relationTo } from './relation';

const f: Friendships = {
  friends: [{ row: { id: '1', requester_id: 'me', addressee_id: 'a', status: 'accepted' }, person: { id: 'a', username: 'ann' } }],
  incoming: [{ row: { id: '2', requester_id: 'b', addressee_id: 'me', status: 'pending' }, person: { id: 'b' } }],
  outgoing: [{ row: { id: '3', requester_id: 'me', addressee_id: 'c', status: 'pending' }, person: { id: 'c' } }],
};

describe('relationTo', () => {
  it('classifies each link', () => {
    expect(relationTo(f, 'a')).toBe('friend');
    expect(relationTo(f, 'b')).toBe('incoming');
    expect(relationTo(f, 'c')).toBe('outgoing');
    expect(relationTo(f, 'z')).toBe('none');
    expect(relationTo(undefined, 'a')).toBe('none');
  });
});

describe('boardRows', () => {
  const rows = [{ user_id: 'me', name: 'meow', score: 9 }, { user_id: 'a', name: 'ann', score: 5 }, { user_id: 'q', name: '', score: 1 }];
  it('ranks, marks you, and finds a profile to open', () => {
    const r = boardRows(rows, f.friends, 'me');
    expect(r.map(x => x.rank)).toEqual([1, 2, 3]);
    expect(r[0]).toMatchObject({ name: 'meow (YOU)', isSelf: true });
    expect(r[1].person).toEqual({ id: 'a', username: 'ann' });
    expect(r[2]).toMatchObject({ name: 'STAFF', person: { id: 'q', username: '' } });
  });
});

describe('head to head', () => {
  it('fills the bigger side to 46 and the other in proportion', () => {
    expect(bar(10, 5)).toEqual([46, 23]);
    expect(bar(0, 0)).toEqual([0, 0]);
  });
  it('words the verdict', () => {
    expect(verdict(3, 3)).toBe('DEAD HEAT — SOMEBODY HIRE MORE CATS');
    expect(verdict(5, 3)).toBe('YOU’RE AHEAD BY 2 SITES');
    expect(verdict(3, 5)).toBe('BEHIND BY 2 SITES');
  });
});
