/* Stepping through a level's other optimal covers in the schematic. Pure. */

/** The next index after moving `delta` steps through `kept` covers, wrapping round. */
export function stepOptimum(idx: number, delta: number, kept: number): number {
  return kept ? (((idx + delta) % kept) + kept) % kept : 0;
}

/** "2 of 3", or "2 of 20 kept · 57 in all" when the solver kept fewer than there are. */
export function optimumCaption(idx: number, kept: number, others: number): string {
  const base = `${idx + 1} of ${kept}`;
  return others > kept ? `${base} kept · ${others} in all` : base;
}
