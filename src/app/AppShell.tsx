import { useState } from 'react';
import styles from './AppShell.module.css';
import { DevFrame, isFrameMode, StatusBar } from './DevFrame';

/** The app column (HANDOFF §4.2): full screen on phones, a centred phone-width column on wider
 * screens, or the prototype's 390 × 844 box with `?frame=iphone`. Screens and overlays render
 * inside the app root, so they stay inside the column. */
export function AppShell() {
  const [framed] = useState(() => isFrameMode(window.location.search));
  const app = (
    <div className={styles.app} data-app>
      {framed && <StatusBar />}
    </div>
  );
  return framed ? <DevFrame>{app}</DevFrame> : <div className={styles.column}>{app}</div>;
}
