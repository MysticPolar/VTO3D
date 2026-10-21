/* 首页 — 虚拟试衣间 (primary tab 1)
   The avatar is the 2D image of the active digital avatar (切换角色). Garment
   selection swaps to real on-body imagery only where it exists (base + three
   stylist looks); anything else is recorded in the outfit and flagged honestly.
   The right rail is one list of the active person's garments (VT.garments), whatever
   their source: this session's try-ons first (photos taken with 拍照, products tried on
   from elsewhere), then their wardrobe. ✓ marks the ones they own, and only those; the
   thin border marks what is worn. Photos are temporary: this browser session only, they
   reach 个人衣橱 only through 加入衣橱, and they are never drawn onto the avatar. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  const G = () => VT.garments;
  const esc = (x) => VT.esc(x);
  const SLOTS = ['top', 'bottom', 'dress', 'outer', 'shoes', 'bag', 'acc'];
  const EXTRA = ['outer', 'bag', 'acc', 'dress', 'shoes'];
  /** 切换场景: tonal backdrops behind the avatar cut-out (css: [data-scene]) */
  const SCENES = [
    { id: 'taupe', name: '暖灰' },
    { id: 'cream', name: '奶白' },
    { id: 'oat', name: '燕麦' },
    { id: 'cocoa', name: '深咖' },
  ];

  /** choose the existing render that best matches the selected outfit */
  function pickRender(outfit) {
    const renders = D().renders;
    const base = renders[0];
    let best = base, bestScore = -Infinity;
    renders.forEach((r) => {
      let score = 0;
      SLOTS.forEach((slot) => {
        const sel = outfit[slot];
        if (!sel) return;
        const rv = r.wears[slot];
        if (rv === sel) score += 3;
        else if (rv) score -= 2;
        else if (slot === 'dress' && (r.wears.top || r.wears.bottom)) score -= 2;
        else if ((slot === 'top' || slot === 'bottom') && r.wears.dress) score -= 2;
        else score -= 0.5;
      });
      EXTRA.forEach((slot) => {
        if (!outfit[slot] && r.wears[slot] && r.wears[slot] !== base.wears[slot]) score -= 0.3;
      });
      if (score > bestScore + 1e-6) { best = r; bestScore = score; }
    });
    const missing = SLOTS.filter((slot) => outfit[slot] && best.wears[slot] !== outfit[slot]).map((slot) => outfit[slot]);
    return { render: best, missing };
  }

  /** put a garment in its slot: a dress clears top and bottom, a top or bottom clears the dress */
  function wear(o, slot, id) {
    o[slot] = id;
    if (slot === 'dress') { delete o.top; delete o.bottom; }
    if (slot === 'top' || slot === 'bottom') delete o.dress;
  }

  let previewOv = null; // the open 确认衣物照片 sheet

  /** the outfit and the rail stay one list: a photo gone with an earlier session comes off; a product
      worn from elsewhere (an older pick, say) becomes a temporary garment the rail shows */
  function syncOutfit() {
    const s = VT.store.get();
    const o = s.fit.outfit;
    const fix = {};
    Object.keys(o).forEach((k) => {
      if (typeof o[k] !== 'string' || !o[k].startsWith('up:')) return;
      const g = G().fromRef(s, o[k]);
      const r = g ? G().ref(g) : null;
      if (r !== o[k]) fix[k] = r;
    });
    G().adopt(s, Object.values(o).filter((v) => typeof v === 'string' && !v.startsWith('up:')));
    if (Object.keys(fix).length) VT.store.update((st) => { Object.keys(fix).forEach((k) => { if (fix[k]) st.fit.outfit[k] = fix[k]; else delete st.fit.outfit[k]; }); });
  }

  /** a camera roll name (IMG_0042, image, 微信图片…) says nothing about the garment */
  function cleanName(file) {
    const base = String(file || '').replace(/\.[a-z0-9]+$/i, '').trim();
    if (!base || /^(img|image|photo|dsc|pxl|mmexport|wx_camera|screenshot|微信图片|截屏)[\s_-]?\d*/i.test(base)) return '我的衣物';
    return base.slice(0, 16);
  }

  /* ---------- markup ---------- */
  function menu(s) {
    return D().fitCats.map((c) => {
      const on = c.id === s.fit.cat;
      return `<li><button type="button" class="fit-cat ${on ? 'is-on' : ''}" data-act="cat" data-cat="${c.id}" aria-pressed="${on}">
        <span class="fit-cat-ic">${I(on ? c.icon + '-filled' : c.icon, { size: on ? 27 : 26, stroke: 1.5 })}</span><span class="fit-cat-l">${c.label}</span></button></li>`;
    }).join('');
  }

  /** every garment of the selected category, whatever its source; ✓ on the owned ones */
  function rail(s) {
    const sel = new Set(Object.values(s.fit.outfit).filter(Boolean));
    const items = G().all(s).filter((g) => G().inFitCat(g, s.fit.cat));
    if (!items.length) return `<li class="fit-rail-note">还没有${(D().fitCats.find((c) => c.id === s.fit.cat) || D().fitCats[0]).label}</li>`;
    return items.map((g, i) => {
      const on = sel.has(G().ref(g));
      const p = G().product(g);
      const act = g.custom ? `data-act="pick-up" data-up="${g.uid}"` : `data-act="pick" data-pid="${g.p}"`;
      const label = `${on ? '取消试穿' : '试穿'}${esc(G().nameOf(g))}${g.isOwned ? '，已拥有' : ''}`;
      return `<li><button type="button" class="fit-thumb ${on ? 'is-on' : ''}" ${act} aria-pressed="${on}" aria-label="${label}">
        ${VT.ui.img(g.custom ? g.custom.src : p.img.thumb || p.img.tile, '', 'fit-thumb-img', i >= RAIL_EAGER ? 'loading="lazy"' : '')}${VT.ui.ownMark(g.isOwned)}</button></li>`;
    }).join('');
  }

  /** the rail shows about eight tiles on a 844 px screen; tiles further down load when scrolled to,
      so they don't compete with the body render a pick is waiting for */
  const RAIL_EAGER = 8;

  /** the four body renders (≈ 425 KB together) are what every outfit change waits for: fetch them at
      low priority once 首页 has drawn, so later picks swap from the cache instead of the network */
  let preloads = null;
  function preloadRenders() {
    if (preloads) return;
    preloads = D().renders.map((r) => {
      const im = new Image();
      im.decoding = 'async';
      im.fetchPriority = 'low';
      im.src = r.img;
      return im;
    });
  }

  /** 临时试穿: the newest garment photo being tried on (photos have no on-body image), with 加入衣橱 */
  function dock(s) {
    const worn = new Set(Object.values(s.fit.outfit));
    const u = G().all(s).find((g) => g.custom && worn.has(G().ref(g)));
    const temp = u ? `
      <div class="fit-temp" role="group" aria-label="临时试穿">
        <div class="fit-temp-top">${VT.ui.img(u.custom.src, '', 'fit-temp-img')}<b class="fit-temp-t">临时试穿</b></div>
        <p class="fit-temp-note">演示版暂无上身图</p>
        ${u.isTemporary
          ? `<button type="button" class="fit-temp-btn" data-act="keep" data-up="${u.uid}" aria-label="将${esc(u.custom.name)}加入衣橱">${I('plus', { size: 14, stroke: 2.2 })}加入衣橱</button>`
          : `<button type="button" class="fit-temp-btn is-done" disabled>${I('hanger', { size: 15, stroke: 1.8 })}已在衣橱</button>`}
      </div>` : '';
    return `${temp}<button type="button" class="fit-pill fit-save" data-act="save-look" aria-label="保存造型到穿搭瞬间">${I('image', { size: 19, stroke: 1.6 })}<span>保存造型</span></button>
      <button type="button" class="fit-pill fit-shoot" data-act="shoot-menu" aria-haspopup="menu" aria-expanded="false">${I('camera', { size: 20, stroke: 1.6 })}<span>拍照</span></button>`;
  }

  function avatarLayers(s) {
    const { render } = pickRender(s.fit.outfit);
    return `<img class="fit-avatar-img is-cur" src="${render.img}" alt="数字分身当前造型：${render.label}" decoding="async" draggable="false" data-render="${render.id}">`;
  }

  VT.screens.fitting = {
    title: '虚拟试衣间',
    mount(app) {
      // only once the page has loaded: earlier, the preloads would compete with the screen's own
      // images and hold the load event, keeping the browser's loading indicator spinning
      if (document.readyState === 'complete') app.later(preloadRenders, 400);
      else window.addEventListener('load', () => app.later(preloadRenders, 400), { once: true });
    },
    render(app) {
      syncOutfit();
      const s = app.s;
      const who = VT.store.avatars.nameOf(s, VT.store.avatars.active(s));
      return `
        <div class="fit-plate" data-scene="${s.fitScene || 'taupe'}" aria-hidden="true"></div>
        ${VT.ui.statusBar('light')}
        <div class="fit-avatar"><i class="fit-shadow" aria-hidden="true"></i>${avatarLayers(s)}</div>
        <header class="fit-head">
          <div class="fit-switch">
            <button type="button" class="fit-pill" data-act="role" aria-haspopup="dialog" aria-label="切换角色，当前：${esc(who)}">${I('person', { size: 19, stroke: 1.6 })}<span>切换角色</span>${I('chevron-down', { size: 14, stroke: 1.9 })}</button>
            <button type="button" class="fit-pill" data-act="scene" aria-haspopup="dialog">${I('home', { size: 19, stroke: 1.6 })}<span>切换场景</span>${I('chevron-down', { size: 14, stroke: 1.9 })}</button>
          </div>
          <h1 class="fit-title">虚拟试衣间</h1>
          <button type="button" class="fit-cam" data-act="camera" aria-label="开启视频试衣（摄像头预览）"><span class="fit-cam-ic">${I('video', { size: 17, stroke: 1.7 })}</span><span class="fit-cam-l">开启视频试衣</span>${I('chevron-right', { size: 13, stroke: 2 })}</button>
        </header>
        <nav class="fit-menu" aria-label="服装分类"><ul>${menu(s)}</ul></nav>
        <div class="fit-picker">
          <div class="fit-rail scroll" data-keep-scroll="rail" aria-label="可试穿单品"><ul>${rail(s)}</ul></div>
        </div>
        <div class="fit-dock">${dock(s)}</div>
        <input class="sr-only fit-file" type="file" accept="image/*" data-change="up-file" data-src="gallery" tabindex="-1" aria-hidden="true">
        <input class="sr-only fit-file" type="file" accept="image/*" capture="environment" data-change="up-file" data-src="camera" tabindex="-1" aria-hidden="true">
        ${VT.ui.tabBar('fitting')}`;
    },
    actions: {
      cat(app, el) {
        const id = el.dataset.cat;
        VT.store.update((s) => { s.fit.cat = id; });
        update(app, { top: true });
        const btn = app.screenEl().querySelector(`.fit-cat[data-cat="${id}"]`);
        if (btn) btn.focus({ preventScroll: true });
      },
      pick(app, el) {
        const pid = el.dataset.pid;
        const p = D().byId[pid];
        const slot = D().slotOf(p);
        let added = false;
        VT.store.update((s) => {
          if (s.fit.outfit[slot] === pid) delete s.fit.outfit[slot];
          else { wear(s.fit.outfit, slot, pid); added = true; }
        });
        update(app);
        refocus(app, `.fit-thumb[data-pid="${pid}"]`);
        const { render, missing } = pickRender(app.s.fit.outfit);
        swapRender(app, render);
        if (added && missing.includes(pid)) {
          app.toast(`演示版暂无「${p.name}」的上身图，已加入当前搭配`, { ms: 2800 });
        } else if (added) {
          app.toast(`已试穿：${p.name}`);
        }
      },
      /** try a garment photo on, or take it off; it is never drawn onto the avatar */
      'pick-up'(app, el) {
        const g = G().find(app.s, el.dataset.up);
        if (!g || !g.custom) return;
        const u = { id: g.uid, name: g.custom.name };
        const slot = g.custom.cat, ref = G().ref(g);
        let added = false;
        VT.store.update((s) => {
          if (s.fit.outfit[slot] === ref) delete s.fit.outfit[slot];
          else { wear(s.fit.outfit, slot, ref); added = true; }
        });
        update(app);
        refocus(app, `.fit-thumb[data-up="${u.id}"]`);
        swapRender(app, pickRender(app.s.fit.outfit).render);
        if (added) app.toast(`演示版暂无「${u.name}」的上身图，已加入临时试穿`, { ms: 2800 });
      },
      'shoot-menu'(app, el) { shootMenu(app, el); },
      async 'up-file'(app, el) {
        const f = el.files && el.files[0];
        el.value = '';
        if (!f) return;
        try {
          const img = await VT.avatarGen.readImage(f, 520, 0.82);
          preview(app, { src: img.src, name: cleanName(f.name), source: el.dataset.src });
        } catch (e) {
          app.toast(e.message === 'type' ? '请选择图片文件（JPG / PNG 等）' : e.message === 'size' ? '图片超过 25MB，请换一张' : '无法读取这张图片，请换一张');
        }
      },
      /** 加入衣橱: the only way a photo reaches the active avatar's wardrobe (not owned: 个人衣橱 can mark it) */
      keep(app, el) {
        if (!G().keep(el.dataset.up)) return;
        VT.store.update((s) => { s.wardrobeCat = 'all'; });
        update(app);
        const A = VT.store.avatars;
        const s = app.s;
        const msg = A.list(s).length > 1 ? `已加入「${A.nameOf(s, A.active(s))}」的衣橱` : '已加入个人衣橱';
        app.toast(msg, { icon: 'check', action: '去看看', onAction: () => app.go('wardrobe') });
        const done = app.screenEl().querySelector('.fit-temp-btn');
        if (done) done.focus({ preventScroll: true });
      },
      camera(app) { VT.camera.open(app); },
      /** 保存造型: the current try-on joins the active avatar's 穿搭瞬间 (个人衣橱) */
      'save-look'(app) { VT.wardrobe.saveLook(app); },
      role(app) { VT.avatarUI.switcher(app); },
      scene(app) { sceneSheet(app); },
    },
  };

  /** re-render the parts of the screen that follow the outfit, category and source */
  function update(app, o) {
    const root = app.screenEl();
    if (!root || root.dataset.screen !== 'fitting') return;
    const s = app.s;
    root.querySelector('.fit-menu ul').innerHTML = menu(s);
    const r = root.querySelector('.fit-rail');
    const st = r.scrollTop;
    r.querySelector('ul').innerHTML = rail(s);
    r.scrollTop = o && o.top ? 0 : st;
    root.querySelector('.fit-dock').innerHTML = dock(s);
  }

  /** keep keyboard focus on the tile just used; if it left the rail, on the active category */
  function refocus(app, sel) {
    const root = app.screenEl();
    const el = root.querySelector(sel) || root.querySelector('.fit-cat.is-on');
    if (el) el.focus({ preventScroll: true });
  }

  /** cross-fade to `render` once its image has loaded. The newest pick wins: on a slow network a
      swap still waiting for its image is dropped, so picks in quick succession never stack images
      or end on a garment that is no longer worn. */
  function swapRender(app, render) {
    const box = app.screenEl().querySelector('.fit-avatar');
    box.querySelectorAll('.fit-avatar-img.is-next').forEach((n) => { n.onload = n.onerror = null; n.remove(); });
    const cur = box.querySelector('.fit-avatar-img.is-cur');
    if (cur && cur.dataset.render === render.id) return;
    const img = document.createElement('img');
    img.className = 'fit-avatar-img is-next';
    img.alt = '数字分身当前造型：' + render.label;
    img.decoding = 'async';
    img.draggable = false;
    img.dataset.render = render.id;
    img.src = render.img;
    box.appendChild(img);
    const go = () => {
      if (!img.isConnected) return; // dropped by a newer pick
      img.classList.add('is-cur');
      img.classList.remove('is-next');
      box.querySelectorAll('.fit-avatar-img.is-cur').forEach((o) => {
        if (o === img) return;
        o.classList.remove('is-cur'); o.classList.add('is-out'); app.later(() => o.remove(), 450);
      });
    };
    if (img.complete) requestAnimationFrame(go); else { img.onload = go; img.onerror = go; }
  }

  /* ---------- 拍照: a small menu above the button ---------- */
  /** offset of `el` inside the app root, independent of any scaling of the phone frame */
  function offsetIn(el, root) {
    let x = 0, y = 0;
    for (let n = el; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return { x, y };
  }
  const fileInput = (app, src) => app.screenEl().querySelector(`.fit-file[data-src="${src}"]`);
  /** phones open their own camera from the file input; desktops get the in-app camera */
  const nativeCamera = () => !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  function shootMenu(app, trigger) {
    const shoot = app.screenEl().querySelector('.fit-shoot');
    const ov = app.layer({
      cls: 'ov--pop', label: '上传衣物',
      html: `<div class="ov-scrim" data-act="ov-close"></div>
        <div class="fit-pop" role="menu" aria-label="上传衣物">
          <button type="button" role="menuitem" data-act="pop-camera">${I('camera', { size: 22, stroke: 1.6 })}<span>拍摄衣服</span></button>
          <button type="button" role="menuitem" data-act="pop-gallery">${I('image', { size: 22, stroke: 1.6 })}<span>从相册上传</span></button>
        </div>`,
      actions: {
        'pop-camera': () => { app.closeOverlay(ov, true); takePhoto(app); },
        'pop-gallery': () => { app.closeOverlay(ov, true); openPicker(app, 'gallery'); },
      },
      onClose: () => { if (shoot) shoot.setAttribute('aria-expanded', 'false'); },
    });
    if (shoot) ov._returnFocus = shoot; // Safari doesn't focus a tapped button
    // sit just above the 拍照 button, whichever control opened the menu
    const pop = ov.querySelector('.fit-pop');
    const at = offsetIn(shoot || trigger, app.root);
    pop.style.left = at.x + 'px';
    pop.style.bottom = (app.root.offsetHeight - at.y + 10) + 'px';
    if (shoot) shoot.setAttribute('aria-expanded', 'true');
    app.later(() => { const b = pop.querySelector('button'); if (b) b.focus({ preventScroll: true }); }, 40);
  }

  function openPicker(app, src) {
    const input = fileInput(app, src);
    if (!input) return;
    input.value = '';
    input.click();
  }

  function takePhoto(app) {
    if (nativeCamera()) { openPicker(app, 'camera'); return; }
    VT.camera.capture(app, {
      onShot: (src) => preview(app, { src, name: '我的衣物', source: 'capture' }),
      onGallery: () => openPicker(app, 'gallery'),
    });
  }

  /* ---------- 确认衣物照片: confirm, cancel or choose another photo ---------- */
  function preview(app, pick) {
    if (previewOv && !previewOv._closing && document.body.contains(previewOv)) {
      // 重新选择 brought a new photo: swap it in and keep the chosen category
      previewOv._src = pick.src;
      previewOv.querySelector('.fu-img').src = pick.src;
      previewOv.querySelector('.js-name').value = pick.name;
      return;
    }
    let cat = app.s.fit.cat;
    const ov = app.sheet({
      title: '确认衣物照片',
      cls: 'ov--fitup',
      html: `<div class="fu-photo"><img class="fu-img" src="${pick.src}" alt="待试穿的衣物照片"></div>
        <label class="field"><span class="field-label">名称</span><span class="field-row"><input type="text" maxlength="16" class="js-name" value="${esc(pick.name)}" placeholder="例如：米白针织开衫" aria-label="衣物名称"></span></label>
        <span class="field-label">分类</span>
        <div class="fu-cats">${D().fitCats.map((c) => `<button type="button" class="chip ${c.id === cat ? 'is-on' : ''}" data-act="fu-cat" data-cat="${c.id}" aria-pressed="${c.id === cat}">${c.label}</button>`).join('')}</div>
        <p class="sheet-note">照片只在本次试衣中临时保留，加入衣橱即可长期保存</p>
        <div class="sheet-actions"><button type="button" class="btn btn--ghost btn--lg" data-act="fu-again">重新选择</button><button type="button" class="btn btn--dark btn--lg" data-act="fu-ok" data-autofocus>确认试穿</button></div>`,
      actions: {
        'fu-cat': (el) => {
          cat = el.dataset.cat;
          ov.querySelectorAll('.fu-cats .chip').forEach((c) => { const on = c.dataset.cat === cat; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on); });
        },
        'fu-again': () => {
          if (ov._source === 'capture') { app.closeOverlay(ov, true); takePhoto(app); }
          else openPicker(app, ov._source === 'camera' ? 'camera' : 'gallery');
        },
        'fu-ok': () => {
          const name = (ov.querySelector('.js-name').value || '').trim() || '我的衣物';
          app.closeOverlay(ov);
          addUpload(app, { src: ov._src, name, cat });
        },
      },
      onClose: () => { if (previewOv === ov) previewOv = null; },
    });
    ov._src = pick.src;
    ov._source = pick.source;
    previewOv = ov;
  }

  /** a confirmed photo joins the rail (a temporary garment, this session only) and goes on at once */
  function addUpload(app, o) {
    const g = G().addPhoto(app.s, { src: o.src, name: o.name, cat: G().CAT_OF[o.cat] });
    VT.store.update((s) => { s.fit.cat = o.cat; wear(s.fit.outfit, g.custom.cat, G().ref(g)); });
    update(app, { top: true });
    refocus(app, `.fit-thumb[data-up="${g.uid}"]`);
    swapRender(app, pickRender(app.s.fit.outfit).render);
    app.toast(`演示版暂无「${g.custom.name}」的上身图，已加入临时试穿`, { ms: 2800 });
  }

  /* ---------- 切换场景 ---------- */
  function sceneSheet(app) {
    const opt = (sc, on) => `<button type="button" class="fs-opt ${on ? 'is-on' : ''}" role="radio" aria-checked="${on}" data-act="fs-pick" data-scene="${sc.id}">
      <span class="fs-sw" data-scene="${sc.id}">${VT.ui.img('assets/people/avatar-base.webp', '', 'fs-fig')}</span><span class="fs-name">${sc.name}</span></button>`;
    const ov = app.sheet({
      title: '切换场景',
      html: `<div class="fs-grid" role="radiogroup" aria-label="试衣间背景">${SCENES.map((sc) => opt(sc, sc.id === (app.s.fitScene || 'taupe'))).join('')}</div>
        <p class="sheet-note">场景只更换试衣间的背景，不影响当前搭配</p>`,
      actions: {
        'fs-pick': (el) => {
          const id = el.dataset.scene;
          VT.store.update((s) => { s.fitScene = id; });
          ov.querySelectorAll('.fs-opt').forEach((b) => { const on = b.dataset.scene === id; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); });
          const plate = app.screenEl().querySelector('.fit-plate');
          if (plate) plate.dataset.scene = id;
        },
      },
    });
  }

  VT.fitting = { pickRender };
})();
