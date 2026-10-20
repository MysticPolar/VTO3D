/**
 * One opening of the live try-on layer, from the permission explainer to closing, independent of
 * any UI framework. The view subscribes to `ViewState` and calls the methods.
 *
 * States: the prototype's camera layer (js/camera.js) has intro → wait → live, or error. Live
 * try-on adds `connecting` (camera on, model not yet streaming: the camera shows meanwhile),
 * `reconnecting` (the SDK is re-dialling after a drop) and `ended` (time cap, page hidden, or the
 * server ended the session).
 *
 * Stop rules (HANDOFF §9.10, plus what live try-on adds because every second is billed):
 * - every start, retry and switch stops the previous camera stream and model session first
 * - closing stops everything; a camera stream or model connection that arrives afterwards is
 *   stopped at once (the `run` counter marks async work from an earlier start as stale)
 * - the page going hidden stops everything and shows the `ended` panel
 * - the session stops itself at `maxSessionSeconds`, the same cap the token carries to Decart
 * - when the server ends a session for any reason, the page disconnects instead of letting the
 *   SDK's automatic reconnect start a new, billed session; reconnect token requests after an end
 *   are refused
 */
import { ServiceError } from './api.js';
import { DRAFT, type Problem, VERBATIM } from './copy.js';
import type { TokenGrant } from './protocol.js';
import type {
  ConnectionStats,
  LiveGarment,
  LiveTryOnApi,
  RealtimeConnection,
  RealtimeConnector,
} from './types.js';

export type Phase = 'intro' | 'wait' | 'connecting' | 'live' | 'reconnecting' | 'ended' | 'error';

export interface ViewState {
  phase: Phase;
  /** Why a panel is shown (phase `error` or `ended`) */
  problem: Problem | null;
  /** The camera, shown mirrored for the front camera while the model connects */
  localStream: MediaStream | null;
  mirrorLocal: boolean;
  /** The model's output: the person wearing the garment */
  remoteStream: MediaStream | null;
  /** True once two or more cameras are known; the switch button shows only while live */
  canSwitch: boolean;
  /** The garment picked on the rail */
  garmentId: string;
  /** The garment the model was last told to show */
  appliedId: string | null;
  /** A garment being sent to the model right now */
  applyingId: string | null;
  /** Decart is at capacity or has queued the session */
  waiting: { kind: 'capacity' } | { kind: 'queue'; position: number } | null;
  /** Seconds generated in this run, across reconnects: what Decart bills */
  seconds: number;
  sessionId: string | null;
  stats: ConnectionStats | null;
  /** The session cap, from the token grant */
  maxSessionSeconds: number;
}

export interface MediaDevicesLike {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
}

export interface Timers {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface SessionDeps {
  /** null where there is no `navigator.mediaDevices.getUserMedia` (an insecure context) */
  media: MediaDevicesLike | null;
  /** RTCPeerConnection exists */
  webrtc: boolean;
  connector: RealtimeConnector;
  api: LiveTryOnApi;
  garments: readonly LiveGarment[];
  initialGarmentId: string;
  /** Decart fast mode (twice the price) */
  fast?: boolean;
  /** Default cap until a token grant says otherwise */
  maxSessionSeconds: number;
  loadImage(url: string): Promise<Blob>;
  toast(message: string, ms?: number): void;
  now?: () => number;
  timers?: Timers;
  log?(event: string, data?: Record<string, unknown>): void;
}

/** lucy-vton-3.6's realtime input (the SDK's model registry): 1280×720, up to 30 fps */
export const CAMERA = { width: 1280, height: 720, fps: 30 } as const;

/** A connected session that hasn't started generating by then is given up (queue updates reset it) */
export const FIRST_FRAME_TIMEOUT_MS = 30_000;

const ACTIVE: readonly Phase[] = ['wait', 'connecting', 'live', 'reconnecting'];

/** Thrown to the SDK when it asks for a reconnect token after the session was ended on purpose */
class SessionOver extends Error {
  constructor() {
    super('The live try-on session is over');
    this.name = 'SessionOver';
  }
}

const stopTracks = (stream: MediaStream | null) => stream?.getTracks().forEach((t) => t.stop());

/** What a failed connect means for the user */
export function connectProblem(error: unknown): Problem {
  if (error instanceof ServiceError) return { kind: 'service', code: error.code };
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown };
  const text = String(message ?? '').toLowerCase();
  if (text.includes('session limit reached')) return { kind: 'service', code: 'session_limit' };
  if (text.includes('capacity')) return { kind: 'service', code: 'busy' };
  if (
    typeof code === 'string' &&
    (code.startsWith('WEBRTC_') || code === 'LIVEKIT_INITIALIZATION_ERROR')
  ) {
    return { kind: 'service', code: 'network' };
  }
  return { kind: 'service', code: 'unavailable' };
}

/** What the server ending a session means, from its reason and how long the session ran */
export function endProblem(
  reason: string | null,
  ranSeconds: number,
  capSeconds: number,
  lastError: string | null,
): Problem {
  switch (reason) {
    case 'timeout':
      return { kind: 'ended', reason: 'timeout' };
    case 'insufficient_credits':
      return { kind: 'service', code: 'credits' };
    case 'moderation_violation':
    case 'policy_violation':
      return { kind: 'service', code: 'moderation' };
    case 'session_limit':
      return { kind: 'service', code: 'session_limit' };
  }
  // Decart's own maxSessionDuration ends the session a moment before the page's timer would
  if (ranSeconds >= capSeconds - 10) return { kind: 'ended', reason: 'timeout' };
  if (reason === null && lastError?.startsWith('WEBRTC_'))
    return { kind: 'service', code: 'network' };
  return { kind: 'ended', reason: 'remote' };
}

export class LiveTryOnSession {
  private state: ViewState;
  private readonly listeners = new Set<(state: ViewState) => void>();
  private readonly deps: SessionDeps;
  private readonly now: () => number;
  private readonly timers: Timers;

  /** Bumped by every start and stop; async work from an older run is stale and cleans up after itself */
  private run = 0;
  private closed = false;
  private conn: RealtimeConnection | null = null;
  private stream: MediaStream | null = null;
  private facing: 'user' | 'environment' = 'user';
  private devices: MediaDeviceInfo[] = [];
  private grants: TokenGrant[] = [];
  private secondsBase = 0;
  private lastTick = 0;
  private generatingSince: number | null = null;
  private capTimer: unknown = null;
  private watchdog: unknown = null;
  private lastError: string | null = null;
  private pendingGarment: string | null = null;
  private applyChain: Promise<void> = Promise.resolve();

  constructor(deps: SessionDeps) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
    this.timers = deps.timers ?? {
      set: (fn, ms) => setTimeout(fn, ms),
      clear: (h) => clearTimeout(h as number),
    };
    const garment = deps.garments.find((g) => g.id === deps.initialGarmentId) ?? deps.garments[0];
    if (!garment) throw new Error('No garments');
    this.state = {
      phase: 'intro',
      problem: null,
      localStream: null,
      mirrorLocal: true,
      remoteStream: null,
      canSwitch: false,
      garmentId: garment.id,
      appliedId: null,
      applyingId: null,
      waiting: null,
      seconds: 0,
      sessionId: null,
      stats: null,
      maxSessionSeconds: deps.maxSessionSeconds,
    };
  }

  get view(): ViewState {
    return this.state;
  }

  subscribe(listener: (state: ViewState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private set(patch: Partial<ViewState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  private stale(run: number) {
    return run !== this.run || this.closed;
  }

  private garment(id: string): LiveGarment {
    const garment = this.deps.garments.find((g) => g.id === id);
    if (!garment) throw new Error(`Unknown garment ${id}`);
    return garment;
  }

  private log(event: string, data?: Record<string, unknown>) {
    this.deps.log?.(event, data);
  }

  /** 允许使用摄像头 / 重试 / 重新开始 / 继续试衣, and every camera switch */
  async start(video?: MediaTrackConstraints, switching = false): Promise<void> {
    if (this.closed) return;
    const { media, webrtc } = this.deps;
    if (!media) return this.fail({ kind: 'camera', name: 'Unsupported' });
    if (!webrtc) return this.fail({ kind: 'unsupported' });

    this.stop();
    const run = this.run;
    this.set({ phase: 'wait', problem: null });
    // fetch the garment photo while the permission prompt is up, not after it
    const garment = this.garment(this.state.garmentId);
    const photo = this.deps.loadImage(garment.image);
    photo.catch(() => {});

    let stream: MediaStream;
    try {
      stream = await media.getUserMedia({
        video: video ?? {
          facingMode: this.facing,
          width: { ideal: CAMERA.width },
          height: { ideal: CAMERA.height },
          frameRate: { ideal: CAMERA.fps, max: CAMERA.fps },
        },
        audio: false,
      });
    } catch (error) {
      if (this.stale(run)) return;
      const name = (error as { name?: unknown } | null)?.name;
      this.log('camera error', { name, message: (error as Error | null)?.message });
      return this.fail({ kind: 'camera', name: typeof name === 'string' ? name : 'Error' });
    }
    if (this.stale(run)) {
      stopTracks(stream);
      return;
    }

    this.stream = stream;
    const settings = stream.getVideoTracks()[0]?.getSettings?.() ?? {};
    // as in the prototype: mirrored unless the track says it is the back camera
    const mirror = (settings.facingMode ?? this.facing) !== 'environment';
    this.set({ phase: 'connecting', localStream: stream, mirrorLocal: mirror });
    if (switching) this.deps.toast(VERBATIM.switched);
    void this.findCameras(run);

    let image: Blob;
    try {
      image = await photo;
    } catch {
      if (this.stale(run)) return;
      return this.fail({ kind: 'service', code: 'network' });
    }
    if (this.stale(run)) return;

    let conn: RealtimeConnection;
    try {
      conn = await this.deps.connector.connect({
        stream,
        mirror,
        fast: Boolean(this.deps.fast),
        garment: { prompt: garment.prompt, image, enhance: false },
        getToken: () => this.token(run),
        onRemoteStream: (remote) => {
          if (!this.stale(run)) this.set({ remoteStream: remote });
        },
        onWaiting: (wait) => {
          if (this.stale(run)) return;
          this.set({
            waiting:
              wait.kind === 'queue'
                ? { kind: 'queue', position: wait.position }
                : { kind: 'capacity' },
          });
          if (this.conn) this.armWatchdog(run);
        },
      });
    } catch (error) {
      if (this.stale(run)) return;
      this.log('connect failed', { error: describe(error) });
      return this.fail(connectProblem(error));
    }
    if (this.stale(run)) {
      conn.disconnect();
      return;
    }

    this.conn = conn;
    this.set({ appliedId: garment.id, sessionId: conn.sessionId, waiting: null });
    this.armWatchdog(run);
    conn.on('state', (s) => this.onState(run, s));
    conn.on('tick', (seconds) => this.onTick(run, seconds));
    conn.on('ended', (reason) => {
      if (this.stale(run)) return;
      this.log('server ended the session', { reason });
      this.finish(
        endProblem(reason, this.ranSeconds(), this.state.maxSessionSeconds, this.lastError),
      );
    });
    conn.on('error', (error) => {
      if (this.stale(run)) return;
      this.lastError = error.code;
      this.log('session error', { code: error.code, message: error.message });
    });
    conn.on('stats', (stats) => {
      if (!this.stale(run)) this.set({ stats });
    });
    conn.on('diagnostic', (event) => {
      if (!this.stale(run))
        this.log(`diagnostic ${event.name}`, event.data as Record<string, unknown>);
    });
    // a garment picked while connecting goes on as soon as the session can take it
    if (this.state.garmentId !== garment.id) this.queueGarment(this.state.garmentId);
  }

  /** The SDK's apiKeyProvider: a fresh client token for every dial of this run, none after it ended */
  private async token(run: number): Promise<string> {
    if (this.stale(run)) throw new SessionOver();
    const grant = await this.deps.api.token();
    if (this.stale(run)) {
      this.deps.api.reportUsage(grant.reservationId, 0);
      throw new SessionOver();
    }
    this.grants.push(grant);
    this.set({ maxSessionSeconds: grant.maxSessionSeconds });
    return grant.apiKey;
  }

  private async findCameras(run: number) {
    try {
      const all = await this.deps.media?.enumerateDevices();
      if (this.stale(run)) return;
      this.devices = (all ?? []).filter((d) => d.kind === 'videoinput');
    } catch {
      this.devices = [];
    }
    if (!this.stale(run)) this.set({ canSwitch: this.devices.length >= 2 });
  }

  private armWatchdog(run: number) {
    if (this.watchdog !== null) this.timers.clear(this.watchdog);
    this.watchdog = this.timers.set(() => {
      this.watchdog = null;
      if (this.stale(run) || this.generatingSince !== null) return;
      this.log('no output in time');
      this.finish({ kind: 'service', code: 'unavailable' });
    }, FIRST_FRAME_TIMEOUT_MS);
  }

  private onState(run: number, state: string) {
    if (this.stale(run)) return;
    if (state === 'generating') {
      if (this.watchdog !== null) this.timers.clear(this.watchdog);
      this.watchdog = null;
      if (this.state.phase === 'connecting' || this.state.phase === 'reconnecting') {
        this.set({ phase: 'live', waiting: null });
      }
      if (this.generatingSince === null) {
        this.generatingSince = this.now();
        this.capTimer = this.timers.set(() => {
          if (!this.stale(run)) this.finish({ kind: 'ended', reason: 'timeout' });
        }, this.state.maxSessionSeconds * 1000);
      }
    } else if (state === 'reconnecting') {
      this.set({ phase: 'reconnecting' });
    } else if (state === 'disconnected') {
      // the SDK gave up reconnecting, or the server closed without saying why
      this.log('disconnected', { lastError: this.lastError });
      this.finish(
        endProblem(null, this.ranSeconds(), this.state.maxSessionSeconds, this.lastError),
      );
    }
  }

  private onTick(run: number, seconds: number) {
    if (this.stale(run)) return;
    // ticks count per server session, so a reconnect starts them again from zero
    if (seconds < this.lastTick) this.secondsBase += this.lastTick;
    this.lastTick = seconds;
    this.set({ seconds: this.secondsBase + seconds });
  }

  private ranSeconds() {
    return this.generatingSince === null ? 0 : (this.now() - this.generatingSince) / 1000;
  }

  /** Picking a garment on the rail; while a session runs it is sent to the model */
  selectGarment(id: string) {
    if (!this.deps.garments.some((g) => g.id === id) || id === this.state.garmentId) return;
    this.set({ garmentId: id });
    if (this.conn) this.queueGarment(id);
  }

  /** Only the latest pick is sent; picks made while one is in flight wait for it */
  private queueGarment(id: string) {
    this.pendingGarment = id;
    const run = this.run;
    this.applyChain = this.applyChain.then(() => this.applyPending(run));
  }

  private async applyPending(run: number) {
    const id = this.pendingGarment;
    this.pendingGarment = null;
    const conn = this.conn;
    if (id === null || this.stale(run) || !conn || id === this.state.appliedId) return;
    const garment = this.garment(id);
    this.set({ applyingId: id });
    try {
      const image = await this.deps.loadImage(garment.image);
      if (this.stale(run)) return;
      await conn.set({ prompt: garment.prompt, image, enhance: false });
      if (this.stale(run)) return;
      this.set({ appliedId: id });
      if (this.pendingGarment === null) this.deps.toast(VERBATIM.tried(garment.name));
    } catch (error) {
      if (this.stale(run)) return;
      this.log('garment refused', { id, error: describe(error) });
      this.deps.toast(DRAFT.garmentFailed);
      // the model still wears the last garment it accepted: show that one as picked
      if (this.pendingGarment === null && this.state.appliedId)
        this.set({ garmentId: this.state.appliedId });
    } finally {
      if (!this.stale(run)) this.set({ applyingId: null });
    }
  }

  /** 切换前后摄像头: the next other camera, by exact device id, in a new session */
  async switchCamera(): Promise<void> {
    if (this.state.phase !== 'live' || this.devices.length < 2) return;
    const current = this.stream?.getVideoTracks()[0]?.getSettings?.().deviceId;
    const at = this.devices.findIndex((d) => d.deviceId === current);
    const next = this.devices[(at + 1) % this.devices.length];
    if (!next) return;
    this.facing = this.facing === 'user' ? 'environment' : 'user';
    await this.start(
      {
        deviceId: { exact: next.deviceId },
        width: { ideal: CAMERA.width },
        height: { ideal: CAMERA.height },
        frameRate: { ideal: CAMERA.fps, max: CAMERA.fps },
      },
      true,
    );
  }

  /** The panel's primary button */
  retry() {
    const { problem } = this.state;
    if (
      problem?.kind === 'service' &&
      (problem.code === 'access_code_required' || problem.code === 'access_code_invalid')
    ) {
      // back to the explainer, where the access code is entered
      this.set({ phase: 'intro', problem: null });
      return;
    }
    void this.start();
  }

  /** visibilitychange → hidden (and 首页 leaving the screen): stop, keep the layer open */
  pause() {
    if (this.closed || !ACTIVE.includes(this.state.phase)) return;
    this.finish({ kind: 'ended', reason: 'hidden' });
  }

  /** ✕, 暂不开启, 返回试衣间, Esc, back, any navigation: stop everything for good */
  close() {
    if (this.closed) return;
    this.stop();
    this.closed = true;
    this.listeners.clear();
  }

  get isClosed() {
    return this.closed;
  }

  private finish(problem: Problem) {
    this.stop();
    this.set({ phase: problem.kind === 'ended' ? 'ended' : 'error', problem });
  }

  private fail(problem: Problem) {
    this.stop();
    this.set({ phase: 'error', problem });
  }

  /** Disconnects the model, stops the camera, reports usage; anything still in flight goes stale */
  private stop() {
    this.run += 1;
    if (this.capTimer !== null) this.timers.clear(this.capTimer);
    if (this.watchdog !== null) this.timers.clear(this.watchdog);
    this.capTimer = null;
    this.watchdog = null;
    const conn = this.conn;
    this.conn = null;
    conn?.disconnect();
    stopTracks(this.stream);
    this.stream = null;
    this.reportUsage();
    this.generatingSince = null;
    this.secondsBase = 0;
    this.lastTick = 0;
    this.lastError = null;
    this.pendingGarment = null;
    this.set({
      localStream: null,
      remoteStream: null,
      canSwitch: false,
      applyingId: null,
      waiting: null,
      sessionId: null,
      stats: null,
      appliedId: null,
    });
  }

  /** Spreads the seconds Decart generated over this run's reservations, so unused budget goes back */
  private reportUsage() {
    let left = this.state.seconds;
    for (const grant of this.grants) {
      const used = Math.min(left, grant.maxSessionSeconds);
      left -= used;
      this.deps.api.reportUsage(grant.reservationId, used);
    }
    this.grants = [];
    if (this.state.seconds) this.set({ seconds: 0 });
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown };
  return `${String(code ?? 'error')}: ${String(message ?? '')}`;
}
