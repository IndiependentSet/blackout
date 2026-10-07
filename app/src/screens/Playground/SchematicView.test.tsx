import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Level } from '../../domain/types';
import { SchematicView } from './SchematicView';

const level: Level = {
  nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }],
  edges: [[0, 1], [1, 2]], adj: [[1], [0, 2], [1]], k: 1, sol: [1], stars: 1,
};
const view = (props: Partial<Parameters<typeof SchematicView>[0]> = {}) => render(
  <SchematicView level={level} alt={null} crossings={[]} placed={[]} dimRest={false} labels="index" {...props} />);

describe('SchematicView', () => {
  it('reports which node was tapped', () => {
    const onTapNode = vi.fn();
    const { container } = view({ onTapNode });
    fireEvent.click(container.querySelectorAll('g')[2]);
    expect(onTapNode).toHaveBeenCalledWith(2);
  });

  it('marks placed cats and the edges they cover', () => {
    const { container } = view({ placed: [0] });
    expect(container.querySelectorAll('.covered')).toHaveLength(1);
    expect(container.querySelectorAll('.inSol')).toHaveLength(1);
  });

  it('is read-only without a tap handler', () => {
    const { container } = view();
    expect(container.querySelector('.hit')).toBeNull();
  });

  it('marks where another optimal cover differs from the solution', () => {
    const square: Level = {
      nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 1, r: 1 }, { c: 0, r: 1 }],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0]], adj: [[1, 3], [0, 2], [1, 3], [2, 0]], k: 2, sol: [0, 2], stars: 2,
    };
    const { container } = view({ level: square, alt: [1, 3] });
    expect(container.querySelectorAll('.inAlt')).toHaveLength(2);
    expect(container.querySelectorAll('.notAlt')).toHaveLength(2);
    expect(view({ level: square, alt: null }).container.querySelector('.inAlt')).toBeNull();
  });
});
