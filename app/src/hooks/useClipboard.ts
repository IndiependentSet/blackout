import { useCallback, useEffect, useRef, useState } from 'react';

/** Copy text to the clipboard; `copied` is true for a moment afterwards. */
export function useClipboard(resetMs = 1800) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback((text: string) => {
    const done = () => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetMs);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
  }, [resetMs]);

  return { copied, copy };
}
