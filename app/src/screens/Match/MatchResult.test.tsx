import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { matchRow, playerRow, viewOf } from './matchFixtures';
import { MatchResult } from './MatchResult';

vi.mock('../../services/supabase/client', () => ({ supabase: {}, APP_BASE_URL: 'http://localhost' }));

const show = (view: ReturnType<typeof viewOf>) =>
  render(<MatchResult view={view} userId="me" opponentName="@rival" onOpenLobby={() => {}} onOpenHub={() => {}} />);

describe('MatchResult', () => {
  it('shows how a ranked match moved your rating', () => {
    show(viewOf(matchRow({ status: 'done', winner_id: 'me', ranked: true }), [
      playerRow('me', { cats_used: 1, result: 'won', rating_before: 1000, rating_after: 1016 }),
      playerRow('you', { cats_used: 2, result: 'lost', rating_before: 1000, rating_after: 984 }),
    ]));
    expect(screen.getByLabelText('rating change')).toHaveTextContent('1000 → 1016 (+16)');
    expect(screen.getByText(/RANKED/)).toBeInTheDocument();
  });

  it('shows the loss as a drop', () => {
    show(viewOf(matchRow({ status: 'done', winner_id: 'you', ranked: true }), [
      playerRow('me', { cats_used: 2, result: 'lost', rating_before: 1000, rating_after: 984 }),
      playerRow('you', { cats_used: 1, result: 'won', rating_before: 1000, rating_after: 1016 }),
    ]));
    expect(screen.getByLabelText('rating change')).toHaveTextContent('1000 → 984 (−16)');
  });

  it('says nothing about rating after a friendly match', () => {
    show(viewOf(matchRow({ status: 'done', winner_id: 'me' }), [
      playerRow('me', { cats_used: 1, result: 'won' }), playerRow('you', { cats_used: 2, result: 'lost' }),
    ]));
    expect(screen.queryByLabelText('rating change')).toBeNull();
    expect(screen.queryByText(/RANKED/)).toBeNull();
  });
});
