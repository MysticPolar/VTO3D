import clsx from 'clsx';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon/Icon';
import type { ToastItem } from '@/components/Overlay/OverlayContext';
import { useEnterClass } from '@/lib/motion';
import styles from './Toast.module.css';

/** A toast stays 2200 ms, 3600 ms with an action, and is removed 260 ms after hiding (§5.4) */
const HIDE_MS = 260;

/** One toast at a time, `role="status"`; a new one replaces the old (js/app.js `toast`) */
export function ToastHost({
  toast,
  onDone,
}: {
  toast: ToastItem | null;
  onDone: (id: number) => void;
}) {
  const [hiding, setHiding] = useState<number | null>(null);
  useEffect(() => {
    if (!toast) return;
    const ms = toast.ms ?? (toast.action ? 3600 : 2200);
    const hide = window.setTimeout(() => setHiding(toast.id), ms);
    const remove = window.setTimeout(() => onDone(toast.id), ms + HIDE_MS);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(remove);
    };
  }, [toast, onDone]);

  const act = useCallback(
    (t: ToastItem) => {
      t.onAction?.();
      setHiding(t.id);
      window.setTimeout(() => onDone(t.id), HIDE_MS);
    },
    [onDone],
  );

  return (
    <div className={styles['vt-toasts']} role="status" aria-live="polite">
      {toast && (
        <ToastView key={toast.id} toast={toast} hiding={hiding === toast.id} onAction={act} />
      )}
    </div>
  );
}

function ToastView({
  toast,
  hiding,
  onAction,
}: {
  toast: ToastItem;
  hiding: boolean;
  onAction: (t: ToastItem) => void;
}) {
  const ref = useEnterClass<HTMLDivElement>(styles['is-in']);
  return (
    <div ref={ref} className={clsx(styles.toast, hiding && styles.out)}>
      {toast.icon && <Icon name={toast.icon} size={18} />}
      <span>{toast.message}</span>
      {toast.action && (
        <button type="button" className={styles['toast-act']} onClick={() => onAction(toast)}>
          {toast.action}
        </button>
      )}
    </div>
  );
}
