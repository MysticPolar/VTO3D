import clsx from 'clsx';
import { isTab } from '@/app/nav/grammar';
import { useNav } from '@/app/nav/NavContext';
import { Screen, useScreen } from '@/app/nav/Screen';
import { Button } from '@/components/Button/Button';
import { useOverlay } from '@/components/Overlay/OverlayContext';
import { SubHeader } from '@/components/SubHeader/SubHeader';
import { TabBar } from '@/components/TabBar/TabBar';
import { placeholderActions } from './actions';
import styles from './Placeholder.module.css';

const ROWS = Array.from({ length: 40 }, (_, i) => i + 1);

/**
 * The Phase 1 stand-in for every screen (HANDOFF §11): the screen's title and `data-screen`, a
 * long list to test scroll memory, and buttons that open the next screens of each flow. The
 * phases that build the real screens replace it.
 */
export function Placeholder() {
  const { area, entries, entry, title } = useScreen();
  const nav = useNav();
  const overlay = useOverlay();
  const root = entries.length === 1;
  const actions = placeholderActions(entry, area, nav, overlay);
  const ids = [
    entry.pid && `pid ${entry.pid}`,
    entry.oid && `oid ${entry.oid}`,
    entry.status && `status ${entry.status}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen>
      {root ? (
        <header className={styles.head}>
          <h1 className={styles.title}>{title}</h1>
        </header>
      ) : (
        <SubHeader title={title} />
      )}
      <div className={clsx('scroll', styles.scroll)} data-main-scroll>
        {ids && <p className={styles.ids}>{ids}</p>}
        {actions.length > 0 && (
          <div className={styles.actions}>
            {actions.map((a) => (
              <Button key={a.label} variant="light" size="sm" onClick={a.run}>
                {a.label}
              </Button>
            ))}
          </div>
        )}
        <ol className={styles.rows}>
          {ROWS.map((n) => (
            <li key={n} className={styles.row}>
              {title} {n}
            </li>
          ))}
        </ol>
      </div>
      {root && isTab(area) && <TabBar />}
    </Screen>
  );
}
