/* ==========================================================================
   Mode A — horizontal feature showcase (the five primary screens)
   Mode B — interactive phone simulator (desktop overlay / mobile full-screen)

   URL options:  #<screen>       open the simulator on any screen (#fitting,
                                 #profile, #orders …); #sim=<screen> also works
                 ?app=<screen>   bare app filling the viewport (no frame)
   ========================================================================== */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const BOARD_W = 1672, BOARD_H = 941;
  const PREVIEW_W = 390, PREVIEW_H = 844;
  const screens = VT.data.screens; // the five primary screens, board order
  const flows = VT.data.flows;     // secondary screens, listed in the simulator
  const allIds = () => Object.keys(VT.screens);

  const qs = new URLSearchParams(location.search);
  const showcaseEl = document.getElementById('showcase');
  const simEl = document.getElementById('sim');
  const mqMobile = window.matchMedia('(max-width: 640px), (max-height: 520px) and (pointer: coarse)');

  let liveApp = null;
  let simOpen = false;
  let mode = null; // 'board' | 'sim' | 'solo' | 'board-mobile'

  /* ---------------- board ---------------- */
  function buildBoard() {
    const defaults = VT.store.defaults();
    showcaseEl.innerHTML = `
      <div class="board-stage">
        <div class="board" style="width:${BOARD_W}px;height:${BOARD_H}px">
          <div class="board-bg" aria-hidden="true"></div>
          <header class="board-head">
            <h1 class="board-title">全新的购物体验<i class="board-dot" aria-hidden="true"></i></h1>
            <p class="board-sub">虚拟试衣<b>·</b>个人衣橱<b>·</b>智能购物</p>
          </header>
          <ol class="board-phones">
            ${screens.map((s, i) => `
              <li class="board-item" style="--i:${i}">
                <button type="button" class="board-phone" data-screen="${s.id}" aria-label="打开第 ${s.n} 个主屏「${s.title}」的交互原型">
                  <span class="mini-phone"><span class="mini-screen"><span class="mini-app" data-preview="${s.id}"></span></span><span class="mini-notch"></span></span>
                  <span class="board-hover"><span>${I('phoneframe', { size: 18 })}进入交互原型</span></span>
                </button>
                <div class="board-cap"><h2><span>${s.n}.</span>${s.caption}</h2><p>${VT.ui.nl2br(s.desc)}</p></div>
              </li>`).join('')}
          </ol>
          <p class="board-hint">${I('phoneframe', { size: 15 })}点击任意手机，进入可交互的 App 原型</p>
        </div>
      </div>`;
    // live previews: each phone renders the real screen markup from pristine demo data
    showcaseEl.querySelectorAll('[data-preview]').forEach((el) => {
      el.style.width = PREVIEW_W + 'px';
      el.style.height = PREVIEW_H + 'px';
      const st = JSON.parse(JSON.stringify(defaults));
      new VT.App(el, { preview: true, state: st, initial: el.dataset.preview });
    });
    showcaseEl.addEventListener('click', (e) => {
      const b = e.target.closest('.board-phone');
      if (!b) return;
      if (simEl.classList.contains('is-behind')) {
        simEl.classList.remove('is-behind');
        showcaseEl.classList.remove('has-close');
        const c = showcaseEl.querySelector('.board-close');
        if (c) c.remove();
      }
      openSim(b.dataset.screen);
    });
    fitBoard();
  }

  function fitBoard() {
    const stage = showcaseEl.querySelector('.board-stage');
    const board = showcaseEl.querySelector('.board');
    if (!board) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (mqMobile.matches) {
      // phones on mobile: fit board height to the viewport, scroll sideways
      const k = Math.min(1, (vh - 24) / BOARD_H);
      board.style.transform = `scale(${k})`;
      stage.style.width = BOARD_W * k + 'px';
      stage.style.height = BOARD_H * k + 'px';
      stage.classList.add('is-scroll');
    } else {
      const k = Math.min(vw / BOARD_W, vh / BOARD_H);
      board.style.transform = `scale(${k})`;
      stage.style.width = BOARD_W * k + 'px';
      stage.style.height = BOARD_H * k + 'px';
      stage.classList.remove('is-scroll');
    }
  }

  /* ---------------- simulator ---------------- */
  function buildSim() {
    simEl.innerHTML = `
      <div class="sim-bg" aria-hidden="true"></div>
      <aside class="sim-side sim-left" aria-label="原型导航">
        <button type="button" class="sim-back" data-sim="close">${I('back', { size: 20, stroke: 2 })}<span>返回展示板</span></button>
        <div class="sim-nav">
          <p class="sim-label">主导航 · 底部标签</p>
          <ol class="sim-list">${screens.map((s) => `<li><button type="button" data-sim="go" data-screen="${s.id}"><b>${s.n}</b><span>${s.title}</span></button></li>`).join('')}</ol>
          <p class="sim-label">流程页面</p>
          <ul class="sim-list sim-list--flows">${flows.map((f) => `<li><button type="button" data-sim="open" data-screen="${f.id}"><i aria-hidden="true"></i><span>${f.title}<em>${f.from}</em></span></button></li>`).join('')}</ul>
        </div>
      </aside>
      <div class="sim-stage">
        <div class="sim-phone">
          <div class="phone">
            <div class="phone-screen"><div class="sim-app"></div><div class="phone-notch" aria-hidden="true"></div></div>
          </div>
        </div>
      </div>
      <aside class="sim-side sim-right" aria-label="原型说明">
        <div class="sim-note">
          <h3>交互原型说明</h3>
          <ul>
            <li>底部 5 个标签即时切换，各自保留浏览状态</li>
            <li>首次启动显示引导与数字分身创建，完成后直接进入首页</li>
            <li>照片上传、摄像头预览为真实浏览器能力</li>
            <li>数字分身生成、AI 造型师、支付为演示模拟</li>
          </ul>
        </div>
        <button type="button" class="sim-reset" data-sim="reset">${I('reset', { size: 18 })}<span>重置演示数据</span></button>
      </aside>
      <div class="solo-menu" hidden>
        <button type="button" class="solo-fab" data-sim="menu" aria-label="原型菜单" aria-expanded="false">${I('showcase', { size: 20 })}</button>
        <div class="solo-panel" hidden>
          <button type="button" data-sim="board">${I('showcase', { size: 18 })}<span>查看展示板</span></button>
          <p class="solo-label">流程页面</p>
          <div class="solo-pages">${flows.map((f) => `<button type="button" data-sim="open" data-screen="${f.id}">${f.title.replace(' · 创建数字分身', '')}</button>`).join('')}</div>
          <button type="button" data-sim="reset">${I('reset', { size: 18 })}<span>重置演示数据</span></button>
        </div>
      </div>`;
    const appRoot = simEl.querySelector('.sim-app');
    liveApp = new VT.App(appRoot, { onChange: highlight }); // launch: onboarding first time, then 首页
    VT.liveApp = liveApp;
    simEl.addEventListener('click', onSimClick);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && simOpen && mode === 'sim' && !liveApp.overlayEl.querySelector('.ov.is-open')) closeSim();
    });
  }

  function show(id) {
    if (!id || !VT.screens[id]) return;
    if (liveApp.isTab(id)) liveApp.go(id, {}, { anim: 'none' });
    else liveApp.open(id);
  }

  async function onSimClick(e) {
    const b = e.target.closest('[data-sim]');
    if (!b) return;
    const act = b.dataset.sim;
    if (act === 'close') closeSim();
    if (act === 'go' || act === 'open') { show(b.dataset.screen); toggleMenu(false); }
    if (act === 'board') { toggleMenu(false); showBoardFromSolo(); }
    if (act === 'menu') toggleMenu();
    if (act === 'reset') {
      toggleMenu(false);
      const ok = await liveApp.dialog({ title: '重置演示数据？', text: '衣橱新增、收藏、订单、聊天与上传的照片\n将恢复为初始演示状态，并重新进入首次启动流程。', ok: '重置' });
      if (ok) {
        VT.store.reset();
        liveApp.s = VT.store.get();
        liveApp.launch();
        liveApp.toast('演示数据已重置');
      }
    }
  }

  function toggleMenu(force) {
    const panel = simEl.querySelector('.solo-panel');
    const fab = simEl.querySelector('.solo-fab');
    if (!panel) return;
    const open = force === undefined ? panel.hidden : force;
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function highlight(id) {
    simEl.querySelectorAll('.sim-list button, .solo-pages button').forEach((b) => b.classList.toggle('is-on', b.dataset.screen === id));
    if (mode === 'sim' && simOpen) setHash('#' + id);
  }

  function fitPhone() {
    const phone = simEl.querySelector('.sim-phone');
    if (!phone || mode !== 'sim') return;
    const vh = window.innerHeight, vw = window.innerWidth;
    const sideW = vw > 1100 ? 560 : 0;
    const k = Math.min((vh - 48) / 868, (vw - sideW - 32) / 414, 1.15);
    phone.style.setProperty('--k', k.toFixed(4));
  }

  /** open the simulator; without a target the app launches normally */
  function openSim(screenId) {
    const fresh = !liveApp;
    if (fresh) buildSim();
    simOpen = true;
    setMode(mqMobile.matches ? 'solo' : 'sim');
    simEl.hidden = false;
    if (screenId) show(screenId);
    else if (!fresh) liveApp.launch();
    if (mode === 'sim') setHash('#' + liveApp.cur.id);
    requestAnimationFrame(() => simEl.classList.add('is-open'));
  }

  function setHash(h) {
    try { history.replaceState(null, '', h || location.pathname + location.search); } catch (e) { /* embedded pages may refuse */ }
  }

  function closeSim() {
    simOpen = false;
    simEl.classList.remove('is-open');
    setTimeout(() => { if (!simOpen) simEl.hidden = true; }, 260);
    setHash('');
    setMode('board');
  }

  function showBoardFromSolo() {
    simEl.classList.add('is-behind');
    setMode('board-mobile');
    showcaseEl.classList.add('has-close');
    if (!showcaseEl.querySelector('.board-close')) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'board-close';
      c.innerHTML = `${I('phoneframe', { size: 18 })}<span>返回 App</span>`;
      c.addEventListener('click', () => { simEl.classList.remove('is-behind'); showcaseEl.classList.remove('has-close'); c.remove(); setMode('solo'); });
      showcaseEl.appendChild(c);
    }
  }

  function setMode(m) {
    mode = m;
    document.body.dataset.mode = m;
    const solo = m === 'solo';
    simEl.classList.toggle('is-solo', solo);
    const menu = simEl.querySelector('.solo-menu');
    if (menu) menu.hidden = !solo;
    if (m === 'sim') fitPhone();
    fitBoard();
  }

  /* ---------------- boot ---------------- */
  function boot() {
    VT.store.load();
    const solo = qs.get('app');
    if (solo) {
      // bare app: used for pixel comparisons and deep links
      document.body.dataset.mode = 'bare';
      showcaseEl.remove();
      simEl.hidden = false;
      simEl.className = 'bare';
      const root = document.createElement('div');
      root.className = 'bare-app';
      simEl.appendChild(root);
      const h = qs.get('h');
      if (h) { root.style.height = h + 'px'; }
      const params = Object.fromEntries([...qs.entries()].filter(([k]) => !['app', 'h', 'preview'].includes(k)));
      liveApp = new VT.App(root, solo === 'launch' ? {} : { initial: solo, params, preview: qs.get('preview') === '1' });
      VT.liveApp = liveApp;
      return;
    }
    buildBoard();
    setMode('board');
    const m = location.hash.match(/^#(?:sim=)?([a-z]+)$/);
    if (m && allIds().includes(m[1])) openSim(m[1]);
    else if (mqMobile.matches) openSim(); // phones: the app itself, launched normally
    window.addEventListener('resize', () => { fitBoard(); fitPhone(); });
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', () => { if (simOpen) setMode(mqMobile.matches ? 'solo' : 'sim'); fitBoard(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
