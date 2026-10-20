import { describe, expect, it } from 'vitest';
import { ServiceError } from './api.js';
import { panelCopy } from './copy.js';
import {
  connectProblem,
  endProblem,
  FIRST_FRAME_TIMEOUT_MS,
  LiveTryOnSession,
  type SessionDeps,
} from './session.js';
import {
  asStream,
  FakeApi,
  FakeConnector,
  FakeMedia,
  FakeStream,
  flush,
  GARMENTS,
  loadImage,
  ManualTimers,
} from './test-fakes.js';

function setup(overrides: Partial<SessionDeps> = {}) {
  const media = new FakeMedia();
  const connector = new FakeConnector();
  const api = new FakeApi();
  const timers = new ManualTimers();
  const toasts: string[] = [];
  let now = 1_000_000;
  const session = new LiveTryOnSession({
    media,
    webrtc: true,
    connector,
    api,
    garments: GARMENTS,
    initialGarmentId: 'black-blazer',
    maxSessionSeconds: 120,
    loadImage,
    toast: (m) => toasts.push(m),
    now: () => now,
    timers,
    ...overrides,
  });
  const phases: string[] = [];
  session.subscribe((s) => {
    if (phases.at(-1) !== s.phase) phases.push(s.phase);
  });
  return {
    session,
    media,
    connector,
    api,
    timers,
    toasts,
    phases,
    advance: (ms: number) => (now += ms),
  };
}

/** Start and get to live with the default fakes */
async function live(t: ReturnType<typeof setup>) {
  await t.session.start();
  await flush();
  t.connector.last?.emit('state', 'connected');
  t.connector.last?.emit('state', 'generating');
  return t.connector.last!;
}

describe('starting', () => {
  it('goes intro → wait → connecting → live, dressing the first frame in the picked garment', async () => {
    const t = setup();
    expect(t.session.view.phase).toBe('intro');
    await t.session.start();
    await flush();
    expect(t.phases).toEqual(['intro', 'wait', 'connecting']);

    // the prototype's camera constraints, sized to the model's 1280×720 at up to 30 fps
    expect(t.media.requests[0]).toEqual({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    });

    // the camera shows (mirrored, front camera) while the model connects
    const view = t.session.view;
    expect(view.localStream).toBe(asStream(t.media.streams[0]!));
    expect(view.mirrorLocal).toBe(true);

    const call = t.connector.calls[0]!;
    expect(call.mirror).toBe(true);
    expect(call.fast).toBe(false);
    expect(call.garment.prompt).toBe('P-blazer');
    expect(call.garment.enhance).toBe(false);
    expect(await call.garment.image.text()).toBe('/catalog/black-blazer.webp');
    expect(t.api.tokens).toBe(1);

    t.connector.last!.emit('state', 'generating');
    expect(t.session.view.phase).toBe('live');
    expect(t.session.view.appliedId).toBe('black-blazer');
  });

  it('does not mirror a camera that reports itself as the back camera', async () => {
    const t = setup();
    t.media.auto = () => new FakeStream({ facingMode: 'environment', deviceId: 'back' });
    await t.session.start();
    await flush();
    expect(t.session.view.mirrorLocal).toBe(false);
    expect(t.connector.calls[0]?.mirror).toBe(false);
  });

  it('passes fast mode through', async () => {
    const t = setup({ fast: true });
    await live(t);
    expect(t.connector.calls[0]?.fast).toBe(true);
  });

  it('shows the switch only once two cameras are known', async () => {
    const t = setup();
    await live(t);
    expect(t.session.view.canSwitch).toBe(false);
    const u = setup();
    u.media.devices.push(
      { kind: 'videoinput', deviceId: 'back' },
      { kind: 'audioinput', deviceId: 'mic' },
    );
    await live(u);
    expect(u.session.view.canSwitch).toBe(true);
  });

  it('reports queue and capacity waits, then clears them when generating starts', async () => {
    const t = setup();
    t.connector.auto = false;
    void t.session.start();
    await flush();
    t.connector.calls[0]!.onWaiting?.({ kind: 'queue', position: 3 });
    expect(t.session.view.waiting).toEqual({ kind: 'queue', position: 3 });
    t.connector.calls[0]!.onWaiting?.({ kind: 'capacity', retryAfterMs: 2000 });
    expect(t.session.view.waiting).toEqual({ kind: 'capacity' });
  });
});

describe('camera errors', () => {
  it.each([
    ['NotAllowedError', '没有获得摄像头权限'],
    ['PermissionDeniedError', '没有获得摄像头权限'],
    ['SecurityError', '没有获得摄像头权限'],
    ['NotFoundError', '未检测到可用的摄像头'],
    ['DevicesNotFoundError', '未检测到可用的摄像头'],
    ['OverconstrainedError', '未检测到可用的摄像头'],
    ['NotReadableError', '摄像头正被占用'],
    ['TrackStartError', '摄像头正被占用'],
    ['AbortError', '无法开启摄像头'],
  ])('%s shows the prototype’s 「%s」', async (name, title) => {
    const t = setup();
    t.media.getUserMedia = async () => {
      throw Object.assign(new Error('x'), { name });
    };
    await t.session.start();
    expect(t.session.view.phase).toBe('error');
    expect(t.session.view.problem).toEqual({ kind: 'camera', name });
    expect(panelCopy(t.session.view.problem!, 120).title).toBe(title);
    expect(t.connector.calls).toHaveLength(0);
    expect(t.api.tokens).toBe(0);
  });

  it('says the environment has no camera without mediaDevices', async () => {
    const t = setup({ media: null });
    await t.session.start();
    expect(t.session.view.problem).toEqual({ kind: 'camera', name: 'Unsupported' });
    expect(panelCopy(t.session.view.problem!, 120).title).toBe('当前环境不支持摄像头');
  });

  it('says the browser cannot do live try-on without WebRTC, and offers no retry', async () => {
    const t = setup({ webrtc: false });
    await t.session.start();
    expect(t.session.view.problem).toEqual({ kind: 'unsupported' });
    expect(panelCopy(t.session.view.problem!, 120).primary).toBeNull();
    expect(t.media.requests).toHaveLength(0);
  });
});

describe('stop rules', () => {
  it('stops a camera stream that arrives after the layer closed', async () => {
    const t = setup();
    t.media.auto = null;
    void t.session.start();
    t.session.close();
    const late = new FakeStream();
    t.media.pending[0]!.resolve(asStream(late));
    await flush();
    expect(late.live).toBe(false);
    expect(t.connector.calls).toHaveLength(0);
  });

  it('disconnects a model session that connects after the layer closed', async () => {
    const t = setup();
    t.connector.auto = false;
    void t.session.start();
    await flush();
    t.session.close();
    const { FakeConnection } = await import('./test-fakes.js');
    const late = new FakeConnection();
    t.connector.pending[0]!.resolve(late);
    await flush();
    expect(late.disconnected).toBe(true);
    expect(t.media.streams[0]!.live).toBe(false);
  });

  it('closing a live session disconnects, stops the camera and reports the seconds used', async () => {
    const t = setup();
    const conn = await live(t);
    conn.emit('tick', 12);
    t.session.close();
    expect(conn.disconnected).toBe(true);
    expect(t.media.streams[0]!.live).toBe(false);
    expect(t.session.view.localStream).toBeNull();
    expect(t.session.view.remoteStream).toBeNull();
    expect(t.api.reports).toEqual([{ reservationId: '2026-10-20.res000001', seconds: 12 }]);
    expect(t.session.isClosed).toBe(true);
    // a closed layer never starts again
    await t.session.start();
    expect(t.media.requests).toHaveLength(1);
  });

  it('the page going hidden stops everything and shows the paused panel', async () => {
    const t = setup();
    const conn = await live(t);
    t.session.pause();
    expect(conn.disconnected).toBe(true);
    expect(t.media.streams[0]!.live).toBe(false);
    expect(t.session.view.phase).toBe('ended');
    expect(t.session.view.problem).toEqual({ kind: 'ended', reason: 'hidden' });
    expect(panelCopy(t.session.view.problem!, 120).primary).toBe('继续试衣');
  });

  it('pausing does nothing while nothing runs', () => {
    const t = setup();
    t.session.pause();
    expect(t.session.view.phase).toBe('intro');
  });

  it('every retry stops the previous stream and session first', async () => {
    const t = setup();
    const first = await live(t);
    await t.session.start();
    await flush();
    expect(first.disconnected).toBe(true);
    expect(t.media.streams[0]!.live).toBe(false);
    expect(t.media.streams[1]!.live).toBe(true);
  });

  it('ignores the SDK reporting its own teardown as a disconnect', async () => {
    const t = setup();
    await live(t);
    t.session.close();
    expect(t.session.view.phase).toBe('live');
    expect(t.session.view.problem).toBeNull();
  });
});

describe('the session cap and server-side ends', () => {
  it('stops itself at maxSessionSeconds from the token grant', async () => {
    const t = setup();
    t.api.maxSessionSeconds = 90;
    const conn = await live(t);
    expect([...t.timers.active.values()].map((x) => x.ms)).toContain(90_000);
    t.timers.fire(90_000);
    expect(conn.disconnected).toBe(true);
    expect(t.session.view.problem).toEqual({ kind: 'ended', reason: 'timeout' });
    expect(panelCopy(t.session.view.problem!, 90).body).toBe(
      '每次实时试衣最长 90 秒，可以重新开始。',
    );
  });

  it('refuses reconnect tokens once the session has ended, so no new billed session starts', async () => {
    const t = setup();
    await live(t);
    const getToken = t.connector.calls[0]!.getToken;
    t.timers.fire(120_000);
    await expect(getToken()).rejects.toThrow('over');
    expect(t.api.tokens).toBe(1);
  });

  it('hands out a fresh token for an SDK reconnect while the session is live', async () => {
    const t = setup();
    await live(t);
    expect(await t.connector.calls[0]!.getToken()).toBe('client-token-2');
  });

  it('disconnects when the server stops generating, instead of letting the SDK redial', async () => {
    const t = setup();
    const conn = await live(t);
    t.advance(30_000);
    conn.emit('ended', 'insufficient_credits');
    expect(conn.disconnected).toBe(true);
    expect(t.session.view.phase).toBe('error');
    expect(t.session.view.problem).toEqual({ kind: 'service', code: 'credits' });
  });

  it('shows reconnecting, then live again', async () => {
    const t = setup();
    const conn = await live(t);
    conn.emit('state', 'reconnecting');
    expect(t.session.view.phase).toBe('reconnecting');
    conn.emit('state', 'connected');
    conn.emit('state', 'generating');
    expect(t.session.view.phase).toBe('live');
  });

  it('treats a disconnect after a network error as a network problem', async () => {
    const t = setup();
    const conn = await live(t);
    conn.emit('error', { code: 'WEBRTC_ICE_ERROR', message: 'ICE connection failed' });
    conn.emit('state', 'disconnected');
    expect(t.session.view.problem).toEqual({ kind: 'service', code: 'network' });
  });

  it('gives up when a connected session never starts generating', async () => {
    const t = setup();
    await t.session.start();
    await flush();
    expect(t.session.view.phase).toBe('connecting');
    t.timers.fire(FIRST_FRAME_TIMEOUT_MS);
    expect(t.session.view.problem).toEqual({ kind: 'service', code: 'unavailable' });
    expect(t.connector.last?.disconnected).toBe(true);
  });

  it('counts generated seconds across reconnects and spreads them over the reservations', async () => {
    const t = setup();
    const conn = await live(t);
    conn.emit('tick', 100);
    conn.emit('tick', 118);
    // a reconnect: new token, a new server session whose ticks start again
    await t.connector.calls[0]!.getToken();
    conn.emit('tick', 2);
    conn.emit('tick', 32);
    expect(t.session.view.seconds).toBe(150);
    t.session.close();
    expect(t.api.reports).toEqual([
      { reservationId: '2026-10-20.res000001', seconds: 120 },
      { reservationId: '2026-10-20.res000002', seconds: 30 },
    ]);
  });
});

describe('garments', () => {
  it('a garment picked before starting dresses the first frame', async () => {
    const t = setup();
    t.session.selectGarment('white-tee');
    await live(t);
    expect(t.connector.calls[0]?.garment.prompt).toBe('P-tee');
    expect(t.connector.last?.sets).toHaveLength(0);
  });

  it('sends a garment picked while live, and toasts like 首页 does', async () => {
    const t = setup();
    const conn = await live(t);
    t.session.selectGarment('white-tee');
    expect(t.session.view.garmentId).toBe('white-tee');
    await flush();
    expect(conn.sets).toHaveLength(1);
    expect(conn.sets[0]?.prompt).toBe('P-tee');
    expect(conn.sets[0]?.enhance).toBe(false);
    expect(await conn.sets[0]!.image.text()).toBe('/catalog/white-tee.webp');
    expect(t.session.view.appliedId).toBe('white-tee');
    expect(t.toasts).toEqual(['已试穿：纯棉圆领T恤']);
  });

  it('only sends the latest of quick picks once the one in flight is done', async () => {
    const t = setup();
    const conn = await live(t);
    conn.holdSets = true;
    t.session.selectGarment('white-tee');
    await flush();
    expect(t.session.view.applyingId).toBe('white-tee');
    t.session.selectGarment('grey-hoodie');
    t.session.selectGarment('black-blazer');
    t.session.selectGarment('grey-hoodie');
    conn.setReplies[0]!.resolve();
    await flush();
    expect(conn.sets.map((s) => s.prompt)).toEqual(['P-tee', 'P-hoodie']);
    conn.setReplies[1]!.resolve();
    await flush();
    expect(t.session.view.appliedId).toBe('grey-hoodie');
    expect(t.session.view.applyingId).toBeNull();
    // only the final pick is announced
    expect(t.toasts).toEqual(['已试穿：灰色连帽卫衣']);
  });

  it('goes back to the garment the model still wears when one is refused', async () => {
    const t = setup();
    const conn = await live(t);
    conn.holdSets = true;
    t.session.selectGarment('white-tee');
    await flush();
    conn.setReplies[0]!.reject(new Error('rejected by moderation'));
    await flush();
    expect(t.toasts).toEqual(['这件单品暂时无法实时试穿，请换一件试试']);
    expect(t.session.view.garmentId).toBe('black-blazer');
  });

  it('applies a garment picked while connecting as soon as the session is up', async () => {
    const t = setup();
    t.connector.auto = false;
    void t.session.start();
    await flush();
    t.session.selectGarment('grey-hoodie');
    const { FakeConnection } = await import('./test-fakes.js');
    const conn = new FakeConnection();
    t.connector.pending[0]!.resolve(conn);
    await flush();
    expect(t.connector.calls[0]?.garment.prompt).toBe('P-blazer');
    expect(conn.sets.map((s) => s.prompt)).toEqual(['P-hoodie']);
  });

  it('ignores unknown garments and the one already picked', async () => {
    const t = setup();
    const conn = await live(t);
    t.session.selectGarment('nope');
    t.session.selectGarment('black-blazer');
    await flush();
    expect(conn.sets).toHaveLength(0);
  });
});

describe('switching cameras', () => {
  it('moves to another camera by exact device id in a new session, then toasts', async () => {
    const t = setup();
    t.media.devices.push({ kind: 'videoinput', deviceId: 'back' });
    const first = await live(t);
    t.media.auto = () => new FakeStream({ facingMode: 'environment', deviceId: 'back' });
    await t.session.switchCamera();
    await flush();
    expect(t.media.requests[1]?.video).toEqual({
      deviceId: { exact: 'back' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
    });
    expect(first.disconnected).toBe(true);
    expect(t.media.streams[0]!.live).toBe(false);
    expect(t.session.view.mirrorLocal).toBe(false);
    expect(t.connector.calls[1]?.mirror).toBe(false);
    expect(t.toasts).toEqual(['已切换摄像头']);
  });

  it('does nothing unless live with two cameras', async () => {
    const t = setup();
    await live(t);
    await t.session.switchCamera();
    expect(t.media.requests).toHaveLength(1);
  });
});

describe('service errors', () => {
  it('maps back-end refusals to their copy', async () => {
    const t = setup();
    t.api.failWith = new ServiceError('budget_exhausted', 429, 'x');
    await t.session.start();
    await flush();
    expect(t.session.view.problem).toEqual({ kind: 'service', code: 'budget_exhausted' });
    const copy = panelCopy(t.session.view.problem!, 120);
    expect(copy.title).toBe('今日试衣额度已用完');
    expect(copy.primary).toBeNull();
    expect(t.media.streams[0]!.live).toBe(false);
  });

  it('sends a wrong access code back to the explainer, where the code is typed', async () => {
    const t = setup();
    t.api.failWith = new ServiceError('access_code_invalid', 401, 'x');
    await t.session.start();
    await flush();
    expect(t.session.view.phase).toBe('error');
    t.session.retry();
    expect(t.session.view.phase).toBe('intro');
    expect(t.media.requests).toHaveLength(1);
  });

  it('retries other problems by starting again', async () => {
    const t = setup();
    t.api.failWith = new ServiceError('busy', 429, 'x');
    await t.session.start();
    await flush();
    t.api.failWith = null;
    t.session.retry();
    await flush();
    expect(t.session.view.phase).toBe('connecting');
  });
});

describe('connectProblem', () => {
  it('reads SDK errors', () => {
    expect(connectProblem({ code: 'WEBRTC_ICE_ERROR', message: 'ICE connection failed' })).toEqual({
      kind: 'service',
      code: 'network',
    });
    expect(connectProblem({ code: 'LIVEKIT_INITIALIZATION_ERROR', message: '' }).kind).toBe(
      'service',
    );
    expect(connectProblem(new Error('websocket closed: 1013 Session Limit Reached'))).toEqual({
      kind: 'service',
      code: 'session_limit',
    });
    expect(connectProblem({ code: 'WEBRTC_SERVER_ERROR', message: 'server at capacity' })).toEqual({
      kind: 'service',
      code: 'busy',
    });
    expect(connectProblem({ code: 'TOKEN_INVALID', message: 'bad' })).toEqual({
      kind: 'service',
      code: 'unavailable',
    });
    expect(connectProblem(undefined)).toEqual({ kind: 'service', code: 'unavailable' });
  });
});

describe('endProblem', () => {
  it('reads why the server ended a session', () => {
    expect(endProblem('moderation_violation', 5, 120, null)).toEqual({
      kind: 'service',
      code: 'moderation',
    });
    expect(endProblem('policy_violation', 5, 120, null)).toEqual({
      kind: 'service',
      code: 'moderation',
    });
    expect(endProblem('session_limit', 5, 120, null)).toEqual({
      kind: 'service',
      code: 'session_limit',
    });
    // Decart's own time limit, whatever it calls it
    expect(endProblem('max_duration', 117, 120, null)).toEqual({
      kind: 'ended',
      reason: 'timeout',
    });
    expect(endProblem('something', 20, 120, null)).toEqual({ kind: 'ended', reason: 'remote' });
    expect(endProblem(null, 20, 120, 'WEBRTC_TIMEOUT_ERROR')).toEqual({
      kind: 'service',
      code: 'network',
    });
    expect(endProblem(null, 20, 120, null)).toEqual({ kind: 'ended', reason: 'remote' });
  });
});
