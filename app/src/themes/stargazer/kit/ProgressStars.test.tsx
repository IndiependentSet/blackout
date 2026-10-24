import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SkyEntry } from '../play/sky';
import { ProgressStars } from './ProgressStars';

const skies: SkyEntry[] = [
  { n: 1, state: 'par', note: 'par' }, { n: 2, state: 'over', note: '+1' }, { n: 3, state: 'par', note: 'par' },
  { n: 4, state: 'cur', note: 'now' }, { n: 5, state: 'next', note: '' }, { n: 6, state: 'next', note: '' }, { n: 7, state: 'next', note: '' },
];

describe('ProgressStars', () => {
  it('says how many skies are charted and at par', () => {
    render(<ProgressStars skies={skies} />);
    expect(screen.getByRole('img', { name: '3 of 7 skies charted, 2 at par' })).toBeInTheDocument();
  });
});
