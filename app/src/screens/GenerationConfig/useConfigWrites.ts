import { useState } from 'react';
import type { GameMode } from '../../domain/gameModes';
import type { GenerationSchedule } from '../../domain/generation';
import { deleteConfig, saveConfig } from '../../services/repositories/generationConfigs';

/** Saving and cancelling configs: one write at a time, with its error kept for display. */
export function useConfigWrites(onWritten: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(write: () => Promise<{ ok: boolean; error?: string }>): Promise<boolean> {
    setBusy(true); setError(null);
    const r = await write();
    setBusy(false);
    if (!r.ok) { setError(r.error ?? 'failed'); return false; }
    onWritten();
    return true;
  }

  return {
    busy, error,
    save: (mode: GameMode, day: number, schedule: GenerationSchedule, note: string) => run(() => saveConfig(mode, day, schedule, note)),
    remove: (id: number) => run(() => deleteConfig(id)),
  };
}
