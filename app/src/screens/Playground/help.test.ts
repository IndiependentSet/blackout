import { describe, expect, it } from 'vitest';
import { GADGET_NAMES } from '../../domain/generation';
import { HELP } from './help';
import { DEFAULT_PARAMS } from './params';

describe('playground help', () => {
  it('explains every setting and every gadget', () => {
    const settings = Object.keys(DEFAULT_PARAMS).filter(k => k !== 'budgetMs');   // budgetMs shares the clock entry
    for (const k of [...settings, ...GADGET_NAMES.map(n => `gadget.${n}`)])
      expect(HELP[k as keyof typeof HELP]?.what, k).toBeTruthy();
  });
});
