import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Animates a number towards `target` on mount and whenever it changes.
 * Single rAF loop, no dependencies — cheap enough to run on every stat tile.
 * With reduced motion the target is returned straight through.
 */
export default function useCountUp(target = 0, duration = 750) {
  const reduced = prefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const fromRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (reduced) return undefined;

    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return undefined;

    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutExpo — fast out of the gate, gentle landing
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const next = from + delta * eased;
      setValue(next);
      fromRef.current = next;

      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, reduced]);

  return reduced ? target : value;
}
