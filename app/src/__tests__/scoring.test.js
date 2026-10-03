import { describe, expect, it } from 'vitest';
import { siteScore, siteBest } from '../supabase.js';

describe('site scoring', () => {
  it('pays stars x 10 on budget', () => expect(siteScore(3, 5, 5)).toBe(30));
  it('docks 5 per cat over par', () => expect(siteScore(3, 7, 5)).toBe(20));
  it('never goes below zero', () => expect(siteScore(1, 20, 2)).toBe(0));
  it('best is stars x 10', () => expect(siteBest(2)).toBe(20));
});
