import { memo } from 'react';
import { PathLit, PathWeb } from '../../sprites';
import { WEB_ID } from '../fx';
import type { PathItem } from '../scene/buildScene';

const PROOF_STROKE = '#FFD469';

/* The paths. The four unlit layers are identical on every path, so they are
   drawn as one joined path each rather than four per path: fewer elements, and
   every unlit layer sits below every lit one, so a path's magenta can't be
   overpainted by its neighbour's casing where they meet. */
export const PathLayer = memo(function PathLayer({ paths, proof }: {
  paths: PathItem[]; proof: { key: number; d: string }[];
}) {
  const web = paths.map(p => p.d).join(' ');
  return (
    <>
      {!!web && <PathWeb d={web} rimId={WEB_ID} />}
      {paths.map(p => <PathLit key={p.key} d={p.d} on={p.lit} />)}
      {proof.map(m => (
        <path key={m.key} d={m.d} fill="none" stroke={PROOF_STROKE} strokeWidth={4.5} strokeLinecap="round"
          strokeDasharray="9 8" style={{ animation: 'cc-dash 900ms linear infinite' }} />
      ))}
    </>
  );
});
