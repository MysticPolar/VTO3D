import { parsePath, type ScreenId } from './grammar';
import type { Transition } from './transition';

/**
 * History bookkeeping (HANDOFF §4.3). Every entry the app writes carries this state (React
 * Router keeps it in `history.state.usr`), and the mirror below records the entries in
 * sessionStorage, so the app always knows what the previous entry is.
 */
export interface HistoryState {
  idx: number;
  /** the entry's URL: path plus query */
  path: string;
  /** set on the same-URL entry an open overlay pushed */
  overlay?: string;
  /** a transition the navigation asks for (fade for jumps, none into the launch flow) */
  anim?: Transition;
}

export interface HistoryRecord {
  path: string;
  overlay?: string;
  /** a screen that drop() removed from this entry's stack: landing here leaves it out */
  dropped?: ScreenId;
}

export function readState(state: unknown): HistoryState | null {
  const s = state as Partial<HistoryState> | null;
  return s && typeof s.idx === 'number' && typeof s.path === 'string' ? (s as HistoryState) : null;
}

const KEY = 'vto-web-history-v1';
let cache: Record<string, HistoryRecord> | null = null;

function load(): Record<string, HistoryRecord> {
  if (!cache) {
    try {
      cache = JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Record<string, HistoryRecord>;
    } catch {
      cache = {};
    }
  }
  return cache;
}

function save(): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(load()));
  } catch {
    // storage full or blocked: the in-memory copy still serves this page
  }
}

export const historyMirror = {
  get(idx: number): HistoryRecord | undefined {
    return load()[String(idx)];
  },

  record(idx: number, rec: HistoryRecord): void {
    load()[String(idx)] = rec;
    save();
  },

  /** An index for an entry that has no state of ours (a typed URL, a new tab): past every
   * recorded entry, with a gap, so back() never mistakes an unrelated entry for its parent. */
  freshIdx(): number {
    const keys = Object.keys(load()).map(Number);
    return keys.length > 0 ? Math.max(...keys) + 2 : 0;
  },

  /** Mark every entry whose stack holds `screen` above its root (see drop()) */
  markDropped(screen: ScreenId): void {
    for (const rec of Object.values(load())) {
      const stack = parsePath(rec.path)?.stack;
      if (stack?.entries.some((e, n) => n > 0 && e.screen === screen)) rec.dropped = screen;
    }
    save();
  },

  /** for tests */
  reset(): void {
    cache = {};
    save();
  },
};
