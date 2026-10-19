import clsx from 'clsx';
import type { ReactNode } from 'react';
import { isDemo } from '@/lib/isDemo';
import styles from './DevFrame.module.css';

/** `?frame=iphone`, demo builds only: lay the app out like the prototype's `?app=<id>` mode, for
 * screenshot comparison (HANDOFF §4.2, §10.2). Read once at start-up, so navigation keeps it. */
export function isFrameMode(search: string): boolean {
  return isDemo() && new URLSearchParams(search).get('frame') === 'iphone';
}

/** The prototype's 390 × 844 box, with the status bar's 44 px top inset and no bottom inset. */
export function DevFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.frame} data-frame="iphone">
      {children}
    </div>
  );
}

/** The prototype's fake iPhone status bar (js/ui.js `statusBar`, js/icons.js `statusGlyphs`).
 * Drawn only in the dev frame: the real app uses the browser's own chrome. */
export function StatusBar({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  return (
    <div className={clsx(styles.sb, theme === 'light' && styles.light)} aria-hidden="true">
      <span className={styles.time}>9:41</span>
      <span className={styles.icons}>
        <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="5" y="5.6" width="3" height="6.4" rx="0.8" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" />
          <rect x="15" y="0" width="3" height="12" rx="0.8" />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12" aria-hidden="true">
          <path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5l1.3-1.3A10.6 10.6 0 0 0 8.5.4 10.6 10.6 0 0 0 .9 3.5l1.3 1.3a9 9 0 0 1 6.3-2.5z" />
          <path d="M8.5 5.9c1.4 0 2.7.5 3.7 1.4l1.3-1.3a7.1 7.1 0 0 0-10 0l1.3 1.3c1-.9 2.3-1.4 3.7-1.4z" />
          <path d="M8.5 9.3c.5 0 1 .2 1.3.5L8.5 11.6 7.2 9.8c.3-.3.8-.5 1.3-.5z" />
        </svg>
        <svg
          className={styles.battery}
          width="27"
          height="13"
          viewBox="0 0 27 13"
          aria-hidden="true"
        >
          <rect
            x="0.6"
            y="0.6"
            width="22.6"
            height="11.8"
            rx="3.6"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".4"
            strokeWidth="1.1"
          />
          <rect x="2.2" y="2.2" width="19.4" height="8.6" rx="2.2" />
          <path d="M24.6 4.4v4.2c.9-.3 1.5-1.2 1.5-2.1s-.6-1.8-1.5-2.1z" fillOpacity=".45" />
        </svg>
      </span>
    </div>
  );
}
