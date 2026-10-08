import { useEffect, useState } from 'react';
import { daySeed } from '../../domain/calendar';
import type { GenerationSchedule } from '../../domain/generation';
import { previewDayAsync, type SitePreview } from '../../services/generation/scheduleClient';

interface Done { key: string; sites: SitePreview[] | null; error: string | null }

/** The week a schedule makes on a day, generated in a worker. A new draft or
    day abandons the run in flight, so dragging a slider never queues stale runs. */
export function useSchedulePreview(schedule: GenerationSchedule, day: number) {
  const key = day + ':' + JSON.stringify(schedule);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const debounce = window.setTimeout(() => {
      void previewDayAsync(schedule, daySeed(day), { signal: ctrl.signal }).then(r => {
        if (ctrl.signal.aborted) return;
        setDone(r.ok ? { key, sites: r.data, error: null } : { key, sites: null, error: r.error });
      });
    }, 250);
    return () => { window.clearTimeout(debounce); ctrl.abort(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- key is schedule and day, serialised

  return {
    running: done?.key !== key, sites: done?.sites ?? null, error: done?.error ?? null,
    /** identifies the preview shown (it lags the draft while a run is in flight) */
    previewKey: done?.key ?? '',
  };
}
