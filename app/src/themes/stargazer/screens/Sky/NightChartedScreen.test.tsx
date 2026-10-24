import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Level, SiteResult } from '../../../../domain/types';
import type { SkyNames } from '../../../../game/hooks/useSkyNames';
import { NightChartedScreen } from './NightChartedScreen';

const level: Level = {
  nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }], edges: [[0, 1], [1, 2]], adj: [[1], [0, 2], [1]], k: 1, sol: [1], stars: 1,
};
const par = { status: 'perfect', used: 1, par: 1 } as SiteResult;
const atlas = (over: Partial<SkyNames> = {}): SkyNames => ({ names: [], loading: false, error: null, saving: false, name: vi.fn(async () => null), ...over });
const base = { day: 412, results: [par, par], figure: level, streak: 3, onSignIn: vi.fn(), onBack: vi.fn() };

describe('NightChartedScreen', () => {
  it('names the night’s figure, with its stars and lines but not its answer', async () => {
    const a = atlas();
    const onSaved = vi.fn();
    render(<NightChartedScreen {...base} signedIn atlas={a} onSaved={onSaved} />);
    expect(screen.getByText('You found a new constellation.')).toBeInTheDocument();
    const input = screen.getByLabelText('Name it');
    await userEvent.clear(input);
    await userEvent.type(input, '  The Teacup  ');
    await userEvent.click(screen.getByRole('button', { name: 'Add to my atlas' }));
    expect(a.name).toHaveBeenCalledWith(412, 'The Teacup', { nodes: level.nodes, edges: level.edges });
    expect(onSaved).toHaveBeenCalled();
  });

  it('shows what went wrong and stays put when the save fails', async () => {
    const a = atlas({ name: vi.fn(async () => 'network down') });
    const onSaved = vi.fn();
    render(<NightChartedScreen {...base} signedIn atlas={a} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add to my atlas' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('network down');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('asks a signed-out player to sign in to keep it', async () => {
    const onSignIn = vi.fn();
    render(<NightChartedScreen {...base} signedIn={false} atlas={atlas()} onSaved={vi.fn()} onSignIn={onSignIn} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in to keep it' }));
    expect(onSignIn).toHaveBeenCalled();
  });

  it('says the night was charted, not perfect, when a sky went over par', () => {
    render(<NightChartedScreen {...base} results={[par, { status: 'over', used: 2, par: 1 } as SiteResult]} signedIn atlas={atlas()} onSaved={vi.fn()} />);
    expect(screen.getByText('The whole night is charted.')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('shows where the player stands tonight, and opens the board', async () => {
    const onBoard = vi.fn();
    const place = { entry: { place: 12, userId: 'me', username: 'me', avatar: null, value: 70, extra: 2, isMe: true, trend: null, versus: null }, total: 340 };
    render(<NightChartedScreen {...base} signedIn atlas={atlas()} onSaved={vi.fn()} place={place} onBoard={onBoard} />);
    await userEvent.click(screen.getByRole('button', { name: '#12 of 340 tonight. Open the board' }));
    expect(onBoard).toHaveBeenCalledOnce();
  });
});
