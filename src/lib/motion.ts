import { useLayoutEffect, useRef } from 'react';

/** `prefers-reduced-motion: reduce`, read at the moment it matters (the prototype's VT.reducedMotion) */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Adds `className` right after mount, once the element's closed state has been laid out, so its
 * CSS transition runs (the prototype's `void el.offsetWidth; el.classList.add('is-open')`).
 * React drops the class whenever it rewrites the element's className, which starts the exit, so
 * change that element's className only to close it.
 */
export function useEnterClass<T extends HTMLElement>(className: string | undefined) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !className) return;
    void el.offsetWidth;
    el.classList.add(className);
  }, [className]);
  return ref;
}
