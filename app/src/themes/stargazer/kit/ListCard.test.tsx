import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ListCard, ListRow } from './ListCard';

describe('ListRow', () => {
  it('shows its badge and detail, and opens on click', async () => {
    const onClick = vi.fn();
    render(<ListCard><ListRow title="Friends" badge="1 request" detail={4} onClick={onClick} /></ListCard>);
    expect(screen.getByText('1 request')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Friends/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('swaps the chevron for an action label', () => {
    const { container, rerender } = render(<ListRow title="Voyage" onClick={vi.fn()} />);
    expect(container.querySelector('svg')).not.toBeNull();
    rerender(<ListRow title="Voyage" action="Fly to 15" onClick={vi.fn()} />);
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('Fly to 15')).toBeInTheDocument();
  });
});
