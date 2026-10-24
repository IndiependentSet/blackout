/* What a number box shows while it is being typed in. The box keeps its own
   text, so it can be empty or briefly out of range without the number behind
   it snapping back; the number only changes once the text reads as one in
   range, and leaving the box settles whatever is left. */

/** Drops the zeros in front of a whole part ("05" → "5", "-007" → "-7"), keeping "0" and "0.5". */
export function tidyDraft(text: string): string {
  return text.replace(/^(-?)0+(?=\d)/, '$1');
}

/** The number the text stands for, or null while it is empty, partial or out of range. */
export function draftValue(text: string, min: number, max = Infinity): number | null {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** The number to keep when the box is left: the text clamped into range, or the old value if it isn't a number. */
export function settleDraft(text: string, fallback: number, min: number, max = Infinity): number {
  const n = text.trim() === '' ? NaN : Number(text);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
