import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { sharedStateStorage } from './storage';

interface SessionState {
  /** the first-launch flow is finished: `/` opens 首页 (HANDOFF §4.3) */
  setupDone: boolean;
  setSetupDone: (setupDone: boolean) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      setupDone: false,
      setSetupDone: (setupDone) => set({ setupDone }),
    }),
    {
      name: 'session',
      version: 1,
      storage: createJSONStorage(() => sharedStateStorage),
      partialize: (s) => ({ setupDone: s.setupDone }),
    },
  ),
);
