/**
 * `?connector=fake`, dev server only (the production build leaves it out): stands in for Decart
 * so the page can be driven end to end without a key, a network or any cost. The "model output"
 * is the camera drawn onto a canvas with the garment's photo pinned in a corner, so a test can
 * see which garment is on. `window.__liveTryOn` exposes what it was asked to do.
 */
import type {
  ConnectionEvents,
  ConnectionState,
  GarmentInput,
  RealtimeConnection,
  RealtimeConnector,
} from '../core/types.js';

export interface FakeLog {
  connects: { prompt: string; mirror: boolean; fast: boolean; token: string }[];
  sets: string[];
  disconnects: number;
  live: number;
}

declare global {
  interface Window {
    __liveTryOn?: FakeLog;
  }
}

export function fakeConnector(): RealtimeConnector {
  const log: FakeLog = (window.__liveTryOn ??= { connects: [], sets: [], disconnects: 0, live: 0 });
  return {
    async connect(o) {
      const token = await o.getToken();
      log.connects.push({ prompt: o.garment.prompt, mirror: o.mirror, fast: o.fast, token });
      await new Promise((r) => setTimeout(r, 150));

      const source = document.createElement('video');
      source.muted = true;
      source.playsInline = true;
      source.srcObject = o.stream;
      void source.play().catch(() => {});
      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      let garment = await createImageBitmap(o.garment.image).catch(() => null);
      let frame = 0;
      const draw = () => {
        if (ctx) {
          ctx.fillStyle = '#2b2622';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (source.readyState >= 2) ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
          if (garment) ctx.drawImage(garment, canvas.width - 110, canvas.height - 110, 100, 100);
        }
        frame = requestAnimationFrame(draw);
      };
      draw();
      const output = canvas.captureStream(30);
      o.onRemoteStream(output);
      log.live += 1;

      const listeners = new Map<string, Set<(...a: never[]) => void>>();
      const emit = <E extends keyof ConnectionEvents>(
        event: E,
        ...args: Parameters<ConnectionEvents[E]>
      ) => {
        for (const fn of listeners.get(event) ?? [])
          (fn as unknown as (...a: typeof args) => void)(...args);
      };
      let seconds = 0;
      let ticker = 0;
      let closed = false;
      // like the SDK: state changes arrive after connect() resolves
      setTimeout(() => {
        if (closed) return;
        emit('state', 'connected' satisfies ConnectionState);
        emit('state', 'generating');
        ticker = window.setInterval(() => emit('tick', ++seconds), 1000);
      }, 100);

      const conn: RealtimeConnection = {
        sessionId: `fake-${log.connects.length}`,
        async set(g: GarmentInput) {
          log.sets.push(g.prompt);
          await new Promise((r) => setTimeout(r, 200));
          garment = await createImageBitmap(g.image).catch(() => null);
        },
        disconnect() {
          if (closed) return;
          closed = true;
          log.disconnects += 1;
          log.live -= 1;
          clearInterval(ticker);
          cancelAnimationFrame(frame);
          output.getTracks().forEach((t) => t.stop());
          source.srcObject = null;
        },
        on(event, listener) {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)?.add(listener as (...a: never[]) => void);
        },
      };
      return conn;
    },
  };
}
