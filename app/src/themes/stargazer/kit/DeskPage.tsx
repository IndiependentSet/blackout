import type { ComponentProps } from 'react';
import { DeskHeader, type DeskDest } from './DeskHeader';
import { useDesk } from './DeskContext';
import { Page } from './Page';
import { useWide } from './useWide';

/** A phone-column page that, on desktop, sits under the shared header. `active` says which place of the header it belongs to. */
export function DeskPage({ active, ...page }: Omit<ComponentProps<typeof Page>, 'header' | 'wide'> & { active: DeskDest }) {
  const wide = useWide();
  const desk = useDesk();
  return <Page {...page} header={wide && desk ? <DeskHeader active={active} {...desk} /> : undefined} />;
}
