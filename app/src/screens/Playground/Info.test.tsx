import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HELP } from './help';
import { Info } from './Info';

describe('Info', () => {
  it('wires a labelled button to a popover carrying the help text', () => {
    render(<Info k="crossings" />);
    const btn = screen.getByRole('button', { name: 'About Allow crossings' });
    const pop = document.getElementById(btn.getAttribute('popovertarget') ?? '');
    expect(pop?.getAttribute('popover')).toBe('auto');
    expect(pop?.textContent).toContain(HELP.crossings.what);
    expect(pop?.textContent).toContain(HELP.crossings.game);
  });
});
