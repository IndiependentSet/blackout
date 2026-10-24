import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CHAPTERS } from '../../../../domain/campaign';
import type { PlayAction } from '../../play/SkyPlay';

const state = vi.hoisted(() => ({ idx: 0, levels: 1 }));
vi.mock('../../../../game/useCampaignSession', () => ({
  useCampaignSession: () => ({ state: { idx: state.idx }, levels: Array.from({ length: state.levels }, () => ({})), dispatch: () => {} }),
}));
vi.mock('../../play/SkyPlay', () => ({
  SkyPlay: ({ primary }: { primary: PlayAction | null }) => <button onClick={primary?.onClick}>{primary?.label}</button>,
}));

const { VoyagePlay } = await import('./VoyagePlay');

const play = (chapter: number, extra: { onWorldDone?: (c: typeof CHAPTERS[number]) => void }, onBack: () => void) =>
  render(<VoyagePlay chapter={CHAPTERS[chapter]} startLevelNo={CHAPTERS[chapter].to} clears={new Map()} record={vi.fn()} saveClear={vi.fn()} userId="u" onBack={onBack} {...extra} />);

describe('VoyagePlay', () => {
  it('flies on to the next world from the last level of a world', () => {
    const onBack = vi.fn(), onWorldDone = vi.fn();
    play(2, { onWorldDone }, onBack);
    fireEvent.click(screen.getByText('World charted · back to the voyage'));
    expect(onWorldDone).toHaveBeenCalledWith(CHAPTERS[2]);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('goes straight back from the last world, which has nowhere to fly on to', () => {
    const onBack = vi.fn(), onWorldDone = vi.fn();
    play(CHAPTERS.length - 1, { onWorldDone }, onBack);
    fireEvent.click(screen.getByText('World charted · back to the voyage'));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onWorldDone).not.toHaveBeenCalled();
  });

  it('goes back when nothing handles the flight', () => {
    const onBack = vi.fn();
    play(0, {}, onBack);
    fireEvent.click(screen.getByText('World charted · back to the voyage'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
