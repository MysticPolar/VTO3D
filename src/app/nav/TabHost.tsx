import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { prefersReducedMotion } from '@/lib/motion';
import { useNavStore } from '@/store/nav';
import {
  AREAS,
  buildPath,
  parsePath,
  pathOf,
  topEntry,
  type ScreenId,
  type Stack,
} from './grammar';
import { ScreenContext, type ScreenInfo, type ScreenState } from './Screen';
import styles from './TabHost.module.css';
import { deriveTransition, SETTLE_MS, type Transition } from './transition';

export type ScreenRegistry = Record<ScreenId, { title: string; component: ComponentType }>;

interface Shown {
  key: string;
  stack: Stack;
}

interface Anim {
  type: Exclude<Transition, 'none'>;
  enter: string;
  leave: Shown;
}

interface Props {
  /** the stack in the URL */
  stack: Stack;
  /** a transition the navigation asked for */
  hint?: Transition;
  /** an overlay is open: the screens behind it take no focus or taps */
  inert: boolean;
  screens: ScreenRegistry;
}

/**
 * Keep-alive (HANDOFF §4.3): every entry of every visited stack stays mounted, hidden under the
 * top of the active one, so scroll positions, typed text and component state survive tab
 * switches and back navigation. It also hosts the launch flow's stack, which has no tab bar.
 */
export function TabHost({ stack, hint, inert, screens }: Props) {
  const lastPath = useNavStore((s) => s.lastPath);
  const topKey = pathOf(stack.entries);

  // the transition is derived from the old and new stacks, so browser back and forward animate too
  const [shown, setShown] = useState<Shown>({ key: topKey, stack });
  const [anim, setAnim] = useState<Anim | null>(null);
  const [moved, setMoved] = useState<{ key: string; type: Transition } | null>(null);
  if (shown.key !== topKey) {
    const type = deriveTransition(shown.stack, stack, hint);
    setShown({ key: topKey, stack });
    setAnim(
      type === 'none' || prefersReducedMotion() ? null : { type, enter: topKey, leave: shown },
    );
    setMoved({ key: topKey, type });
  }
  useEffect(() => {
    if (!anim) return;
    const timer = window.setTimeout(() => setAnim(null), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [anim]);

  // after an animated navigation focus moves to the new screen's first heading; tab switches don't
  const elements = useRef(new Map<string, HTMLElement>());
  const register = useCallback((key: string, el: HTMLElement | null) => {
    if (el) elements.current.set(key, el);
    else elements.current.delete(key);
  }, []);
  useLayoutEffect(() => {
    if (!moved || moved.type === 'none') return;
    const heading = elements.current
      .get(moved.key)
      ?.querySelector<HTMLElement>('h1, h2, [data-autofocus]');
    if (!heading) return;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }, [moved]);

  const container = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (container.current) container.current.inert = inert;
  }, [inert]);

  const slots = useMemo(() => {
    const out: { key: string; path: string }[] = [];
    for (const area of AREAS) {
      const st = area === stack.area ? stack : parsePath(lastPath[area] ?? '')?.stack;
      if (!st) continue;
      st.entries.forEach((_, i) => {
        const entries = st.entries.slice(0, i + 1);
        out.push({ key: pathOf(entries), path: buildPath({ area: st.area, entries }) });
      });
    }
    // a screen that left every stack stays until its exit animation has played
    if (anim && !out.some((s) => s.key === anim.leave.key)) {
      out.push({ key: anim.leave.key, path: buildPath(anim.leave.stack) });
    }
    return out;
  }, [stack, lastPath, anim]);

  return (
    <div ref={container} className={styles.screens}>
      {slots.map(({ key, path }) => {
        const leaving = anim?.leave.key === key;
        const state: ScreenState = key === topKey ? 'active' : leaving ? 'leaving' : 'hidden';
        const transition = !anim
          ? undefined
          : key === anim.enter
            ? `enter-${anim.type}`
            : leaving
              ? `leave-${anim.type}`
              : undefined;
        return (
          <ScreenSlot
            key={key}
            slotKey={key}
            path={path}
            state={state}
            transition={transition}
            register={register}
            screens={screens}
          />
        );
      })}
    </div>
  );
}

interface SlotProps {
  slotKey: string;
  path: string;
  state: ScreenState;
  transition: string | undefined;
  register: (key: string, el: HTMLElement | null) => void;
  screens: ScreenRegistry;
}

/** One mounted screen; it re-renders only when its own path, state or transition changes */
const ScreenSlot = memo(function ScreenSlot({
  slotKey,
  path,
  state,
  transition,
  register,
  screens,
}: SlotProps) {
  const stack = useMemo(() => parsePath(path)?.stack, [path]);
  const registerSelf = useCallback(
    (el: HTMLElement | null) => register(slotKey, el),
    [register, slotKey],
  );
  const info = useMemo<ScreenInfo | null>(() => {
    if (!stack) return null;
    const entry = topEntry(stack);
    return {
      area: stack.area,
      entries: stack.entries,
      entry,
      title: screens[entry.screen].title,
      state,
      transition,
      register: registerSelf,
    };
  }, [stack, screens, state, transition, registerSelf]);
  if (!info) return null;
  const Component = screens[info.entry.screen].component;
  return (
    <ScreenContext.Provider value={info}>
      <Component />
    </ScreenContext.Provider>
  );
});
