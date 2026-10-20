/**
 * The test page: 首页's backdrop with its camera button, which opens the live try-on layer.
 *
 * Query options:
 *   ?open=1            open the layer at once
 *   ?garment=<id>      the garment to start in (default black-blazer)
 *   ?fast=1            Decart fast mode (lower latency, twice the price)
 *   ?debug=1           latency, frame rate and running cost on screen, events in the console
 *   ?source=sample     film the base avatar instead of a camera (no webcam needed)
 *   ?connector=fake    dev server only: no Decart, no key, no cost (for tests)
 */
import './styles.css';
import { httpApi } from '../core/api.js';
import { DRAFT, VERBATIM } from '../core/copy.js';
import { decartConnector } from '../core/decart-connector.js';
import type { ServiceInfo } from '../core/protocol.js';
import { LiveTryOnSession, type MediaDevicesLike } from '../core/session.js';
import type { LiveTryOnApi, RealtimeConnector } from '../core/types.js';
import { CATEGORIES, DEFAULT_GARMENT, GARMENTS, garmentById } from '../catalog/index.js';
import { icon } from './icons.js';
import { type Layer, mountLayer } from './layer.js';
import { sampleCamera } from './sample-camera.js';

const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const fast = params.get('fast') === '1';
const initialGarment = garmentById(params.get('garment') ?? '')?.id ?? DEFAULT_GARMENT;

/* the tester's access code: a per-device convenience, so storage may fail (private mode) */
const CODE_KEY = 'live-tryon:access-code';
let accessCode = '';
try {
  accessCode = localStorage.getItem(CODE_KEY) ?? '';
} catch {
  // no storage: the code is asked for again next time
}
const rememberCode = (code: string) => {
  accessCode = code;
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {
    // ignore
  }
};

const http = httpApi({ accessCode: () => accessCode || null });
let info: ServiceInfo | null = null;
const infoReady = http
  .health()
  .then((i) => {
    info = i;
    if (debug) console.info('[live-tryon] service', i);
  })
  .catch((error: unknown) => console.warn('[live-tryon] /api/health failed', error));

const api: LiveTryOnApi = http;

/* garment photos are fetched once and handed to the model as bytes */
const images = new Map<string, Promise<Blob>>();
function loadImage(url: string): Promise<Blob> {
  let blob = images.get(url);
  if (!blob) {
    blob = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return res.blob();
    });
    blob.catch(() => images.delete(url));
    images.set(url, blob);
  }
  return blob;
}

async function connector(): Promise<RealtimeConnector> {
  if (import.meta.env.DEV && params.get('connector') === 'fake') {
    return (await import('./fake-connector.js')).fakeConnector();
  }
  return decartConnector();
}

function media(): MediaDevicesLike | null {
  if (params.get('source') === 'sample') return sampleCamera('/proto/avatar-base.webp');
  const devices = navigator.mediaDevices;
  return devices && typeof devices.getUserMedia === 'function' ? devices : null;
}

/* 首页 backdrop: plate, avatar, title and the camera button */
const app = document.getElementById('app') as HTMLElement;
app.innerHTML = `
  <div class="fit-plate" aria-hidden="true"></div>
  <div class="fit-avatar"><img src="/proto/avatar-base.webp" alt="" decoding="async" draggable="false"></div>
  <h1 class="fit-title">${VERBATIM.roomTitle}</h1>
  <button type="button" class="fit-cam" aria-label="${DRAFT.openLabel}">${icon('video-filled', { size: 19 })}</button>`;
const camButton = app.querySelector('.fit-cam') as HTMLButtonElement;

let open: { session: LiveTryOnSession; layer: Layer } | null = null;

async function openLayer() {
  if (open) return;
  await infoReady;
  const session = new LiveTryOnSession({
    media: media(),
    webrtc: typeof RTCPeerConnection === 'function',
    connector: await connector(),
    api: {
      health: () => api.health(),
      // a code that got a token is a good code: remember it on this device
      token: async () => {
        const grant = await api.token();
        if (accessCode) rememberCode(accessCode);
        return grant;
      },
      reportUsage: (id, seconds) => api.reportUsage(id, seconds),
    },
    garments: GARMENTS,
    initialGarmentId: initialGarment,
    fast,
    maxSessionSeconds: info?.maxSessionSeconds ?? 120,
    loadImage,
    toast: (message, ms) => open?.layer.toast(message, ms),
    log: debug
      ? (event, data) => console.info(`[live-tryon] ${event}`, data ? JSON.stringify(data) : '')
      : undefined,
  });
  const layer = mountLayer({
    host: app,
    session,
    garments: GARMENTS,
    categories: CATEGORIES,
    accessCodeRequired: () => info?.accessCode === 'required',
    accessCode: { get: () => accessCode, set: (code) => (accessCode = code) },
    debug,
    pricePerSecondUsd: () =>
      fast ? (info?.pricePerSecondUsd.fast ?? 0.04) : (info?.pricePerSecondUsd.standard ?? 0.02),
    onClose: () => history.back(),
  });
  open = { session, layer };
  if (debug) {
    // for the measurement runs: every phase and garment change, with a timestamp
    const timeline: {
      t: number;
      phase: string;
      applied: string | null;
      applying: string | null;
    }[] = [];
    let last = '';
    session.subscribe((s) => {
      const key = `${s.phase}|${s.appliedId}|${s.applyingId}`;
      if (key === last) return;
      last = key;
      timeline.push({
        t: performance.now(),
        phase: s.phase,
        applied: s.appliedId,
        applying: s.applyingId,
      });
    });
    Object.assign(window, { liveTryOnSession: session, liveTryOnTimeline: timeline });
  }
  // the layer is a history entry, so the browser's back button (and WeChat's) closes it
  history.pushState({ liveTryOn: true }, '');
}

function closeLayer() {
  if (!open) return;
  const { session, layer } = open;
  open = null;
  session.close();
  layer.destroy();
  camButton.focus({ preventScroll: true });
}

camButton.addEventListener('click', () => void openLayer());
window.addEventListener('popstate', closeLayer);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && open) history.back();
});
// stop rules: hidden page → stop and show the paused panel; leaving the page → stop for good
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') open?.session.pause();
});
window.addEventListener('pagehide', () => open?.session.close());

if (params.get('open') === '1') void openLayer();
// a page restored from the back/forward cache comes back with a stopped session: close its layer
window.addEventListener('pageshow', (event) => {
  if (event.persisted) closeLayer();
});
