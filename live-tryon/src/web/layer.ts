/**
 * The live try-on layer: the prototype's camera layer (js/camera.js), same markup and classes,
 * driven by a LiveTryOnSession instead of a bare camera stream, plus the DRAFT parts live
 * try-on needs (two videos, status line, AI label, consent, garment picker).
 */
import { DRAFT, panelCopy, VERBATIM } from '../core/copy.js';
import type { LiveTryOnSession, ViewState } from '../core/session.js';
import type { GarmentCategory, LiveGarment } from '../core/types.js';
import { icon } from './icons.js';

export interface LayerOptions {
  host: HTMLElement;
  session: LiveTryOnSession;
  garments: readonly LiveGarment[];
  categories: readonly GarmentCategory[];
  /** Show the access-code field (the deployment needs one) */
  accessCodeRequired: () => boolean;
  accessCode: { get(): string; set(code: string): void };
  /** ?debug=1: latency, frame rate and running cost */
  debug: boolean;
  pricePerSecondUsd: () => number;
  /** ✕, 暂不开启, 返回试衣间, Esc: the host closes the layer */
  onClose: () => void;
}

export interface Layer {
  el: HTMLElement;
  toast(message: string, ms?: number): void;
  destroy(): void;
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

/** The panel block each phase shows (CSS shows .cam-intro, .cam-wait or .cam-err) */
const PANEL_STATE: Record<ViewState['phase'], string> = {
  intro: 'intro',
  wait: 'wait',
  connecting: 'connecting',
  live: 'live',
  reconnecting: 'reconnecting',
  ended: 'error',
  error: 'error',
};

export function mountLayer(o: LayerOptions): Layer {
  const el = document.createElement('div');
  el.className = 'ov ov--layer cam';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', VERBATIM.layerLabel);
  el.innerHTML = `
    <div class="cam-view" data-state="intro">
      <video class="cam-video cam-video--local" playsinline muted autoplay aria-label="${VERBATIM.videoLabel}"></video>
      <video class="cam-video cam-video--out" playsinline muted autoplay aria-label="${VERBATIM.videoLabel}"></video>
      <div class="cam-top">
        <button type="button" class="cam-btn" data-act="close" aria-label="${VERBATIM.closeLabel}">${icon('close', { size: 22, stroke: 2 })}</button>
        <span class="cam-title"><i class="cam-rec" aria-hidden="true"></i>${DRAFT.pill}</span>
        <button type="button" class="cam-btn" data-act="switch" aria-label="${VERBATIM.switchLabel}" hidden>${icon('switch-camera', { size: 22, stroke: 1.8 })}</button>
      </div>
      <p class="cam-chip" role="status" hidden><span class="spinner" aria-hidden="true"></span><span class="cam-chip-t"></span></p>
      <span class="cam-ai" hidden>${DRAFT.aiLabel}</span>
      <pre class="cam-debug" hidden></pre>
      <div class="cam-panel" data-state="intro">
        <div class="cam-intro">
          <span class="cam-ic">${icon('video-filled', { size: 28 })}</span>
          <h2>${VERBATIM.introTitle}</h2>
          <p>${DRAFT.introBody.map(esc).join('<br>')}</p>
          <label class="cam-consent"><input type="checkbox" data-consent><span>${esc(DRAFT.consent)}</span></label>
          <label class="cam-code" hidden><span>${DRAFT.accessCodeLabel}</span><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${DRAFT.accessCodePlaceholder}" data-code></label>
          <button type="button" class="btn btn--light btn--lg btn--block" data-act="start">${VERBATIM.allow}</button>
          <button type="button" class="btn cam-cancel btn--lg btn--block" data-act="close">${VERBATIM.notNow}</button>
        </div>
        <div class="cam-wait"><span class="spinner"></span><p>${VERBATIM.waitCamera}</p></div>
        <div class="cam-err">
          <span class="cam-ic">${icon('info', { size: 28, stroke: 1.6 })}</span>
          <h2 class="cam-err-t"></h2>
          <p class="cam-err-s"></p>
          <button type="button" class="btn btn--light btn--lg btn--block" data-act="retry"></button>
          <button type="button" class="btn cam-cancel btn--lg btn--block" data-act="close"></button>
        </div>
      </div>
      <div class="cam-bottom">
        <div class="cam-picker">
          <div class="cam-cats" role="group" aria-label="${VERBATIM.categoriesLabel}"></div>
          <div class="cam-rail" role="group" aria-label="${VERBATIM.railLabel}"></div>
        </div>
        <p class="cam-foot">${DRAFT.foot}</p>
      </div>
      <div class="vt-toasts" aria-live="polite"></div>
    </div>`;
  o.host.append(el);

  const $ = <T extends Element>(selector: string) => el.querySelector(selector) as T;
  const view = $<HTMLElement>('.cam-view');
  const panel = $<HTMLElement>('.cam-panel');
  const local = $<HTMLVideoElement>('.cam-video--local');
  const out = $<HTMLVideoElement>('.cam-video--out');
  const closeBtn = $<HTMLButtonElement>('.cam-top [data-act="close"]');
  const switchBtn = $<HTMLButtonElement>('[data-act="switch"]');
  const startBtn = $<HTMLButtonElement>('[data-act="start"]');
  const retryBtn = $<HTMLButtonElement>('[data-act="retry"]');
  const backBtn = $<HTMLButtonElement>('.cam-err [data-act="close"]');
  const chip = $<HTMLElement>('.cam-chip');
  const chipText = $<HTMLElement>('.cam-chip-t');
  const aiLabel = $<HTMLElement>('.cam-ai');
  const debugBox = $<HTMLElement>('.cam-debug');
  const consent = $<HTMLInputElement>('[data-consent]');
  const codeField = $<HTMLElement>('.cam-code');
  const codeInput = $<HTMLInputElement>('[data-code]');
  const cats = $<HTMLElement>('.cam-cats');
  const rail = $<HTMLElement>('.cam-rail');
  const picker = $<HTMLElement>('.cam-picker');
  const toasts = $<HTMLElement>('.vt-toasts');

  codeInput.value = o.accessCode.get();
  requestAnimationFrame(() => el.classList.add('is-open'));
  // as the prototype: the start button has focus when the layer opens
  setTimeout(() => startBtn.focus({ preventScroll: true }), 60);

  const garmentById = new Map(o.garments.map((g) => [g.id, g]));
  const firstCategory = (id: string) =>
    o.categories.find((c) => c.items.includes(id))?.id ?? o.categories[0]?.id;
  let category = firstCategory(o.session.view.garmentId) ?? '';

  function renderCategories() {
    cats.innerHTML = o.categories
      .map(
        (c) =>
          `<button type="button" class="cam-cat" data-act="cat" data-cat="${c.id}" aria-pressed="${c.id === category}">${esc(c.label)}</button>`,
      )
      .join('');
  }

  function renderRail(state: ViewState) {
    const items = o.categories.find((c) => c.id === category)?.items ?? [];
    rail.innerHTML = items
      .map((id) => {
        const g = garmentById.get(id);
        if (!g) return '';
        const on = id === state.garmentId;
        const busy = id === state.applyingId;
        return `<button type="button" class="cam-thumb" data-act="pick" data-id="${id}" aria-pressed="${on}" aria-label="${esc(VERBATIM.tryLabel(g.name))}">
          <img src="${g.thumb}" alt="" loading="lazy" decoding="async" draggable="false">
          ${on && !busy ? `<span class="cam-check" aria-hidden="true">${icon('check', { size: 11, stroke: 3 })}</span>` : ''}
          ${busy ? '<span class="spinner" aria-hidden="true"></span>' : ''}
        </button>`;
      })
      .join('');
  }

  function attach(video: HTMLVideoElement, stream: MediaStream | null) {
    if (video.srcObject === stream) return;
    video.classList.remove('is-playing');
    video.srcObject = stream;
    if (stream) void video.play().catch(() => {});
  }
  out.addEventListener('playing', () => out.classList.add('is-playing'));

  function chipFor(state: ViewState): string | null {
    if (state.applyingId) return DRAFT.applying(garmentById.get(state.applyingId)?.name ?? '');
    if (state.phase === 'reconnecting') return DRAFT.reconnecting;
    if (state.phase === 'connecting') {
      if (state.waiting?.kind === 'queue') return DRAFT.queued(state.waiting.position);
      if (state.waiting?.kind === 'capacity') return DRAFT.waitingCapacity;
      return DRAFT.connecting;
    }
    return null;
  }

  function debugText(state: ViewState): string {
    const s = state.stats;
    const v = (x: number | null | undefined, unit = '') =>
      x === null || x === undefined ? '–' : `${Math.round(x)}${unit}`;
    const cost = state.seconds * o.pricePerSecondUsd();
    return [
      `state    ${state.phase}${state.sessionId ? ` · ${state.sessionId.slice(0, 8)}` : ''}`,
      `ttff     ${v(s?.ttffMs, ' ms')}`,
      `g2g      ${v(s?.g2gMedianMs, ' ms')} (p90 ${v(s?.g2gP90Ms, ' ms')})`,
      `rtt      ${v(s?.rttMs, ' ms')}${s?.relayed ? ' · TURN' : ''}`,
      `fps      in ${v(s?.fps)} · out ${v(s?.sendFps)} · ${s?.frameWidth ?? '–'}×${s?.frameHeight ?? '–'}`,
      `billed   ${state.seconds.toFixed(0)} s ≈ $${cost.toFixed(2)}`,
    ].join('\n');
  }

  let lastPhase: ViewState['phase'] | null = null;
  let lastRail = '';

  function render(state: ViewState) {
    view.dataset.state = state.phase;
    panel.dataset.state = PANEL_STATE[state.phase];
    attach(local, state.localStream);
    attach(out, state.remoteStream);
    local.classList.toggle('is-mirror', state.mirrorLocal);
    switchBtn.hidden = !(state.phase === 'live' && state.canSwitch);

    const active = state.phase === 'live' || state.phase === 'reconnecting';
    aiLabel.hidden = !(active && state.remoteStream);
    picker.hidden = !(active || state.phase === 'connecting' || state.phase === 'intro');
    codeField.hidden = !o.accessCodeRequired();

    const text = chipFor(state);
    chip.hidden = text === null;
    if (text !== null) chipText.textContent = text;

    if (state.problem && (state.phase === 'error' || state.phase === 'ended')) {
      const copy = panelCopy(state.problem, state.maxSessionSeconds);
      $<HTMLElement>('.cam-err-t').textContent = copy.title;
      $<HTMLElement>('.cam-err-s').textContent = copy.body;
      retryBtn.hidden = copy.primary === null;
      retryBtn.textContent = copy.primary ?? '';
      backBtn.textContent = copy.secondary;
    }

    const railKey = `${category}|${state.garmentId}|${state.applyingId}`;
    if (railKey !== lastRail) {
      lastRail = railKey;
      const keep = rail.scrollLeft;
      renderRail(state);
      rail.scrollLeft = keep;
    }

    debugBox.hidden = !o.debug;
    if (o.debug) debugBox.textContent = debugText(state);

    if (state.phase !== lastPhase) {
      // focus follows the panel, so keyboard users and Esc keep working (HANDOFF §9.10)
      if (state.phase === 'live') closeBtn.focus({ preventScroll: true });
      else if (state.phase === 'error' || state.phase === 'ended')
        (retryBtn.hidden ? backBtn : retryBtn).focus({ preventScroll: true });
      else if (state.phase === 'intro' && lastPhase !== null)
        startBtn.focus({ preventScroll: true });
      lastPhase = state.phase;
    }
  }

  function toast(message: string, ms = 2200) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span>${esc(message)}</span>`;
    toasts.replaceChildren(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    setTimeout(() => {
      t.classList.remove('is-in');
      setTimeout(() => t.remove(), 250);
    }, ms);
  }

  function start() {
    if (!consent.checked) {
      toast(DRAFT.consentNeeded);
      consent.focus();
      return;
    }
    if (o.accessCodeRequired()) {
      const code = codeInput.value.trim();
      if (!code) {
        toast(DRAFT.accessCodeNeeded);
        codeInput.focus();
        return;
      }
      o.accessCode.set(code);
    }
    void o.session.start();
  }

  el.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-act]');
    if (!target || !el.contains(target)) return;
    switch (target.dataset.act) {
      case 'close':
        o.onClose();
        break;
      case 'start':
        start();
        break;
      case 'retry':
        o.session.retry();
        break;
      case 'switch':
        void o.session.switchCamera();
        break;
      case 'cat':
        category = target.dataset.cat ?? category;
        renderCategories();
        lastRail = '';
        render(o.session.view);
        rail.scrollLeft = 0;
        (cats.querySelector(`[data-cat="${category}"]`) as HTMLElement | null)?.focus({
          preventScroll: true,
        });
        break;
      case 'pick':
        if (target.dataset.id) o.session.selectGarment(target.dataset.id);
        break;
    }
  });

  renderCategories();
  const unsubscribe = o.session.subscribe(render);

  return {
    el,
    toast,
    destroy() {
      unsubscribe();
      local.srcObject = null;
      out.srcObject = null;
      el.classList.add('is-closing');
      el.classList.remove('is-open');
      setTimeout(() => el.remove(), 280);
    },
  };
}
