import { create } from 'zustand';
import type { Area } from '@/app/nav/grammar';
import type { Paths } from '@/app/nav/model';

interface NavState {
  /** each area's stack while another is on screen; in memory only (HANDOFF §4.4) */
  lastPath: Paths;
  setLastPath: (area: Area, path: string) => void;
  setPaths: (paths: Paths) => void;
}

export const useNavStore = create<NavState>()((set) => ({
  lastPath: {},
  setLastPath: (area, path) =>
    set((s) => (s.lastPath[area] === path ? s : { lastPath: { ...s.lastPath, [area]: path } })),
  setPaths: (lastPath) => set({ lastPath }),
}));
