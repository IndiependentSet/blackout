import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuthState } from '../../../../services/auth/authContext';

const repo = vi.hoisted(() => ({ setUsername: vi.fn() }));
vi.mock('../../../../services/repositories/profiles', () => ({ setUsername: repo.setUsername }));

const { ProfileEditor } = await import('./ProfileEditor');

const auth = { userId: 'me', username: 'vega', avatar: null, setHandle: vi.fn(), setAvatar: vi.fn() } as unknown as AuthState;

describe('ProfileEditor', () => {
  it('saves a new handle and goes back', async () => {
    repo.setUsername.mockResolvedValue({ ok: true, data: 'altair' });
    const onDone = vi.fn();
    render(<ProfileEditor userId="me" auth={auth} onDone={onDone} />);
    const input = screen.getByRole('textbox', { name: 'Your handle' });
    expect(input).toHaveValue('vega');
    await userEvent.clear(input);
    await userEvent.type(input, 'altair');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(repo.setUsername).toHaveBeenCalledWith('me', 'altair');
    expect(auth.setHandle).toHaveBeenCalledWith('altair');
    expect(onDone).toHaveBeenCalled();
  });

  it('goes back on Cancel without saving, and offers the pictures', async () => {
    const onDone = vi.fn();
    render(<ProfileEditor userId="me" auth={auth} onDone={onDone} />);
    expect(screen.getByRole('button', { name: 'Use my own photo' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDone).toHaveBeenCalled();
  });
});
