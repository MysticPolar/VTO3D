/**
 * The typed interface between live try-on and whatever hosts it: this test page now, the VTO3D
 * app's 首页 camera layer later (PROPOSALS.md). Framework-free on purpose.
 */
import type { ServiceInfo, TokenGrant } from './protocol.js';

/** The outfit slot a garment fills, as in the prototype's `data.slotOf` */
export type Slot = 'top' | 'bottom' | 'dress' | 'outer' | 'shoes' | 'bag' | 'acc';

export interface LiveGarment {
  /** Product id from the catalog */
  id: string;
  /** Chinese product name, for the rail's aria-label and toasts */
  name: string;
  slot: Slot;
  /** Clean product photo sent to the model as the reference image */
  image: string;
  /** What the rail shows */
  thumb: string;
  /** English try-on instruction for the model (src/catalog/prompts.ts) */
  prompt: string;
  /** Reference photo under Decart's recommended 512 px */
  lowRes: boolean;
}

export interface GarmentCategory {
  id: string;
  /** 「上装」「下装」…, verbatim from the prototype's fitting categories */
  label: string;
  items: string[];
}

/** The back-end calls live try-on needs; the app would route these through `src/api` */
export interface LiveTryOnApi {
  health(): Promise<ServiceInfo>;
  token(): Promise<TokenGrant>;
  /** Fire and forget: tells the back end how many seconds a session really generated */
  reportUsage(reservationId: string, seconds: number): void;
}

/** What a model call needs to dress the person in one garment */
export interface GarmentInput {
  prompt: string;
  image: Blob;
  enhance: boolean;
}

export type ConnectionState =
  'connecting' | 'connected' | 'generating' | 'reconnecting' | 'disconnected';

export interface ConnectionStats {
  /** Connection start to first rendered output frame */
  ttffMs: number | null;
  /** Median camera-to-display latency once running */
  g2gMedianMs: number | null;
  g2gP90Ms: number | null;
  rttMs: number | null;
  /** Output frames per second as received */
  fps: number | null;
  /** Outbound (camera) frames per second */
  sendFps: number | null;
  frameWidth: number | null;
  frameHeight: number | null;
  /** Media goes through a TURN relay rather than straight over UDP */
  relayed: boolean | null;
  /** The media server the session landed on, e.g. "udp 203.0.113.7" (helps tell regions apart) */
  remote: string | null;
}

export interface ConnectionEvents {
  state: (state: ConnectionState) => void;
  /** Seconds generated in this server session so far (cumulative; restarts after a reconnect) */
  tick: (seconds: number) => void;
  /** The server stopped generating; `reason` as Decart sent it */
  ended: (reason: string) => void;
  error: (error: { code: string; message: string }) => void;
  stats: (stats: ConnectionStats) => void;
  /** The SDK's diagnostics, e.g. how long each step of connecting took */
  diagnostic: (event: { name: string; data: unknown }) => void;
}

export interface RealtimeConnection {
  readonly sessionId: string | null;
  set(garment: GarmentInput): Promise<void>;
  disconnect(): void;
  on<E extends keyof ConnectionEvents>(event: E, listener: ConnectionEvents[E]): void;
}

export interface ConnectOptions {
  stream: MediaStream;
  /** Pre-flip the camera before sending (front camera), so the result reads like a mirror */
  mirror: boolean;
  /** Decart fast mode: lower latency, billed at twice the rate */
  fast: boolean;
  garment: GarmentInput;
  /** Called before every dial, including the SDK's automatic reconnects */
  getToken: () => Promise<string>;
  onRemoteStream: (stream: MediaStream) => void;
  /** Decart is at capacity or has queued the session */
  onWaiting?: (
    wait: { kind: 'capacity'; retryAfterMs: number } | { kind: 'queue'; position: number },
  ) => void;
}

export interface RealtimeConnector {
  connect(options: ConnectOptions): Promise<RealtimeConnection>;
}
