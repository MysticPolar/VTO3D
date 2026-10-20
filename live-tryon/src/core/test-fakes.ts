/**
 * Test doubles for the session: cameras, the model connection and the back end, all controllable
 * step by step. Used by the unit tests; the e2e fake connector lives in fake-connector.ts.
 */
import type { TokenGrant } from './protocol.js';
import type { MediaDevicesLike, Timers } from './session.js';
import type {
  ConnectionEvents,
  ConnectOptions,
  GarmentInput,
  LiveGarment,
  LiveTryOnApi,
  RealtimeConnection,
  RealtimeConnector,
} from './types.js';

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets pending promise callbacks run */
export const flush = async (rounds = 5) => {
  for (let i = 0; i < rounds; i += 1) await new Promise((r) => setTimeout(r, 0));
};

export class FakeTrack {
  readyState: 'live' | 'ended' = 'live';
  readonly kind = 'video';
  private readonly settings: MediaTrackSettings;
  constructor(settings: MediaTrackSettings) {
    this.settings = settings;
  }
  stop() {
    this.readyState = 'ended';
  }
  getSettings() {
    return this.settings;
  }
}

export class FakeStream {
  readonly tracks: FakeTrack[];
  constructor(settings: MediaTrackSettings = { facingMode: 'user', deviceId: 'front' }) {
    this.tracks = [new FakeTrack(settings)];
  }
  getTracks() {
    return this.tracks;
  }
  getVideoTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return [];
  }
  get live() {
    return this.tracks.some((t) => t.readyState === 'live');
  }
}

export const asStream = (s: FakeStream) => s as unknown as MediaStream;

export class FakeMedia implements MediaDevicesLike {
  readonly requests: MediaStreamConstraints[] = [];
  readonly pending: ReturnType<typeof deferred<MediaStream>>[] = [];
  devices: { kind: string; deviceId: string }[] = [{ kind: 'videoinput', deviceId: 'front' }];
  /** Answer requests at once with this stream factory; null = leave them pending */
  auto: (() => FakeStream) | null = () => new FakeStream();
  readonly streams: FakeStream[] = [];

  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    this.requests.push(constraints);
    if (this.auto) {
      const stream = this.auto();
      this.streams.push(stream);
      return Promise.resolve(asStream(stream));
    }
    const d = deferred<MediaStream>();
    this.pending.push(d);
    return d.promise;
  }
  async enumerateDevices() {
    return this.devices as MediaDeviceInfo[];
  }
}

export class FakeConnection implements RealtimeConnection {
  sessionId: string | null = 'sess-1';
  disconnected = false;
  readonly sets: GarmentInput[] = [];
  /** null = set() resolves at once; otherwise each call waits for the next of these */
  readonly setReplies: ReturnType<typeof deferred<void>>[] = [];
  holdSets = false;
  private readonly listeners = new Map<string, Set<(...args: never[]) => void>>();

  set(garment: GarmentInput): Promise<void> {
    this.sets.push(garment);
    if (!this.holdSets) return Promise.resolve();
    const d = deferred<void>();
    this.setReplies.push(d);
    return d.promise;
  }
  disconnect() {
    this.disconnected = true;
    // the SDK reports its own teardown; the session must ignore it
    this.emit('state', 'disconnected');
  }
  on<E extends keyof ConnectionEvents>(event: E, listener: ConnectionEvents[E]) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)?.add(listener as (...args: never[]) => void);
  }
  emit<E extends keyof ConnectionEvents>(event: E, ...args: Parameters<ConnectionEvents[E]>) {
    for (const listener of this.listeners.get(event) ?? [])
      (listener as unknown as (...a: typeof args) => void)(...args);
  }
}

export class FakeConnector implements RealtimeConnector {
  readonly calls: ConnectOptions[] = [];
  readonly pending: ReturnType<typeof deferred<RealtimeConnection>>[] = [];
  readonly connections: FakeConnection[] = [];
  /** true: connect() asks for a token and resolves at once */
  auto = true;

  async connect(options: ConnectOptions): Promise<RealtimeConnection> {
    this.calls.push(options);
    if (this.auto) {
      await options.getToken();
      const conn = new FakeConnection();
      this.connections.push(conn);
      return conn;
    }
    const d = deferred<RealtimeConnection>();
    this.pending.push(d);
    return d.promise;
  }
  get last() {
    return this.connections.at(-1);
  }
}

export class FakeApi implements LiveTryOnApi {
  tokens = 0;
  readonly reports: { reservationId: string; seconds: number }[] = [];
  maxSessionSeconds = 120;
  failWith: unknown = null;

  async health() {
    return {
      ok: true as const,
      model: 'lucy-vton-3.6',
      keyConfigured: true,
      accessCode: 'none' as const,
      maxSessionSeconds: this.maxSessionSeconds,
      dailyMinutes: 20,
      budgetStore: 'memory' as const,
      pricePerSecondUsd: { standard: 0.02, fast: 0.04 },
    };
  }
  async token(): Promise<TokenGrant> {
    if (this.failWith) throw this.failWith;
    this.tokens += 1;
    return {
      apiKey: `client-token-${this.tokens}`,
      expiresAt: '2026-10-20T12:01:00Z',
      model: 'lucy-vton-3.6',
      maxSessionSeconds: this.maxSessionSeconds,
      reservationId: `2026-10-20.res${String(this.tokens).padStart(6, '0')}`,
    };
  }
  reportUsage(reservationId: string, seconds: number) {
    this.reports.push({ reservationId, seconds });
  }
}

/** Timers you fire by hand */
export class ManualTimers implements Timers {
  private next = 1;
  readonly active = new Map<number, { fn: () => void; ms: number }>();
  set(fn: () => void, ms: number) {
    const id = this.next++;
    this.active.set(id, { fn, ms });
    return id;
  }
  clear(handle: unknown) {
    this.active.delete(handle as number);
  }
  /** Fires every timer of `ms` (or all) */
  fire(ms?: number) {
    for (const [id, t] of [...this.active]) {
      if (ms === undefined || t.ms === ms) {
        this.active.delete(id);
        t.fn();
      }
    }
  }
}

export const GARMENTS: LiveGarment[] = [
  {
    id: 'black-blazer',
    name: '黑色西装外套',
    slot: 'outer',
    image: '/catalog/black-blazer.webp',
    thumb: '',
    prompt: 'P-blazer',
    lowRes: false,
  },
  {
    id: 'white-tee',
    name: '纯棉圆领T恤',
    slot: 'top',
    image: '/catalog/white-tee.webp',
    thumb: '',
    prompt: 'P-tee',
    lowRes: false,
  },
  {
    id: 'grey-hoodie',
    name: '灰色连帽卫衣',
    slot: 'top',
    image: '/catalog/grey-hoodie.webp',
    thumb: '',
    prompt: 'P-hoodie',
    lowRes: false,
  },
];

/** Every image "loads" as a tiny blob named after its URL */
export const loadImage = async (url: string) => new Blob([url], { type: 'image/webp' });
