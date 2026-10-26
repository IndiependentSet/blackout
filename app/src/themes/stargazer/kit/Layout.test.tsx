import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Split } from './Layout';

describe('Split', () => {
  it('keeps the page in reading order: before, lead, after (upright it lays out as if they were the column’s own)', () => {
    render(<Split before={<p>title</p>} lead={<p>drawing</p>} after={<p>actions</p>} />);
    const texts = screen.getAllByText(/title|drawing|actions/).map(e => e.textContent);
    expect(texts).toEqual(['title', 'drawing', 'actions']);
  });

  it('leaves out a part with nothing in it', () => {
    const { container } = render(<Split lead={<p>drawing</p>} />);
    expect(container.firstElementChild?.children).toHaveLength(1);
  });
});
