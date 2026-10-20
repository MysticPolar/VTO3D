import type { ReactNode } from 'react';
import styles from './AppShell.module.css';
import { DevFrame, StatusBar } from './DevFrame';

/** The app column (HANDOFF §4.2): full screen on phones, a centred phone-width column on wider
 * screens, or the prototype's 390 × 844 box with `?frame=iphone`. Screens, overlays and toasts
 * render inside the app root, so they stay inside the column. */
export function AppShell({ framed, children }: { framed: boolean; children?: ReactNode }) {
  const app = (
    <div className={styles.app} data-app>
      {framed && <StatusBar />}
      {children}
    </div>
  );
  return framed ? <DevFrame>{app}</DevFrame> : <div className={styles.column}>{app}</div>;
}
