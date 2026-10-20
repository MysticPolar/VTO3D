import { createContext, useContext, type ReactNode } from 'react';
import type { IconName } from '@/components/Icon/Icon';

export interface OverlayHandle {
  /** close it as the user would: one history entry back, so browser back stays in step */
  close(): void;
  /** a busy overlay (the cashier while 「支付处理中…」) can't be closed */
  setBusy(busy: boolean): void;
}

export interface SheetOptions {
  title?: string;
  /** the tall variant (92 %) */
  full?: boolean;
  className?: string;
  render: (handle: OverlayHandle) => ReactNode;
  onClose?: () => void;
}

export interface LayerOptions {
  label: string;
  className?: string;
  render: (handle: OverlayHandle) => ReactNode;
  onClose?: () => void;
}

export interface DialogOptions {
  title: string;
  text?: string;
  /** 确定 by default */
  ok?: string;
  /** 取消 by default; false hides it */
  cancel?: string | false;
}

export interface ToastOptions {
  icon?: IconName;
  action?: string;
  onAction?: () => void;
  /** 2200 ms, or 3600 ms with an action */
  ms?: number;
}

/** Sheets, dialogs and full-screen layers (HANDOFF §4.3, §5.7). They are not routes: each one
 * pushes a same-URL history entry, so browser back and Esc close the top one. */
export interface OverlayApi {
  sheet(options: SheetOptions): OverlayHandle;
  layer(options: LayerOptions): OverlayHandle;
  /** true for OK; false for 取消 and every other way of closing it */
  dialog(options: DialogOptions): Promise<boolean>;
  /** one at a time, a new one replaces the old; not an overlay, so no history entry */
  toast(message: string, options?: ToastOptions): void;
}

interface ItemBase {
  id: string;
  /** the history index of the entry it pushed */
  entryIdx: number;
  /** the URL it opened over */
  basePath: string;
  busy: boolean;
  /** animating out */
  closing: boolean;
  /** the UI asked to close it and its history entry is popping */
  requested: boolean;
  returnFocus: HTMLElement | null;
  handle: OverlayHandle;
  onClose?: () => void;
}

export type OverlayItem =
  | (ItemBase & { kind: 'sheet'; options: SheetOptions })
  | (ItemBase & { kind: 'layer'; options: LayerOptions })
  | (ItemBase & { kind: 'dialog'; options: DialogOptions; answer: (ok: boolean) => void });

export interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

export const OverlayContext = createContext<OverlayApi | null>(null);

export function useOverlay(): OverlayApi {
  const api = useContext(OverlayContext);
  if (!api) throw new Error('useOverlay outside NavRoot');
  return api;
}
