import clsx from 'clsx';
import { Fragment, useEffect, useId, useLayoutEffect, useRef, type RefObject } from 'react';
import { Button } from '@/components/Button/Button';
import { IconButton } from '@/components/IconButton/IconButton';
import { useEnterClass } from '@/lib/motion';
import styles from './Overlay.module.css';
import type { OverlayItem } from './OverlayContext';

type Of<K extends OverlayItem['kind']> = Extract<OverlayItem, { kind: K }>;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keep Tab inside the overlay: from the last element to the first and back */
function trapTab(e: KeyboardEvent, root: HTMLElement) {
  const list = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = list[0];
  const last = list[list.length - 1];
  if (!first || !last) {
    e.preventDefault();
    return;
  }
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/** Focus moves into the overlay when it opens; only the top overlay takes focus and taps */
function useFrame(
  ref: RefObject<HTMLElement | null>,
  top: boolean,
  focusFirst: string,
  delay: number,
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const timer = window.setTimeout(() => {
      const target =
        root.querySelector<HTMLElement>(focusFirst) ??
        root.querySelector<HTMLElement>(FOCUSABLE) ??
        root;
      target.focus({ preventScroll: true });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [ref, focusFirst, delay]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.inert = !top;
    if (!top) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') trapTab(e, root);
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [ref, top]);
}

/** The open overlays, inside the app column (HANDOFF §4.3, §5.9) */
export function OverlayHost({
  items,
  onEscape,
}: {
  items: OverlayItem[];
  onEscape: () => boolean;
}) {
  // Esc closes the top overlay, unless it is busy
  const open = items.length > 0;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onEscape]);

  // focus goes back to the trigger once an overlay is gone
  const before = useRef<OverlayItem[]>([]);
  useLayoutEffect(() => {
    const gone = before.current.filter((b) => !items.some((i) => i.id === b.id));
    before.current = items;
    const trigger = gone[0]?.returnFocus;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }, [items]);

  const top = items.findLast((i) => !i.closing)?.id;
  return (
    <div className={styles['vt-overlays']}>
      {items.map((item) => {
        const isTop = item.id === top;
        if (item.kind === 'sheet') return <SheetFrame key={item.id} item={item} top={isTop} />;
        if (item.kind === 'dialog') return <DialogFrame key={item.id} item={item} top={isTop} />;
        return <LayerFrame key={item.id} item={item} top={isTop} />;
      })}
    </div>
  );
}

/** A bottom sheet (js/app.js `sheet`): grab bar, title, close button, scrolling body */
function SheetFrame({ item, top }: { item: Of<'sheet'>; top: boolean }) {
  const { options, handle, closing } = item;
  const titleId = useId();
  const ref = useEnterClass<HTMLDivElement>(styles['is-open']);
  useFrame(ref, top, '[data-autofocus], [data-close]', 60);
  return (
    <div ref={ref} className={clsx(styles.ov, options.className, closing && styles['is-closing'])}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a pointer target: the keyboard closes the sheet with Esc or its close button */}
      <div className={styles['ov-scrim']} onClick={handle.close} />
      <div
        className={clsx(styles.sheet, options.full && styles['sheet--full'])}
        role="dialog"
        aria-modal="true"
        aria-labelledby={options.title ? titleId : undefined}
        aria-label={options.title ? undefined : '详情'}
      >
        <div className={styles['sheet-grab']} aria-hidden="true" />
        {options.title && (
          <div className={styles['sheet-head']}>
            <h3 id={titleId}>{options.title}</h3>
            <IconButton icon="close" size={22} label="关闭" data-close onClick={handle.close} />
          </div>
        )}
        <div className={styles['sheet-body']}>{options.render(handle)}</div>
      </div>
    </div>
  );
}

/** A confirmation dialog (js/app.js `dialog`); tapping the scrim does nothing */
function DialogFrame({ item, top }: { item: Of<'dialog'>; top: boolean }) {
  const { options, closing } = item;
  const ref = useEnterClass<HTMLDivElement>(styles['is-open']);
  useFrame(ref, top, '[data-autofocus]', 50);
  const lines = options.text?.split('\n') ?? [];
  return (
    <div
      ref={ref}
      className={clsx(
        styles.ov,
        styles['ov--layer'],
        styles['ov--dialog'],
        closing && styles['is-closing'],
      )}
      role="dialog"
      aria-modal="true"
      aria-label={options.title}
    >
      <div className={styles['ov-scrim']} />
      <div className={styles.dialog}>
        <h3>{options.title}</h3>
        {lines.length > 0 && (
          <p>
            {lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </p>
        )}
        <div className={styles['dialog-actions']}>
          {options.cancel !== false && (
            <Button variant="ghost" onClick={() => item.answer(false)}>
              {options.cancel ?? '取消'}
            </Button>
          )}
          <Button variant="dark" data-autofocus onClick={() => item.answer(true)}>
            {options.ok ?? '确定'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A full-screen layer (js/app.js `layer`): the camera, avatar generation, the cashier */
function LayerFrame({ item, top }: { item: Of<'layer'>; top: boolean }) {
  const { options, handle, closing } = item;
  const ref = useEnterClass<HTMLDivElement>(styles['is-open']);
  useFrame(ref, top, '[data-autofocus]', 0);
  return (
    <div
      ref={ref}
      className={clsx(
        styles.ov,
        styles['ov--layer'],
        options.className,
        closing && styles['is-closing'],
      )}
      role="dialog"
      aria-modal="true"
      aria-label={options.label}
      tabIndex={-1}
    >
      {options.render(handle)}
    </div>
  );
}
