import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase/client', () => ({
  APP_BASE_URL: 'http://localhost',
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: () => Promise.resolve(),
    },
    /* the reads a signed-out player makes: today's published week and generation config (neither saved here) */
    from: (table: string) => {
      if (table === 'daily_levels') {
        const published = { select: () => published, eq: () => published, order: () => Promise.resolve({ data: [], error: null }) };
        return published;
      }
      if (table !== 'generation_configs') throw new Error('signed-out play must only read the daily week and the generation config');
      const query = { select: () => query, eq: () => query, lte: () => query, order: () => query,
        limit: () => Promise.resolve({ data: [], error: null }) };
      return query;
    },
  },
}));

/* jsdom has no Worker: the device-built week comes from a small stand-in (the real one is a worker call) */
vi.mock('../services/generation/scheduleClient', async () => {
  const { generate } = await import('../domain/generation');
  const { ok } = await import('../services/result');
  return { siteLevelAsync: async (_s: unknown, seed: number, idx: number) =>
    ok(generate({ seed: seed + idx, size: 6, diff: 1, options: { clock: false } }).level) };
});

const { default: App } = await import('./App');

beforeEach(() => { sessionStorage.clear(); window.history.replaceState(null, '', '/'); });

const hudReads = () => {
  const label = screen.getByText('cats hired');
  return (label.previousElementSibling as HTMLElement).textContent;
};

describe('the hidden CATASTROPHE INC. look, signed out', () => {
  beforeEach(() => { window.history.replaceState(null, '', '/?skin=catastrophe'); });

  it('opens on the dashboard, with the orientation for a first-time visitor', async () => {
    render(<App />);
    expect(screen.getByText(/DAILY SHIFT #/)).toBeInTheDocument();
    expect(await screen.findByRole('dialog', { name: /How CATASTROPHE INC. works/ })).toBeInTheDocument();
  });

  it('shows the orientation once per browser session', async () => {
    const first = render(<App />);
    await screen.findByRole('dialog');
    first.unmount();
    render(<App />);
    await waitFor(() => expect(screen.getByText(/DAILY SHIFT #/)).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clocks in, plays a hire from the keyboard, and recalls it', async () => {
    sessionStorage.setItem('cc-howto-seen', '1');
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'OPEN WORK ORDER' }));
    await userEvent.click(screen.getByRole('button', { name: 'CLOCK IN' }));

    expect(await screen.findByRole('application', { name: 'cat cover grid' }, { timeout: 15000 })).toBeInTheDocument();
    await waitFor(() => expect(hudReads()).toMatch(/^0\/\d+$/), { timeout: 15000 });

    await userEvent.keyboard('{Enter}');                  // hire on the focused pad
    expect(hudReads()).toMatch(/^1\/\d+$/);
    await userEvent.keyboard('{Enter}');                  // tap again: recall
    expect(hudReads()).toMatch(/^0\/\d+$/);
  }, 40000);

  it('shows the site plaque and lets you re-read the work order', async () => {
    sessionStorage.setItem('cc-howto-seen', '1');
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'OPEN WORK ORDER' }));
    await userEvent.click(screen.getByRole('button', { name: 'CLOCK IN' }));
    expect(await screen.findByText('THE STUDIO FLAT')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'RE-READ WORK ORDER' }));
    expect(screen.getByText(/WORK ORDER #/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'CLOCK IN' }));
    await screen.findByRole('application', {}, { timeout: 15000 });
    expect(screen.getByText('THE STUDIO FLAT')).toBeInTheDocument();
  }, 40000);

  it('goes from the dashboard to the work order and back', async () => {
    sessionStorage.setItem('cc-howto-seen', '1');
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'OPEN WORK ORDER' }));
    expect(screen.getByText(/WORK ORDER #/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'BACK' }));
    expect(screen.getByText(/DAILY SHIFT #/)).toBeInTheDocument();
  });

  it('sends a signed-out player who picks the campaign to the staff office', async () => {
    sessionStorage.setItem('cc-howto-seen', '1');
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'SIGN IN' }));
    expect(screen.queryByText(/DAILY SHIFT #/)).toBeNull();
  });
});


describe('Stargazer, the default look, signed out', () => {
  it('opens on the first night for a first-time visitor, then on tonight', async () => {
    render(<App />);
    expect(await screen.findByText('The sky is full of figures no one has named.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'I’ve played before' }));
    expect(screen.getByText(/of 7 skies charted/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start tonight' })).toBeInTheDocument();
  });

  it('starts tonight from the first night and lights a star from the keyboard', async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Start my first sky' }));
    expect(screen.getByText('Sky 1 of 7')).toBeInTheDocument();
    await screen.findByRole('group', { name: 'Sky' }, { timeout: 15000 });
    const lit = () => screen.getByText(/stars? lit/).previousElementSibling?.textContent;
    expect(lit()).toBe('0');
    await userEvent.keyboard('{Enter}');
    expect(lit()).toBe('1');
    await userEvent.keyboard('{Enter}');
    expect(lit()).toBe('0');
  }, 40000);

  it('sends a signed-out player who opens the voyage to sign in', async () => {
    sessionStorage.setItem('cc-howto-seen', '1');
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Voyage/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText(/Sign in to keep your atlas/)).toBeInTheDocument();
  });

  it('flies through the wormhole after seven quick taps on the title, lands on the cats, and comes back', async () => {
    sessionStorage.setItem('cc-howto-seen', '1');
    render(<App />);
    const title = screen.getByRole('button', { name: 'Stargazer' });
    for (let i = 0; i < 7; i++) await userEvent.click(title);
    const film = await screen.findByRole('dialog', { name: 'Wormhole transit' });
    expect(window.location.search).toBe('');             // not there yet

    /* a tap anywhere but on the console skips to the last frame (once the console is up, about a second after boarding) */
    await waitFor(() => {
      fireEvent.pointerDown(film);
      expect(screen.getByRole('button', { name: 'CLOCK IN' })).toBeInTheDocument();
    }, { timeout: 4000 });
    expect(screen.getByText(/Wrong button, right planet/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'CLOCK IN' }));

    expect(await screen.findByText(/DAILY SHIFT #/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Wormhole transit' })).toBeNull();
    expect(window.location.search).toBe('?skin=catastrophe');
    await userEvent.click(screen.getByRole('button', { name: /Back to Stargazer/ }));
    expect(screen.getByRole('button', { name: 'Stargazer' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('leaves the transit at once on Escape', async () => {
    sessionStorage.setItem('cc-howto-seen', '1');
    render(<App />);
    const title = screen.getByRole('button', { name: 'Stargazer' });
    for (let i = 0; i < 7; i++) await userEvent.click(title);
    await screen.findByRole('dialog', { name: 'Wormhole transit' });
    await userEvent.keyboard('{Escape}');
    expect(await screen.findByText(/DAILY SHIFT #/)).toBeInTheDocument();
  });
});
