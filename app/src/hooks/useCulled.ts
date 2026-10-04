import { useMemo } from 'react';

/** The items passing `visible`, as the same array until the set (or the source list) actually changes — so memoised children skip frames where only the camera moved. */
export function useCulled<T>(items: T[], visible: (item: T) => boolean, keyOf: (item: T) => string | number): T[] {
  const picked = items.filter(visible);
  const signature = picked.map(keyOf).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `picked` is rebuilt whenever `items` or `signature` change
  return useMemo(() => picked, [items, signature]);
}
