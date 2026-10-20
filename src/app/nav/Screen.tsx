import clsx from 'clsx';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { Area, Entry } from './grammar';
import styles from './Screen.module.css';

/** active: the top of the visible stack; leaving: animating out; hidden: kept alive below */
export type ScreenState = 'active' | 'hidden' | 'leaving';

export interface ScreenInfo {
  area: Area;
  /** the stack up to and including this screen, root first */
  entries: Entry[];
  entry: Entry;
  title: string;
  state: ScreenState;
  /** a global motion class while it enters or leaves, e.g. 'enter-push' (styles/motion.css) */
  transition?: string;
  register: (el: HTMLElement | null) => void;
}

export const ScreenContext = createContext<ScreenInfo | null>(null);

export function useScreen(): ScreenInfo {
  const info = useContext(ScreenContext);
  if (!info) throw new Error('useScreen outside a screen');
  return info;
}

/**
 * A screen's root, the prototype's `<section class="screen">`. Hidden screens stay mounted with
 * `visibility: hidden`, `inert` and `aria-hidden` (not `display: none`, which loses scroll
 * positions); a leaving one ignores taps.
 */
export function Screen({ className, children }: { className?: string; children: ReactNode }) {
  const { entry, title, state, transition, register } = useScreen();
  const el = useRef<HTMLElement | null>(null);
  const ref = useCallback(
    (node: HTMLElement | null) => {
      el.current = node;
      register(node);
    },
    [register],
  );
  useLayoutEffect(() => {
    if (el.current) el.current.inert = state !== 'active';
  }, [state]);
  const hidden = state === 'hidden';
  return (
    <section
      ref={ref}
      className={clsx(styles.screen, className, hidden && styles.hidden, transition)}
      data-screen={entry.screen}
      data-active={state === 'active' ? '' : undefined}
      data-transition={transition}
      aria-label={title}
      aria-hidden={hidden || undefined}
    >
      {children}
    </section>
  );
}
