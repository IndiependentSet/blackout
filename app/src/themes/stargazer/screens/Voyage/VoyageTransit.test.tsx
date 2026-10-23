import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoyageTransit } from './VoyageTransit';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const flight = (planet: string) => screen.getByRole('dialog', { name: `Flying to ${planet}` });

describe('VoyageTransit', () => {
  it('names the world it flies to', () => {
    render(<VoyageTransit from={2} to={3} onDone={() => {}} />);
    expect(flight('Mars')).toBeInTheDocument();
  });

  it('joins on the screen of the world just charted', () => {
    render(<VoyageTransit from={0} to={1} onDone={() => {}} />);
    expect(screen.getByRole('heading', { name: 'The Moon' })).toBeInTheDocument();
    expect(screen.getByText('10 / 10')).toBeInTheDocument();
  });

  it('a tap during the cruise jumps to the new chapter', () => {
    render(<VoyageTransit from={0} to={1} onDone={() => {}} startAt={4} />);
    expect(screen.queryByRole('heading', { name: 'Mercury' })).toBeNull();
    fireEvent.pointerDown(flight('Mercury'));
    expect(screen.getByRole('heading', { name: 'Mercury' })).toBeInTheDocument();
    expect(screen.getByText('0 / 12')).toBeInTheDocument();
  });

  it('a tap in the first beat does nothing', () => {
    render(<VoyageTransit from={0} to={1} onDone={() => {}} />);
    fireEvent.pointerDown(flight('Mercury'));
    expect(screen.queryByRole('heading', { name: 'Mercury' })).toBeNull();
  });

  it('is done when the clock runs out', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<VoyageTransit from={0} to={1} onDone={onDone} startAt={8.85} />);
    act(() => { vi.advanceTimersByTime(200); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('leaves on Escape', async () => {
    const onDone = vi.fn();
    render(<VoyageTransit from={0} to={1} onDone={onDone} />);
    await userEvent.keyboard('{Escape}');
    expect(onDone).toHaveBeenCalled();
  });

  it('shows only the arrival for someone who prefers reduced motion, then hands over', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduced-motion'), media: q, addEventListener: () => {}, removeEventListener: () => {},
    }));
    const onDone = vi.fn();
    render(<VoyageTransit from={0} to={1} onDone={onDone} />);
    expect(screen.getByRole('heading', { name: 'Mercury' })).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(800); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
