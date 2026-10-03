import { useEffect, useState } from 'react';

/** A clock for the looping demos: ticks once every `ms`. */
export function useTick(ms: number): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    const h = setInterval(() => setT(n => n + 1), ms);
    return () => clearInterval(h);
  }, [ms]);
  return t;
}
