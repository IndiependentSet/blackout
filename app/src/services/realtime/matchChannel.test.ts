import { describe, expect, it, vi } from 'vitest';

vi.mock('../supabase/client', () => ({ supabase: {} }));

const { openInboxChannel, openMatchChannel } = await import('./matchChannel');

type Listener = (payload: unknown) => void;

/* A channel that remembers what was registered, so a test can fire events at it. */
function fakeClient() {
  const listeners: { type: string; filter: Record<string, unknown>; fire: Listener }[] = [];
  const sent: unknown[] = [];
  const tracked: unknown[] = [];
  let status: ((s: string) => void) | undefined;
  let presence: Record<string, unknown> = {};
  const channel = {
    on(type: string, filter: Record<string, unknown>, fire: Listener) { listeners.push({ type, filter, fire }); return channel; },
    subscribe(cb?: (s: string) => void) { status = cb; return channel; },
    track(p: Record<string, unknown>) { tracked.push(p); return Promise.resolve(); },
    presenceState: () => presence,
    send(m: unknown) { sent.push(m); return Promise.resolve(); },
  };
  const client = { channel: vi.fn(() => channel), removeChannel: vi.fn(() => Promise.resolve()) };
  return {
    client, sent, tracked, listeners,
    join: () => status?.('SUBSCRIBED'),
    setPresence: (p: Record<string, unknown>) => { presence = p; },
    fire: (type: string, event?: string, payload?: unknown) =>
      listeners.filter(l => l.type === type && (event === undefined || l.filter.event === event)).forEach(l => l.fire(payload)),
  };
}

const handlers = () => ({ onPresence: vi.fn(), onProgress: vi.fn(), onChange: vi.fn() });

describe('openMatchChannel', () => {
  it('names the channel by the match and keys presence by the player', () => {
    const f = fakeClient();
    openMatchChannel('m1', 'me', handlers(), f.client);
    expect(f.client.channel).toHaveBeenCalledWith('match:m1', { config: { presence: { key: 'me' }, broadcast: { self: false } } });
  });

  it('listens to the two tables of this match only', () => {
    const f = fakeClient();
    openMatchChannel('m1', 'me', handlers(), f.client);
    const filters = f.listeners.filter(l => l.type === 'postgres_changes').map(l => [l.filter.table, l.filter.filter]);
    expect(filters).toEqual([['matches', 'id=eq.m1'], ['match_players', 'match_id=eq.m1']]);
  });

  it('reports who is present when presence syncs', () => {
    const f = fakeClient(), h = handlers();
    openMatchChannel('m1', 'me', h, f.client);
    f.setPresence({ me: [{}], you: [{}] });
    f.fire('presence');
    expect(h.onPresence).toHaveBeenCalledWith(['me', 'you']);
  });

  it('announces itself and re-reads the match once joined', () => {
    const f = fakeClient(), h = handlers();
    openMatchChannel('m1', 'me', h, f.client);
    expect(f.tracked).toHaveLength(0);
    f.join();
    expect(f.tracked).toEqual([{ userId: 'me' }]);
    expect(h.onChange).toHaveBeenCalledOnce();
  });

  it('passes a server change on as "read it again"', () => {
    const f = fakeClient(), h = handlers();
    openMatchChannel('m1', 'me', h, f.client);
    f.fire('postgres_changes');
    expect(h.onChange).toHaveBeenCalledTimes(2);
  });

  it('passes the opponent\'s progress on, and ignores echoes, junk and negatives', () => {
    const f = fakeClient(), h = handlers();
    openMatchChannel('m1', 'me', h, f.client);
    const fire = (payload: unknown) => f.fire('broadcast', 'progress', { payload });
    fire({ userId: 'you', covered: 4 });
    fire({ userId: 'me', covered: 9 });
    fire({ userId: 'you', covered: 'lots' });
    fire({ userId: 'you', covered: NaN });
    fire({ covered: 3 });
    fire(undefined);
    fire({ userId: 'you', covered: -2 });
    fire({ userId: 'you', covered: 2.9 });
    expect(h.onProgress.mock.calls).toEqual([['you', 4], ['you', 0], ['you', 2]]);
  });

  it('sends progress only after joining, and as a bare number', () => {
    const f = fakeClient();
    const ch = openMatchChannel('m1', 'me', handlers(), f.client);
    ch.sendProgress(1);
    expect(f.sent).toHaveLength(0);
    f.join();
    ch.sendProgress(3);
    expect(f.sent).toEqual([{ type: 'broadcast', event: 'progress', payload: { userId: 'me', covered: 3 } }]);
  });

  it('leaves the channel once, however many times it is closed, and then stays silent', () => {
    const f = fakeClient();
    const ch = openMatchChannel('m1', 'me', handlers(), f.client);
    f.join();
    ch.close();
    ch.close();
    expect(f.client.removeChannel).toHaveBeenCalledOnce();
    ch.sendProgress(5);
    expect(f.sent).toHaveLength(0);
  });

  it('does not announce itself if it was closed before the join finished', () => {
    const f = fakeClient(), h = handlers();
    const ch = openMatchChannel('m1', 'me', h, f.client);
    ch.close();
    f.join();
    expect(f.tracked).toHaveLength(0);
    expect(h.onChange).not.toHaveBeenCalled();
  });
});

describe('openInboxChannel', () => {
  it('watches challenges sent to and by the player', () => {
    const f = fakeClient(), onChange = vi.fn();
    openInboxChannel('me', onChange, f.client);
    expect(f.listeners.map(l => l.filter.filter)).toEqual(['opponent_id=eq.me', 'created_by=eq.me']);
    f.fire('postgres_changes');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('leaves once when stopped', () => {
    const f = fakeClient();
    const stop = openInboxChannel('me', vi.fn(), f.client);
    stop();
    stop();
    expect(f.client.removeChannel).toHaveBeenCalledOnce();
  });
});
