import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ADMIN_GROUPS, ADMIN_PAGES } from '../../../../domain/adminPages';
import { AdminLinks } from './AdminLinks';

describe('AdminLinks', () => {
  it('lists every admin page, one row each, under its group', () => {
    render(<AdminLinks />);
    for (const g of ADMIN_GROUPS) expect(screen.getByRole('region', { name: g.label })).toBeTruthy();
    for (const p of ADMIN_PAGES) expect(screen.getByRole('button', { name: new RegExp('^' + p.label) })).toBeTruthy();
  });
});
