import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionState } from './types.js';

/** A stand-in for the SDK: records what the connector asks for, lets the test emit events */
const sdk = vi.hoisted(() => {
  const listeners = new Map<string, (data: unknown) => void>();
  const state = {
    clientOptions: null as Record<string, unknown> | null,
    connectOptions: null as Record<string, unknown> | null,
    stream: null as unknown,
    sets: [] as unknown[],
    disconnected: false,
    listeners,
    emit: (event: string, data: unknown) => listeners.get(event)?.(data),
  };
  return state;
});

vi.mock('@decartai/sdk', () => ({
  models: {
    realtime: (name: string) => ({ name, width: 1280, height: 720, fps: { ideal: 30, max: 30 } }),
  },
  createConsoleLogger: (level: string) => ({ level }),
  createDecartClient: (options: Record<string, unknown>) => {
    sdk.clientOptions = options;
    return {
      realtime: {
        connect: async (stream: unknown, options: Record<string, unknown>) => {
          sdk.stream = stream;
          sdk.connectOptions = options;
          return {
            sessionId: 'sess-42',
            set: async (input: unknown) => void sdk.sets.push(input),
            disconnect: () => {
              sdk.disconnected = true;
            },
            on: (event: string, listener: (data: unknown) => void) =>
              sdk.listeners.set(event, listener),
          };
        },
      },
    };
  },
}));

const { decartConnector, toStats } = await import('./decart-connector.js');

const image = new Blob(['x']);
const getToken = async () => 'client-token';

beforeEach(() => {
  sdk.listeners.clear();
  sdk.sets.length = 0;
  sdk.disconnected = false;
});

describe('decartConnector', () => {
  it('connects to Lucy VTON 3.6 with a token provider, no telemetry and the garment in the first frame', async () => {
    const onRemoteStream = () => {};
    const stream = { id: 'camera' } as unknown as MediaStream;
    await decartConnector().connect({
      stream,
      mirror: true,
      fast: false,
      garment: { prompt: 'P', image, enhance: false },
      getToken,
      onRemoteStream,
    });
    expect(sdk.clientOptions).toMatchObject({ apiKeyProvider: getToken, telemetry: false });
    expect(sdk.clientOptions).not.toHaveProperty('apiKey');
    expect(sdk.stream).toBe(stream);
    expect(sdk.connectOptions).toMatchObject({
      model: { name: 'lucy-vton-3.6' },
      mirror: true,
      onRemoteStream,
      initialState: { prompt: { text: 'P', enhance: false }, image },
    });
    expect(sdk.connectOptions).not.toHaveProperty('speed');
  });

  it('asks for fast mode only when told to', async () => {
    await decartConnector().connect({
      stream: {} as MediaStream,
      mirror: false,
      fast: true,
      garment: { prompt: 'P', image, enhance: false },
      getToken,
      onRemoteStream: () => {},
    });
    expect(sdk.connectOptions).toMatchObject({ speed: 'fast', mirror: false });
  });

  it('forwards waits, events, garment changes and disconnects', async () => {
    const waits: unknown[] = [];
    const conn = await decartConnector().connect({
      stream: {} as MediaStream,
      mirror: true,
      fast: false,
      garment: { prompt: 'P', image, enhance: false },
      getToken,
      onRemoteStream: () => {},
      onWaiting: (w) => waits.push(w),
    });
    const opts = sdk.connectOptions as {
      onCapacityWait: (w: unknown) => void;
      onQueuePosition: (q: unknown) => void;
    };
    opts.onCapacityWait({ retryAfterMs: 2000, attempt: 1 });
    opts.onQueuePosition({ position: 2, queueSize: 5 });
    expect(waits).toEqual([
      { kind: 'capacity', retryAfterMs: 2000 },
      { kind: 'queue', position: 2 },
    ]);

    const seen: unknown[] = [];
    conn.on('state', (s: ConnectionState) => seen.push(['state', s]));
    conn.on('tick', (s) => seen.push(['tick', s]));
    conn.on('ended', (r) => seen.push(['ended', r]));
    conn.on('error', (e) => seen.push(['error', e.code]));
    sdk.emit('connectionChange', 'generating');
    sdk.emit('generationTick', { seconds: 4 });
    sdk.emit('generationEnded', { seconds: 9, reason: 'max_duration' });
    sdk.emit('sessionEnded', { reason: 'insufficient_credits' });
    sdk.emit('error', { code: 'WEBRTC_ICE_ERROR', message: 'ICE connection failed' });
    expect(seen).toEqual([
      ['state', 'generating'],
      ['tick', 4],
      ['ended', 'max_duration'],
      ['ended', 'insufficient_credits'],
      ['error', 'WEBRTC_ICE_ERROR'],
    ]);

    expect(conn.sessionId).toBe('sess-42');
    await conn.set({ prompt: 'Q', image, enhance: false });
    expect(sdk.sets).toEqual([{ prompt: 'Q', image, enhance: false }]);
    conn.disconnect();
    expect(sdk.disconnected).toBe(true);
  });
});

describe('toStats', () => {
  it('pulls latency, frame rate and the media path out of the SDK’s stats', () => {
    const stats = toStats({
      timestamp: 1,
      video: { framesPerSecond: 24, frameWidth: 1280, frameHeight: 720 },
      outboundVideo: { framesPerSecond: 30 },
      remoteInbound: { fractionLost: 0, jitter: 0.01, roundTripTime: 0.0834 },
      connection: {
        currentRoundTripTime: 0.09,
        availableOutgoingBitrate: null,
        selectedCandidatePairs: [
          {
            local: { candidateType: 'srflx', address: '', port: 1, protocol: 'udp' },
            remote: { candidateType: 'host', address: '198.51.100.7', port: 7882, protocol: 'udp' },
          },
        ],
      },
      glassToGlass: { ttffMs: 1800, medianMs: 310, p90Ms: 420, sampleCount: 40, dropRatio: 0 },
    } as never);
    expect(stats).toEqual({
      ttffMs: 1800,
      g2gMedianMs: 310,
      g2gP90Ms: 420,
      rttMs: 83,
      fps: 24,
      sendFps: 30,
      frameWidth: 1280,
      frameHeight: 720,
      relayed: false,
      remote: 'udp 198.51.100.7',
    });
  });

  it('copes with missing parts', () => {
    const stats = toStats({
      timestamp: 1,
      video: null,
      outboundVideo: null,
      remoteInbound: null,
      connection: {
        currentRoundTripTime: null,
        availableOutgoingBitrate: null,
        selectedCandidatePairs: [],
      },
      glassToGlass: null,
    } as never);
    expect(stats.rttMs).toBeNull();
    expect(stats.relayed).toBeNull();
    expect(stats.fps).toBeNull();
  });
});
