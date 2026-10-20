import type { Stack } from './grammar';

export type Transition = 'push' | 'pop' | 'fade' | 'none';

/** Durations of the screen transitions (HANDOFF §5.4); leaving screens are removed after 420 ms */
export const TRANSITION_MS = { push: 380, pop: 380, fade: 260 } as const;
export const SETTLE_MS = 420;

/**
 * The transition between two stacks (HANDOFF §4.3), so browser back and forward animate too:
 * a hint carried by the navigation wins; otherwise the same area one entry deeper is a push,
 * shallower a pop, and anything else (a tab switch) is instant.
 */
export function deriveTransition(from: Stack | null, to: Stack, hint?: Transition): Transition {
  if (!from) return 'none';
  if (hint) return hint;
  if (from.area !== to.area) return 'none';
  const depth = to.entries.length - from.entries.length;
  return depth > 0 ? 'push' : depth < 0 ? 'pop' : 'none';
}
