import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dayNumber } from '../../domain/calendar';
import { DEFAULT_SCHEDULE } from '../../domain/generation';
import type { StoredConfig } from '../../domain/generationConfig';
import { fail, ok } from '../../services/result';

const listConfigs = vi.fn();
const saveConfig = vi.fn();
const deleteConfig = vi.fn();
vi.mock('../../services/repositories/generationConfigs', () => ({
  listConfigs: (...a: unknown[]) => listConfigs(...a),
  saveConfig: (...a: unknown[]) => saveConfig(...a),
  deleteConfig: (...a: unknown[]) => deleteConfig(...a),
}));
const listRecipes = vi.fn();
vi.mock('../../services/repositories/recipes', () => ({
  listRecipes: (...a: unknown[]) => listRecipes(...a), saveRecipe: vi.fn(), deleteRecipe: vi.fn(),
}));
/* no workers in jsdom: the preview never answers, which these tests don't need */
vi.mock('../../services/generation/scheduleClient', () => ({ previewDayAsync: () => new Promise(() => {}) }));

const { GenerationConfigScreen } = await import('./GenerationConfigScreen');

const today = dayNumber();
const stored = (id: number, effectiveFromDay: number, schedule: unknown, note = ''): StoredConfig =>
  ({ id, mode: 'daily', effectiveFromDay, schedule, note, createdAt: '' });
const tweaked = { ...DEFAULT_SCHEDULE, retries: 3 };

beforeEach(() => {
  listConfigs.mockReset(); saveConfig.mockReset(); deleteConfig.mockReset();
  listRecipes.mockReset(); listRecipes.mockResolvedValue(ok([]));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => { vi.restoreAllMocks(); });

describe('generation config page', () => {
  it('starts from the newest saved config', async () => {
    listConfigs.mockResolvedValue(ok([stored(2, today + 3, tweaked, 'harder weekend'), stored(1, today - 5, DEFAULT_SCHEDULE)]));
    render(<GenerationConfigScreen />);
    expect(await screen.findByText(new RegExp(`Editing day ${today + 3}’s config`))).toBeInTheDocument();
    expect(screen.getByText('harder weekend')).toBeInTheDocument();
    expect(screen.getByText('scheduled')).toBeInTheDocument();
    expect(screen.getByText('in force')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Retries' })).toHaveValue(3);
  });

  it('saves the draft from tomorrow on', async () => {
    listConfigs.mockResolvedValue(ok([]));
    saveConfig.mockResolvedValue(ok(7));
    render(<GenerationConfigScreen />);
    expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('what changed, and why'), 'baseline');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saveConfig).toHaveBeenCalledWith('daily', today + 1, DEFAULT_SCHEDULE, 'baseline'));
    expect(await screen.findByText(new RegExp(`from day ${today + 1} on`))).toBeInTheDocument();
    expect(listConfigs).toHaveBeenCalledTimes(2);     // reloaded after the write
  });

  it('shows why the server refused a save', async () => {
    listConfigs.mockResolvedValue(ok([]));
    saveConfig.mockResolvedValue(fail('only admins can change level generation'));
    render(<GenerationConfigScreen />);
    await screen.findByText(/Nothing saved yet/);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('only admins can change level generation')).toBeInTheDocument();
  });

  it('cancels a scheduled config', async () => {
    listConfigs.mockResolvedValue(ok([stored(4, today + 2, tweaked)]));
    deleteConfig.mockResolvedValue(ok(null));
    render(<GenerationConfigScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel it' }));
    await waitFor(() => expect(deleteConfig).toHaveBeenCalledWith(4));
  });

  it('applies a recipe to a run of skies, keeping each sky its own size', async () => {
    listConfigs.mockResolvedValue(ok([]));
    listRecipes.mockResolvedValue(ok([{ name: 'Open field', shape: { strategy: 'free', density: 1.6 }, note: '' }]));
    saveConfig.mockResolvedValue(ok(8));
    render(<GenerationConfigScreen />);
    await screen.findByText(/Nothing saved yet/);
    await userEvent.click(screen.getByRole('tab', { name: 'Sky 5' }));
    expect(screen.getByText('Custom shape')).toBeInTheDocument();
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'recipe to apply' }), 'Open field');
    const last = screen.getByRole('spinbutton', { name: 'last of the skies' });
    await userEvent.clear(last);
    await userEvent.type(last, '7');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getAllByText('Open field').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saveConfig).toHaveBeenCalled());
    const saved = saveConfig.mock.calls[0][2] as typeof DEFAULT_SCHEDULE;
    saved.sites.forEach((site, i) => {
      expect(site.options.strategy === 'free', `sky ${i + 1}`).toBe(i >= 4);
      expect(site.size).toBe(DEFAULT_SCHEDULE.sites[i].size);
    });
  });

  it('won\'t save a schedule that lets a level have more than one answer', async () => {
    listConfigs.mockResolvedValue(ok([]));
    render(<GenerationConfigScreen />);
    await screen.findByText(/Nothing saved yet/);
    const maxOptima = screen.getByRole('spinbutton', { name: 'Max optimal covers' });
    await userEvent.clear(maxOptima);
    await userEvent.type(maxOptima, '2');
    expect(await screen.findByText(/the game needs a unique optimal cover/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
