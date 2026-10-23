import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ok } from '../../services/result';

vi.mock('../../services/repositories/recipes', () => ({
  listRecipes: async () => ok([]), saveRecipe: vi.fn(), deleteRecipe: vi.fn(),
}));
const { LevelPoolsScreen } = await import('./LevelPoolsScreen');

/* the draft as the JSON box shows it */
async function draft() {
  await userEvent.click(screen.getByText('JSON'));
  await userEvent.click(screen.getByRole('button', { name: 'Show the draft' }));
  return JSON.parse((screen.getByRole('textbox', { name: 'curve JSON' }) as HTMLTextAreaElement).value) as { tiers: { options: { strategy?: string } }[] };
}
const strategySelect = () => screen.getByLabelText('Strategy', { selector: 'select' });

describe('pool page', () => {
  it('changes only the open tier, unless told to change them all', async () => {
    render(<LevelPoolsScreen mode="survival" />);
    expect(screen.getByRole('radio', { name: 'Tier 1 · slots 0–1' })).toBeChecked();
    await userEvent.selectOptions(strategySelect(), 'free');
    expect((await draft()).tiers.map(t => t.options.strategy ?? 'gadgets')).toEqual(['free', 'gadgets', 'gadgets', 'gadgets', 'gadgets']);

    await userEvent.click(screen.getByRole('radio', { name: 'All 5 tiers' }));
    expect(screen.getByText(/copied to every one of them/)).toBeInTheDocument();
    await userEvent.selectOptions(strategySelect(), 'gadgets');
    await userEvent.selectOptions(strategySelect(), 'free');
    expect((await draft()).tiers.map(t => t.options.strategy)).toEqual(['free', 'free', 'free', 'free', 'free']);
  });

  it('warns when a free sky asks for more lines than max degree allows', async () => {
    render(<LevelPoolsScreen mode="survival" />);
    await userEvent.selectOptions(strategySelect(), 'free');
    expect(screen.queryByRole('list', { name: 'settings that cancel out' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Density', { selector: 'input' }), { target: { value: '3.4' } });
    expect(within(screen.getByRole('list', { name: 'settings that cancel out' })).getByText(/Density 3.4 can't be reached/)).toBeInTheDocument();
  });

  it('switches a tier to hand-drawn skies and back', async () => {
    render(<LevelPoolsScreen mode="survival" />);
    await userEvent.click(screen.getByRole('button', { name: 'Draw by hand' }));
    expect(screen.getByRole('application', { name: 'sky editor' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Strategy', { selector: 'select' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: '+ Add a sky' }));
    expect(within(screen.getByRole('group', { name: 'drawings' })).getAllByRole('button')).toHaveLength(2);
    const tiers = (await draft()).tiers as { count: number; manual?: unknown[] }[];
    expect(tiers[0]).toMatchObject({ count: 2, manual: [{ nodes: [], edges: [] }, { nodes: [], edges: [] }] });
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(strategySelect()).toBeInTheDocument();
  });
});
