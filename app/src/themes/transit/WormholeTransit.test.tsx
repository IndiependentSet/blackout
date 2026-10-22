import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WormholeTransit } from './WormholeTransit';

afterEach(() => vi.unstubAllGlobals());

const film = () => screen.getByRole('dialog', { name: 'Wormhole transit' });

describe('WormholeTransit', () => {
  it('lets the player press autopilot, and the hire says the right button was the wrong planet', async () => {
    const onDone = vi.fn();
    render(<WormholeTransit onDone={onDone} startAt={3.6} />);
    await userEvent.click(screen.getByRole('button', { name: 'Engage autopilot' }));
    fireEvent.pointerDown(film());                         // skip to the last frame
    expect(screen.getByText(/Right button, wrong planet/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'CLOCK IN' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('presses the wrong button for a player who just skips', () => {
    render(<WormholeTransit onDone={() => {}} startAt={3.6} />);
    fireEvent.pointerDown(film());
    expect(screen.getByText(/Wrong button, right planet/)).toBeInTheDocument();
  });

  it('does not skip when the tap is on the console buttons', async () => {
    render(<WormholeTransit onDone={() => {}} startAt={3.6} />);
    await userEvent.click(screen.getByRole('button', { name: /Wormhole drive/ }));
    expect(screen.queryByRole('button', { name: 'CLOCK IN' })).toBeNull();
  });

  it('ignores taps before the console is up', () => {
    render(<WormholeTransit onDone={() => {}} startAt={1.9} />);
    fireEvent.pointerDown(film());
    expect(screen.queryByRole('button', { name: 'CLOCK IN' })).toBeNull();
  });

  it('leaves on Escape', async () => {
    const onDone = vi.fn();
    render(<WormholeTransit onDone={onDone} />);
    await userEvent.keyboard('{Escape}');
    expect(onDone).toHaveBeenCalled();
  });

  it('shows only the last frame for someone who prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduced-motion'), media: q, addEventListener: () => {}, removeEventListener: () => {},
    }));
    render(<WormholeTransit onDone={() => {}} />);
    expect(screen.getByRole('button', { name: 'CLOCK IN' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Engage autopilot' })).toBeNull();
  });
});
