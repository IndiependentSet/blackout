import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Level } from '../../../domain/types';
import { SkyBoard } from './SkyBoard';
import { SkyStage } from './SkyStage';

const path: Level = {
  nodes: [{ c: 2, r: 5 }, { c: 3, r: 5 }, { c: 4, r: 5 }],
  edges: [[0, 1], [1, 2]], adj: [[1], [0, 2], [1]], k: 1, sol: [1], stars: 1,
};
const star: Level = {
  nodes: [{ c: 1, r: 1 }, { c: 2, r: 1 }, { c: 1, r: 2 }, { c: 2, r: 2 }],
  edges: [[0, 1], [0, 2], [0, 3]], adj: [[1, 2, 3], [0], [0], [0]], k: 1, sol: [0], stars: 1,
};

function Stage({ level, slot, placed = [], onTap = () => {} }: { level: Level; slot: number; placed?: number[]; onTap?: (n: number) => void }) {
  return (
    <SkyStage level={level} placed={placed} slot={slot} pace="full" wide={false}>
      <SkyBoard level={level} placed={placed} sweep={false} ring={null} focus={null} onTapStar={onTap} />
    </SkyStage>
  );
}

const skies = () => document.querySelectorAll('svg[aria-label="Sky"]');

describe('SkyStage', () => {
  let frames: FrameRequestCallback[] = [];
  beforeEach(() => {
    frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.push(cb); return frames.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 360, height: 420, x: 0, y: 0, top: 0, left: 0, right: 360, bottom: 420, toJSON: () => ({}) });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  /** run the clock on by `seconds` in one step, then let it settle */
  const run = (from: number, seconds: number) => act(() => {
    const now = frames.splice(0);
    now.forEach(f => f(from));
    const next = frames.splice(0);
    next.forEach(f => f(from + seconds * 1000));
  });

  it('shows the first sky without a slew', () => {
    render(<Stage level={path} slot={0} />);
    expect(skies()).toHaveLength(1);
  });

  it('slews from the charted sky to the next: both on the board, then only the new one', () => {
    const { rerender } = render(<Stage level={path} slot={0} placed={[1]} />);
    rerender(<Stage level={star} slot={1} />);
    expect(skies()).toHaveLength(2);
    expect(skies()[0].querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);   // the old sky keeps its lit star
    for (let i = 0; i < 30; i++) run(i * 100, 0.1);
    expect(skies()).toHaveLength(1);
  });

  it('a tap mid-slew skips to the end and never reaches the new sky', () => {
    const onTap = vi.fn();
    const { rerender } = render(<Stage level={path} slot={0} onTap={onTap} />);
    rerender(<Stage level={star} slot={1} onTap={onTap} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Star 1' }).at(-1)!);
    expect(onTap).not.toHaveBeenCalled();
    expect(skies()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Star 1' }));
    expect(onTap).toHaveBeenCalledWith(0);
  });

  it('does not slew when the same sky is redrawn', () => {
    const { rerender } = render(<Stage level={path} slot={0} />);
    rerender(<Stage level={{ ...path }} slot={0} placed={[1]} />);
    expect(skies()).toHaveLength(1);
  });

  it('does not slew for someone who prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduced-motion'), media: q, addEventListener: () => {}, removeEventListener: () => {} }));
    const { rerender } = render(<Stage level={path} slot={0} />);
    rerender(<Stage level={star} slot={1} />);
    expect(skies()).toHaveLength(1);
  });
});
