import { useState, type Dispatch, type SetStateAction } from 'react';
import type { NavigateFunction, NavigationType } from 'react-router';
import type {
  OverlayApi,
  OverlayHandle,
  OverlayItem,
  ToastItem,
} from '@/components/Overlay/OverlayContext';
import { prefersReducedMotion } from '@/lib/motion';
import type { HistoryState } from './history';

/** Overlays are removed 280 ms after closing (HANDOFF §5.4), at once with reduced motion */
const REMOVE_MS = 280;

/** The control the pointer last pressed. Safari, on macOS and iOS, doesn't focus a button that is
 * clicked or tapped, so there document.activeElement can't say which control opened an overlay. */
let pressed: { el: HTMLElement; at: number } | null = null;
if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const el =
        e.target instanceof Element
          ? e.target.closest<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')
          : null;
      pressed = el ? { el, at: performance.now() } : null;
    },
    true,
  );
}

/** Where focus returns when an overlay closes: the control that opened it */
function openerOf(): HTMLElement | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) return active;
  return pressed && performance.now() - pressed.at < 1000 ? pressed.el : null;
}

/** The current history entry, kept up to date by NavRoot */
export interface Live {
  idx: number;
  path: string;
}

export interface OverlayController {
  api: OverlayApi;
  anyOpen(): boolean;
  /** close the top overlay as the user would (Esc); false when none is open */
  closeTop(): boolean;
  /** navigating from inside an overlay: close them all at once, without touching history */
  closeAllNow(): void;
  toastDone(id: number): void;
  /** after every location change; true when it navigated again, so the caller stops there */
  sync(state: HistoryState, action: NavigationType, fullPath: string, first: boolean): boolean;
}

/**
 * The overlay history rule (HANDOFF §4.3): opening an overlay pushes `{ idx + 1, same path,
 * overlay }`; closing it from the UI goes back one entry, and the overlay closes when its entry
 * is no longer current; a busy overlay puts its entry back instead.
 */
export function useOverlays(navigate: NavigateFunction, live: { current: Live }) {
  const [items, setItems] = useState<OverlayItem[]>([]);
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [ctl] = useState(() => createController(navigate, live, setItems, setToast));
  return { items, toast, ctl };
}

function createController(
  navigate: NavigateFunction,
  live: { current: Live },
  setItems: (items: OverlayItem[]) => void,
  setToast: Dispatch<SetStateAction<ToastItem | null>>,
): OverlayController {
  // the controller's own copy, so calls in one event handler see each other's changes
  let items: OverlayItem[] = [];
  let seq = 0;
  let toastSeq = 0;

  const commit = (next: OverlayItem[]) => {
    items = next;
    setItems(next);
  };
  const patch = (
    id: string,
    change: Partial<Pick<OverlayItem, 'busy' | 'requested' | 'entryIdx'>>,
  ) => commit(items.map((i) => (i.id === id ? ({ ...i, ...change } as OverlayItem) : i)));

  const closeAnimated = (ids: string[]) => {
    const closing = items.filter((i) => ids.includes(i.id) && !i.closing);
    if (closing.length === 0) return;
    for (const i of closing) i.onClose?.();
    commit(items.map((i) => (closing.includes(i) ? ({ ...i, closing: true } as OverlayItem) : i)));
    const done = closing.map((i) => i.id);
    window.setTimeout(
      () => commit(items.filter((i) => !done.includes(i.id))),
      prefersReducedMotion() ? 0 : REMOVE_MS,
    );
  };

  const requestClose = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || item.closing || item.requested || item.busy) return;
    const back = live.current.idx - item.entryIdx + 1;
    if (back >= 1) {
      patch(id, { requested: true });
      // NavRoot records the entry once its render commits; until then `live` runs ahead
      live.current.idx -= back;
      void navigate(-back);
    } else {
      closeAnimated([id]);
    }
  };

  function open(make: (base: Omit<OverlayItem, 'kind' | 'options' | 'answer'>) => OverlayItem) {
    const { idx, path } = live.current;
    const id = `overlay-${++seq}`;
    const handle: OverlayHandle = {
      close: () => requestClose(id),
      setBusy: (busy) => patch(id, { busy }),
    };
    commit([
      ...items,
      make({
        id,
        entryIdx: idx + 1,
        basePath: path,
        busy: false,
        closing: false,
        requested: false,
        returnFocus: openerOf(),
        handle,
      }),
    ]);
    live.current.idx = idx + 1;
    void navigate(path, {
      replace: false,
      state: { idx: idx + 1, path, overlay: id } satisfies HistoryState,
    });
    return handle;
  }

  const api: OverlayApi = {
    sheet: (options) =>
      open((base) => ({ ...base, kind: 'sheet', options, onClose: options.onClose })),
    layer: (options) =>
      open((base) => ({ ...base, kind: 'layer', options, onClose: options.onClose })),
    dialog: (options) =>
      new Promise<boolean>((resolve) => {
        let answered = false;
        const handle = open((base) => ({
          ...base,
          kind: 'dialog',
          options,
          onClose: () => {
            if (!answered) resolve(false);
          },
          answer: (ok) => {
            if (answered) return;
            answered = true;
            resolve(ok);
            handle.close();
          },
        }));
      }),
    toast: (message, options) => setToast({ ...options, id: ++toastSeq, message }),
  };

  return {
    api,
    anyOpen: () => items.some((i) => !i.closing),
    closeTop: () => {
      const top = items.findLast((i) => !i.closing);
      if (!top) return false;
      requestClose(top.id);
      return true;
    },
    closeAllNow: () => {
      for (const i of items) if (!i.closing) i.onClose?.();
      commit([]);
    },
    toastDone: (id) => setToast((t) => (t?.id === id ? null : t)),
    sync: (state, action, fullPath, first) => {
      const gone = items.filter(
        (i) => !i.closing && (i.entryIdx > state.idx || i.basePath !== state.path),
      );
      const busy = gone.find((i) => i.busy);
      if (busy) {
        // a busy overlay can't be closed: push its entry back and ignore the event
        const idx = state.idx + 1;
        patch(busy.id, { entryIdx: idx, requested: false });
        live.current.idx = idx;
        live.current.path = busy.basePath;
        void navigate(busy.basePath, {
          state: { idx, path: busy.basePath, overlay: busy.id } satisfies HistoryState,
        });
        return true;
      }
      closeAnimated(gone.map((i) => i.id));
      // an overlay entry whose overlay is gone (browser forward, a reload): step over it
      if (state.overlay && !items.some((i) => i.id === state.overlay && !i.closing)) {
        if (action === 'POP' && !first) void navigate(-1);
        else
          void navigate(fullPath, {
            replace: true,
            state: { idx: state.idx, path: state.path } satisfies HistoryState,
          });
        return true;
      }
      return false;
    },
  };
}
