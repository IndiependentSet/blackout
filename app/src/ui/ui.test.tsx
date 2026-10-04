import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Button, GradeBadge, Panel } from '.';

describe('Button', () => {
  it('defaults to a primary medium type=button', () => {
    render(<Button>GO</Button>);
    const b = screen.getByRole('button', { name: 'GO' });
    expect(b).toHaveAttribute('type', 'button');
    expect(b.className).toContain('primary');
    expect(b.className).toContain('md');
  });
  it('fires onClick unless disabled', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>GO</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<Button onClick={onClick} disabled>GO</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Panel', () => {
  it('shows the tab header and content', () => {
    render(<Panel tab="STAFF ID CARD">hello</Panel>);
    expect(screen.getByText('STAFF ID CARD')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
  it('omits the tab when none is given', () => {
    render(<Panel>just a card</Panel>);
    expect(screen.queryByText('STAFF ID CARD')).toBeNull();
  });
});

describe('GradeBadge', () => {
  it('renders the grade with its colour class', () => {
    render(<GradeBadge grade="S" />);
    const el = screen.getByText('S');
    expect(el.className).toContain('S');
  });
});
