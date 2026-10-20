/**
 * The real connector: Decart's JavaScript SDK (docs: SDKs → JavaScript → Realtime API).
 *
 * - `apiKeyProvider` asks our back end for a client token right before every dial, including the
 *   SDK's automatic reconnects, so the page never holds the permanent key or a stale token
 * - `telemetry: false`: the SDK otherwise reports session stats to platform.decart.ai; the app
 *   allows no analytics (CLAUDE.md rule 5). Stats still arrive locally for the debug panel
 * - `checkConnectivity()` is never called: its preflight uses stun.l.google.com, a Google service
 * - the first garment goes in `initialState`, so the first output frame already wears it
 */
import {
  createConsoleLogger,
  createDecartClient,
  type DecartSDKError,
  models,
  type RealTimeClient,
  type WebRTCStats,
} from '@decartai/sdk';
import type {
  ConnectionEvents,
  ConnectionStats,
  RealtimeConnection,
  RealtimeConnector,
} from './types.js';

/** Pinned rather than `lucy-vton-latest` (which also points at 3.6 today), so a new release can't change results unannounced */
export const MODEL_ID = 'lucy-vton-3.6';

const ms = (seconds: number | null | undefined) =>
  typeof seconds === 'number' ? Math.round(seconds * 1000) : null;

export function toStats(s: WebRTCStats): ConnectionStats {
  const pair = s.connection.selectedCandidatePairs[0];
  return {
    ttffMs: s.glassToGlass?.ttffMs ?? null,
    g2gMedianMs: s.glassToGlass?.medianMs ?? null,
    g2gP90Ms: s.glassToGlass?.p90Ms ?? null,
    rttMs: ms(s.remoteInbound?.roundTripTime ?? s.connection.currentRoundTripTime),
    fps: s.video?.framesPerSecond ?? null,
    sendFps: s.outboundVideo?.framesPerSecond ?? null,
    frameWidth: s.video?.frameWidth ?? null,
    frameHeight: s.video?.frameHeight ?? null,
    relayed: pair
      ? pair.local.candidateType === 'relay' || pair.remote.candidateType === 'relay'
      : null,
    remote: pair ? `${pair.remote.protocol} ${pair.remote.address}` : null,
  };
}

function wrap(rt: RealTimeClient): RealtimeConnection {
  const listeners: { [E in keyof ConnectionEvents]: Set<ConnectionEvents[E]> } = {
    state: new Set(),
    tick: new Set(),
    ended: new Set(),
    error: new Set(),
    stats: new Set(),
    diagnostic: new Set(),
  };
  const emit = <E extends keyof ConnectionEvents>(
    event: E,
    ...args: Parameters<ConnectionEvents[E]>
  ) => {
    for (const listener of listeners[event]) (listener as (...a: typeof args) => void)(...args);
  };

  // attached before connect()'s caller resumes: the SDK holds back early events until a
  // setTimeout(0) after connect() resolves, so none are missed
  rt.on('connectionChange', (state) => emit('state', state));
  rt.on('generationTick', ({ seconds }) => emit('tick', seconds));
  rt.on('generationEnded', ({ reason }) => emit('ended', reason));
  rt.on('sessionEnded', ({ reason }) => emit('ended', reason));
  rt.on('error', (error: DecartSDKError) =>
    emit('error', { code: error.code, message: error.message }),
  );
  rt.on('stats', (stats) => emit('stats', toStats(stats)));
  rt.on('diagnostic', (event) => emit('diagnostic', { name: event.name, data: event.data }));

  return {
    get sessionId() {
      return rt.sessionId;
    },
    async set(garment) {
      await rt.set({ prompt: garment.prompt, image: garment.image, enhance: garment.enhance });
    },
    disconnect() {
      rt.disconnect();
    },
    on(event, listener) {
      listeners[event].add(listener);
    },
  };
}

export function decartConnector(): RealtimeConnector {
  return {
    async connect(o) {
      const client = createDecartClient({
        apiKeyProvider: o.getToken,
        telemetry: false,
        logger: createConsoleLogger('warn'),
      });
      const rt = await client.realtime.connect(o.stream, {
        model: models.realtime(MODEL_ID),
        mirror: o.mirror,
        ...(o.fast ? { speed: 'fast' as const } : {}),
        onRemoteStream: o.onRemoteStream,
        onCapacityWait: (wait) =>
          o.onWaiting?.({ kind: 'capacity', retryAfterMs: wait.retryAfterMs }),
        onQueuePosition: (queue) => o.onWaiting?.({ kind: 'queue', position: queue.position }),
        initialState: {
          prompt: { text: o.garment.prompt, enhance: o.garment.enhance },
          image: o.garment.image,
        },
      });
      return wrap(rt);
    },
  };
}
