/* ==========================================================================
   App shell: one instance per phone. Handles navigation, screen
   transitions, event delegation and in-phone overlays
   (bottom sheets, dialogs, toasts).

   Navigation model
   - Five primary screens (VT.data.tabs) sit behind the bottom tab bar.
     Each tab keeps its own stack, so switching tabs is instant and a tab
     comes back exactly as it was left (screen, scroll positions, inputs).
   - Secondary screens are pushed onto the current tab's stack, hide the
     tab bar and always have a back button.
   - Before setup is complete the app runs a separate launch flow
     (onboarding → avatar creation); afterwards it opens on 首页.

   Screens register in VT.screens[id] = { title, render(app, params),
   mount?(app, el, params, info), unmount?(app, el), actions?: { name(app, el, ev) } }
   Markup triggers behaviour with data-act="name" (click), data-input,
   data-change and data-enter (Enter key) attributes. Elements marked
   data-keep-scroll / data-keep-value are restored when a screen returns.
   ========================================================================== */
(function () {
  const VT = (window.VT = window.VT || {});
  VT.screens = VT.screens || {};
  VT.actions = VT.actions || {};

  const LAUNCH = 'launch';
  const TABS = () => VT.data.tabs.map((t) => t.id);
  const isTab = (id) => TABS().includes(id);

  /* where each secondary screen sits in the information architecture; used to
     build a sensible back path when a screen is opened directly (simulator, deep link) */
  const PARENT = {
    onboarding: null,
    product: 'plaza', checkout: 'product', messages: 'plaza', store: 'plaza',
    orderlist: 'profile', orders: 'orderlist', tracking: 'orders', returns: 'orders',
    avatarhub: 'profile', editprofile: 'profile', addresses: 'profile', payments: 'profile',
    notifications: 'profile', settings: 'profile', privacy: 'settings', help: 'profile',
    favorites: 'profile', history: 'profile',
    outfit: 'wardrobe', moment: 'wardrobe',
  };
  function parentOf(id, params) {
    if (id === 'avatar') return params && params.ctx === 'new' ? 'fitting' : params && params.from === 'profile' ? 'avatarhub' : 'onboarding';
    return PARENT[id] || null;
  }
  /* params an intermediate parent needs to render the right thing */
  function parentParams(parentId, child) {
    if (parentId === 'product') { const c = VT.store.get().cart; return { pid: (child.params && child.params.pid) || (c && c.p) || 'striped-shirt' }; }
    if (parentId === 'orders') return { oid: child.params && child.params.oid };
    if (parentId === 'orderlist') return { filter: 'all' };
    return {};
  }
  /** [root, …, id] — the stack a screen would have if reached by tapping through */
  function chainTo(id, params) {
    const chain = [{ id, params: params || {} }];
    for (let i = 0; i < 8 && !isTab(chain[0].id); i++) {
      const par = parentOf(chain[0].id, chain[0].params);
      if (!par) break;
      chain.unshift({ id: par, params: parentParams(par, chain[0]) });
    }
    return chain;
  }

  function snapshot(el) {
    const ui = { scroll: {}, values: {} };
    el.querySelectorAll('[data-keep-scroll]').forEach((n) => { ui.scroll[n.dataset.keepScroll] = [n.scrollTop, n.scrollLeft]; });
    el.querySelectorAll('[data-keep-value]').forEach((n) => { ui.values[n.dataset.keepValue] = n.value; });
    return ui;
  }
  function restore(el, ui) {
    el.querySelectorAll('[data-keep-scroll]').forEach((n) => { const v = ui.scroll[n.dataset.keepScroll]; if (v) { n.scrollTop = v[0]; n.scrollLeft = v[1]; } });
    el.querySelectorAll('[data-keep-value]').forEach((n) => { const v = ui.values[n.dataset.keepValue]; if (v != null) n.value = v; });
  }

  class App {
    constructor(root, opts) {
      const o = opts || {};
      this.root = root;
      this.preview = !!o.preview;
      this.s = o.state || VT.store.get();
      this.onChange = o.onChange || null;
      this.stacks = {};
      this.tab = null;
      this.timers = new Set();
      root.classList.add('vt-app');
      root.innerHTML = '<div class="vt-screens"></div><div class="vt-overlays"></div><div class="vt-toasts" role="status" aria-live="polite"></div>';
      this.screensEl = root.querySelector('.vt-screens');
      this.overlayEl = root.querySelector('.vt-overlays');
      this.toastEl = root.querySelector('.vt-toasts');
      if (!this.preview) this.bind();
      if (o.initial) this.open(o.initial, o.params || {});
      else this.launch();
    }

    get stack() { return this.stacks[this.tab] || (this.stacks[this.tab] = []); }
    get cur() { const st = this.stack; return st[st.length - 1]; }
    get params() { return (this.cur && this.cur.params) || {}; }
    get def() { return VT.screens[this.cur.id]; }
    /** true on a primary screen with nothing pushed on top */
    get atRoot() { return this.stack.length === 1 && isTab(this.cur.id); }
    screenEl() { return this.screensEl.querySelector('.screen.is-active'); }
    isTab(id) { return isTab(id); }

    /* ---------------- navigation ---------------- */
    /** app start: launch flow until setup is done, then straight to 首页 */
    launch() {
      this.closeAllOverlays(true);
      this.stacks = {};
      if (VT.store.get().setupDone) { this.tab = 'fitting'; this.stacks.fitting = [{ id: 'fitting', params: {} }]; }
      else { this.tab = LAUNCH; this.stacks[LAUNCH] = [{ id: 'onboarding', params: {} }]; }
      this.render('none');
    }

    /** leave the launch flow and enter the main app on 首页 */
    enterMain(anim) {
      VT.store.update((s) => { s.setupDone = true; });
      this.closeAllOverlays(true);
      this.stacks = {};
      this.tab = 'fitting';
      this.stacks.fitting = [{ id: 'fitting', params: {} }];
      this.render(anim || 'fade');
    }

    /** jump straight to any screen, with the back path it would normally have */
    open(id, params, opts) {
      if (!VT.screens[id]) { console.warn('unknown screen', id); return; }
      const chain = chainTo(id, params);
      const key = isTab(chain[0].id) ? chain[0].id : LAUNCH;
      this.closeAllOverlays(true);
      this.tab = key;
      this.stacks[key] = chain;
      this.render((opts && opts.anim) || 'none');
    }

    /**
     * go(id, params, opts)
     * - primary screen: switch tab. opts.tab (tab bar) keeps that tab's own
     *   history; contextual jumps (e.g. 去衣橱看看) show the tab's root.
     * - secondary screen: push onto the current tab (opts.replace swaps the top).
     */
    go(id, params, opts) {
      const o = opts || {};
      if (!VT.screens[id]) { console.warn('unknown screen', id); return; }
      this.closeAllOverlays(true);
      if (isTab(id)) {
        const kept = o.tab && this.stacks[id] && this.stacks[id].length;
        const same = this.tab === id;
        const deeper = same && this.stack.length > 1;
        // contextual jumps return to the tab's root, keeping its saved state
        if (!kept) this.stacks[id] = [(this.stacks[id] && this.stacks[id][0]) || { id, params: params || {} }];
        this.tab = id;
        this.render(o.anim || (o.tab ? 'none' : deeper ? 'pop' : same ? 'none' : 'fade'));
        return;
      }
      const st = this.stack;
      if (o.replace) st.pop();
      st.push({ id, params: params || {} });
      this.render(o.anim || 'push');
    }

    back() {
      if (this.overlayEl.querySelector('.ov.is-open')) { this.closeTopOverlay(); return; }
      const st = this.stack;
      if (st.length > 1) { st.pop(); this.render('pop'); return; }
      const cur = this.cur;
      if (!cur || isTab(cur.id)) return; // primary screens have no back
      const par = parentOf(cur.id, cur.params);
      if (!par) return;
      const chain = chainTo(par, parentParams(par, cur));
      const key = isTab(chain[0].id) ? chain[0].id : LAUNCH;
      this.tab = key;
      this.stacks[key] = chain;
      this.render('pop');
    }

    /** remove a screen (e.g. a finished checkout) from every stack */
    drop(id) {
      Object.keys(this.stacks).forEach((k) => {
        const st = this.stacks[k];
        const i = st.findIndex((e, n) => n > 0 && e.id === id);
        if (i > 0) st.splice(i);
      });
    }

    render(anim) {
      const entry = this.cur;
      const { id, params } = entry;
      const def = VT.screens[id];
      const old = this.screenEl();
      if (old && this._shown && !this.preview) this._shown.ui = snapshot(old);
      if (old && old._def && old._def.unmount && !this.preview) old._def.unmount(this, old);
      const el = document.createElement('section');
      el.className = `screen screen--${id}`;
      el.dataset.screen = id;
      el.setAttribute('aria-label', def.title || id);
      el._def = def;
      el.innerHTML = def.render(this, params);
      this.screensEl.appendChild(el);
      const restored = !!(entry.ui && !this.preview);
      if (!this.preview && def.mount) def.mount(this, el, params, { restored });
      if (this.preview && def.mountPreview) def.mountPreview(this, el, params);
      if (restored) restore(el, entry.ui);
      this._shown = entry;
      const animate = !this.preview && old && anim && anim !== 'none' && !VT.reducedMotion();
      if (!animate) {
        if (old) old.remove();
        el.classList.add('is-active');
      } else {
        old.classList.remove('is-active');
        old.classList.add('is-leaving', 'leave-' + anim);
        el.classList.add('is-active', 'enter-' + anim);
        const done = () => { old.remove(); el.classList.remove('enter-' + anim); };
        this.later(done, 420);
      }
      if (!this.preview) {
        const h = el.querySelector('h1, h2, [data-autofocus]');
        if (h && anim !== 'none') { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      }
      if (this.onChange) this.onChange(id, params);
    }

    /** re-render the active screen in place, keeping scroll positions */
    refresh() {
      const el = this.screenEl();
      if (!el) return;
      const def = el._def;
      const ui = snapshot(el);
      const active = document.activeElement;
      const focusKey = active && el.contains(active) ? active.getAttribute('data-focus-key') : null;
      if (def.unmount && !this.preview) def.unmount(this, el);
      el.innerHTML = def.render(this, this.params);
      restore(el, ui);
      if (!this.preview && def.mount) def.mount(this, el, this.params, { refresh: true });
      if (focusKey) {
        const f = el.querySelector(`[data-focus-key="${focusKey}"]`);
        if (f) f.focus({ preventScroll: true });
      }
    }

    later(fn, ms) {
      const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms);
      this.timers.add(t);
      return t;
    }

    /* ---------------- events ---------------- */
    bind() {
      const root = this.root;
      const find = (t, attr) => {
        const el = t.closest(`[${attr}]`);
        return el && root.contains(el) ? el : null;
      };
      const handler = (el, name, ev) => {
        const ov = el.closest('.ov');
        if (ov && ov._actions && ov._actions[name]) return () => ov._actions[name](el, ev);
        const cur = this.screenEl();
        const def = cur && cur._def;
        if (def && def.actions && def.actions[name]) return () => def.actions[name](this, el, ev);
        if (VT.actions[name]) return () => VT.actions[name](this, el, ev);
        return null;
      };
      root.addEventListener('click', (ev) => {
        const el = find(ev.target, 'data-act');
        if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
        if (el.closest('.screen.is-leaving')) return;
        const h = handler(el, el.dataset.act, ev);
        if (h) { ev.preventDefault(); h(); }
        else console.warn('[vt] no handler for', el.dataset.act);
      });
      root.addEventListener('input', (ev) => {
        const el = find(ev.target, 'data-input');
        if (!el) return;
        const h = handler(el, el.dataset.input, ev);
        if (h) h();
      });
      root.addEventListener('change', (ev) => {
        const el = find(ev.target, 'data-change');
        if (!el) return;
        const h = handler(el, el.dataset.change, ev);
        if (h) h();
      });
      root.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          if (this.overlayEl.querySelector('.ov.is-open')) { ev.stopPropagation(); this.closeTopOverlay(); }
          return;
        }
        if (ev.key === 'Enter' && !ev.isComposing) {
          const el = find(ev.target, 'data-enter');
          if (el) {
            const h = handler(el, el.dataset.enter, ev);
            if (h) { ev.preventDefault(); h(); }
          }
        }
      });
    }

    /* ---------------- overlays ---------------- */
    /**
     * sheet({ title, html, cls, actions, onClose, full })
     * actions: { name(el, ev) } for data-act elements inside the sheet
     */
    sheet(o) {
      const I = VT.icon;
      const ov = document.createElement('div');
      ov.className = `ov ov--sheet ${o.cls || ''}`;
      const labelId = 'sh-' + Math.random().toString(36).slice(2, 8);
      ov.innerHTML = `<div class="ov-scrim" data-act="ov-close"></div>
        <div class="sheet${o.full ? ' sheet--full' : ''}" role="dialog" aria-modal="true" ${o.title ? `aria-labelledby="${labelId}"` : 'aria-label="详情"'}>
          <div class="sheet-grab" aria-hidden="true"></div>
          ${o.title ? `<div class="sheet-head"><h3 id="${labelId}">${VT.esc(o.title)}</h3><button class="icon-btn sheet-x" type="button" data-act="ov-close" aria-label="关闭">${I('close', { size: 22 })}</button></div>` : ''}
          <div class="sheet-body">${o.html || ''}</div>
        </div>`;
      ov._actions = Object.assign({ 'ov-close': () => this.closeOverlay(ov) }, o.actions || {});
      ov._onClose = o.onClose;
      ov._returnFocus = document.activeElement;
      this.overlayEl.appendChild(ov);
      void ov.offsetWidth;
      ov.classList.add('is-open');
      const f = ov.querySelector('[data-autofocus]') || ov.querySelector('.sheet-x') || ov.querySelector('button, input, [tabindex]');
      if (f) this.later(() => f.focus({ preventScroll: true }), 60);
      return ov;
    }

    /** generic in-phone overlay (camera, generation progress…) */
    layer(o) {
      const ov = document.createElement('div');
      ov.className = `ov ov--layer ${o.cls || ''}`;
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.setAttribute('aria-label', o.label || '');
      ov.innerHTML = o.html || '';
      ov._actions = Object.assign({ 'ov-close': () => this.closeOverlay(ov) }, o.actions || {});
      ov._onClose = o.onClose;
      ov._returnFocus = document.activeElement;
      this.overlayEl.appendChild(ov);
      void ov.offsetWidth;
      ov.classList.add('is-open');
      return ov;
    }

    closeOverlay(ov, instant) {
      if (!ov || ov._closing) return;
      ov._closing = true;
      ov.classList.remove('is-open');
      ov.classList.add('is-closing');
      if (ov._onClose) { try { ov._onClose(); } catch (e) { console.error(e); } }
      const rf = ov._returnFocus;
      const remove = () => { ov.remove(); if (rf && document.body.contains(rf)) rf.focus({ preventScroll: true }); };
      if (instant || VT.reducedMotion()) remove(); else this.later(remove, 280);
    }

    closeTopOverlay() {
      const all = this.overlayEl.querySelectorAll('.ov.is-open');
      if (all.length) this.closeOverlay(all[all.length - 1]);
    }

    closeAllOverlays(instant) {
      this.overlayEl.querySelectorAll('.ov').forEach((ov) => this.closeOverlay(ov, instant));
    }

    /** dialog({ title, text, ok, cancel }) -> Promise<boolean> */
    dialog(o) {
      return new Promise((resolve) => {
        let answered = false;
        const ov = this.layer({
          cls: 'ov--dialog', label: o.title,
          html: `<div class="ov-scrim"></div><div class="dialog"><h3>${VT.esc(o.title)}</h3>${o.text ? `<p>${VT.ui.nl2br(o.text)}</p>` : ''}
            <div class="dialog-actions">${o.cancel === false ? '' : `<button type="button" class="btn btn--ghost" data-act="no">${VT.esc(o.cancel || '取消')}</button>`}
            <button type="button" class="btn btn--dark" data-act="yes" data-autofocus>${VT.esc(o.ok || '确定')}</button></div></div>`,
          actions: {
            yes: () => { answered = true; this.closeOverlay(ov); resolve(true); },
            no: () => { answered = true; this.closeOverlay(ov); resolve(false); },
          },
          onClose: () => { if (!answered) resolve(false); },
        });
        const b = ov.querySelector('[data-autofocus]');
        if (b) this.later(() => b.focus(), 50);
      });
    }

    toast(msg, opts) {
      const o = opts || {};
      const t = document.createElement('div');
      t.className = 'toast' + (o.icon ? ' has-icon' : '');
      t.innerHTML = `${o.icon ? VT.icon(o.icon, { size: 18 }) : ''}<span>${VT.esc(msg)}</span>${o.action ? `<button type="button" class="toast-act">${VT.esc(o.action)}</button>` : ''}`;
      if (o.action && o.onAction) t.querySelector('.toast-act').addEventListener('click', () => { o.onAction(); hide(); });
      this.toastEl.innerHTML = '';
      this.toastEl.appendChild(t);
      void t.offsetWidth;
      t.classList.add('is-in');
      const hide = () => { t.classList.remove('is-in'); this.later(() => t.remove(), 260); };
      this.later(hide, o.ms || (o.action ? 3600 : 2200));
    }
  }

  VT.reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  VT.App = App;

  /* ---------------- global actions ---------------- */
  Object.assign(VT.actions, {
    back(app) { app.back(); },
    nav(app, el) {
      const p = Object.assign({}, el.dataset);
      delete p.act; delete p.to;
      app.go(el.dataset.to, p);
    },
    /* bottom navigation: instant switch, each tab keeps its own state */
    tab(app, el) {
      const to = el.dataset.to;
      if (app.tab === to && app.atRoot) {
        const sc = app.screenEl().querySelector('.scroll[data-keep-scroll]');
        if (sc) sc.scrollTo({ top: 0, behavior: VT.reducedMotion() ? 'auto' : 'smooth' });
        return;
      }
      app.go(to, {}, { tab: true });
    },
    fav(app, el) {
      const pid = el.dataset.pid;
      let on = false;
      VT.store.update((s) => {
        on = !VT.store.h.isFav(s, pid);
        s.favorites[pid] = on;
      });
      app.screenEl().querySelectorAll(`.heart-btn[data-pid="${pid}"]`).forEach((b) => {
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.setAttribute('aria-label', on ? '取消收藏' : '收藏');
        const size = +(b.querySelector('svg').getAttribute('width')) || 24;
        b.innerHTML = VT.icon(on ? 'heart-filled' : 'heart', { size, stroke: 1.6 });
        b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      });
      app.toast(on ? '已收藏' : '已取消收藏');
    },
    toast(app, el) { app.toast(el.dataset.msg); },
    noop() {},
  });
})();
