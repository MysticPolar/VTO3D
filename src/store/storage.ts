import type { StateStorage } from 'zustand/middleware';

/**
 * The persisted client state (HANDOFF §4.4) lives in one localStorage key, shared by every
 * persisted store: each store keeps its slice under its own name, so they never overwrite
 * each other.
 */
export const STATE_KEY = 'vto-web-state-v1';

function readAll(): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}');
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, unknown>): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(all));
  } catch {
    // storage full or blocked: the stores keep their state in memory for this visit
  }
}

export const sharedStateStorage: StateStorage = {
  getItem: (name) => {
    const slice = readAll()[name];
    return slice === undefined ? null : JSON.stringify(slice);
  },
  setItem: (name, value) => {
    const all = readAll();
    all[name] = JSON.parse(value) as unknown;
    writeAll(all);
  },
  removeItem: (name) => {
    const all = readAll();
    delete all[name];
    writeAll(all);
  },
};
