import { render, screen, waitFor } from '@testing-library/react';
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
    from: () => { throw new Error('signed-out play must not touch the database'); },
  },
}));

const { default: App } = await import('./App');

beforeEach(() => { sessionStorage.clear(); });

const hudReads = () => {
  const label = screen.getByText('cats hired');
  return (label.previousElementSibling as HTMLElement).textContent;
};

describe('the app, signed out', () => {
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

