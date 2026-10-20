/* 首页 — 虚拟试衣间 (primary tab 1)
   The avatar is the 2D image of the active digital avatar (切换角色). Garment
   selection swaps to real on-body imagery only where it exists (base + three
   stylist looks); anything else is recorded in the outfit and flagged honestly.
   The right rail has two sources: 推荐 (the try-on catalogue, garments with an
   on-body image first) and 我的上传 (garment photos taken or picked with 拍照).
   Uploads are temporary: they live in this browser session only and reach
   个人衣橱 only through 加入衣橱. They are never drawn onto the avatar. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  const esc = (x) => VT.esc(x);
  const SLOTS = ['top', 'bottom', 'dress', 'outer', 'shoes', 'bag', 'acc'];
  const EXTRA = ['outer', 'bag', 'acc', 'dress', 'shoes'];
  /** the outfit slot an upload fills, from the 首页 category it is filed under */
  const CAT_SLOT = { upper: 'top', lower: 'bottom', dress: 'dress', outer: 'outer', shoes: 'shoes', bag: 'bag', acc: 'acc' };
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

  /* ---------- 我的上传: garment photos kept for this browser session only ---------- */
  const UP_KEY = 'vt-fit-uploads-v1';
  let uploads = readUploads(); // newest first: { id, src, name, cat, at }
  let railSrc = 'rec'; // 'rec' 推荐 · 'mine' 我的上传
  let previewOv = null; // the open 确认衣物照片 sheet

  function readUploads() {
    try { return JSON.parse(window.sessionStorage.getItem(UP_KEY)) || []; } catch (e) { return []; }
  }
  function writeUploads() {
    try { window.sessionStorage.setItem(UP_KEY, JSON.stringify(uploads)); } catch (e) { console.info('[fitting] session storage unavailable:', e && e.name); }
  }
  const refOf = (u) => 'up:' + u.id;
  const isUpRef = (ref) => typeof ref === 'string' && ref.startsWith('up:');
  const upOf = (ref) => (isUpRef(ref) ? uploads.find((u) => refOf(u) === ref) || null : null);
  /** outfit entries whose upload ended with an earlier session are dropped */
  function pruneOutfit() {
    const o = VT.store.get().fit.outfit;
    const stale = Object.keys(o).filter((k) => isUpRef(o[k]) && !upOf(o[k]));
    if (stale.length) VT.store.update((s) => { stale.forEach((k) => { delete s.fit.outfit[k]; }); });
  }
  /** uploads the avatar is trying on, newest first */
  function wornUploads(s) {
    const refs = new Set(Object.values(s.fit.outfit));
    return uploads.filter((u) => refs.has(refOf(u)));
  }
  /** the active avatar's wardrobe entry saved from this upload, if any */
  const savedFrom = (s, u) => s.wardrobe.find((w) => w.fromUpload === u.id) || null;
  VT.store.subscribe((s, meta) => {
    if (meta && meta.reset) { uploads = []; railSrc = 'rec'; writeUploads(); }
  });

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

  function srcTabs() {
    return [['rec', '推荐'], ['mine', '我的上传']].map(([id, label]) => {
      const on = railSrc === id;
      return `<button type="button" role="tab" class="fit-src-tab ${on ? 'is-on' : ''}" data-act="src" data-src="${id}" aria-selected="${on}">${label}</button>`;
    }).join('');
  }

  /** 推荐: the category's whole try-on list, garments with an on-body image first */
  function recItems(catId) {
    const all = D().fitCatsAll.find((c) => c.id === catId) || D().fitCatsAll[0];
    const ready = (D().fitCats.find((c) => c.id === catId) || { items: [] }).items;
    return ready.concat(all.items.filter((pid) => !ready.includes(pid)));
  }

  function rail(s) {
    const sel = new Set(Object.values(s.fit.outfit).filter(Boolean));
    if (railSrc === 'mine') {
      const label = (D().fitCats.find((c) => c.id === s.fit.cat) || D().fitCats[0]).label;
      const mine = uploads.filter((u) => u.cat === s.fit.cat);
      const add = `<li><button type="button" class="fit-thumb fit-thumb--add" data-act="shoot-menu" aria-label="上传${label}照片">${I('camera', { size: 22, stroke: 1.5 })}</button></li>`;
      return add + (mine.length ? mine.map((u) => {
        const on = sel.has(refOf(u));
        return `<li><button type="button" class="fit-thumb ${on ? 'is-on' : ''}" data-act="pick-up" data-up="${u.id}" aria-pressed="${on}" aria-label="${on ? '取消试穿' : '试穿'}${esc(u.name)}（临时上传）">${VT.ui.img(u.src, '', 'fit-thumb-img')}</button></li>`;
      }).join('') : `<li class="fit-rail-note">还没有上传的${label}</li>`);
    }
    return recItems(s.fit.cat).map((pid) => {
      const p = D().byId[pid];
      const on = sel.has(pid);
      return `<li><button type="button" class="fit-thumb ${on ? 'is-on' : ''}" data-act="pick" data-pid="${pid}" aria-pressed="${on}" aria-label="${on ? '取消试穿' : '试穿'}${p.name}">
        ${VT.ui.img(p.img.thumb || p.img.tile, '', 'fit-thumb-img')}</button></li>`;
    }).join('');
  }

  /** 临时试穿: the newest upload being tried on, with 加入衣橱 */
  function dock(s) {
    const u = wornUploads(s)[0];
    const temp = u ? `
      <div class="fit-temp" role="group" aria-label="临时试穿">
        <div class="fit-temp-top">${VT.ui.img(u.src, '', 'fit-temp-img')}<b class="fit-temp-t">临时试穿</b></div>
        <p class="fit-temp-note">演示版暂无上身图</p>
        ${savedFrom(s, u)
          ? `<button type="button" class="fit-temp-btn is-done" disabled>${I('check', { size: 14, stroke: 2.4 })}已在衣橱</button>`
          : `<button type="button" class="fit-temp-btn" data-act="keep" data-up="${u.id}" aria-label="将${esc(u.name)}加入衣橱">${I('plus', { size: 14, stroke: 2.2 })}加入衣橱</button>`}
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
    render(app) {
      pruneOutfit();
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
          <div class="fit-src" role="tablist" aria-label="单品来源">${srcTabs()}</div>
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
      src(app, el) {
        railSrc = el.dataset.src === 'mine' ? 'mine' : 'rec';
        update(app, { top: true });
        const tab = app.screenEl().querySelector(`.fit-src-tab[data-src="${railSrc}"]`);
        if (tab) tab.focus({ preventScroll: true });
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
      /** try an upload on, or take it off; it is never drawn onto the avatar */
      'pick-up'(app, el) {
        const u = uploads.find((x) => x.id === el.dataset.up);
        if (!u) return;
        const slot = CAT_SLOT[u.cat], ref = refOf(u);
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
      /** 加入衣橱: the only way an upload reaches the active avatar's wardrobe */
      keep(app, el) {
        const u = uploads.find((x) => x.id === el.dataset.up);
        if (!u || savedFrom(app.s, u)) return;
        VT.store.update((s) => {
          s.wardrobe.unshift({ uid: VT.store.uid('w'), custom: { src: u.src, name: u.name, cat: CAT_SLOT[u.cat] }, fav: false, source: 'uploaded', addedAt: Date.now(), fromUpload: u.id });
          s.wardrobeCat = 'all';
        });
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
    root.querySelector('.fit-src').innerHTML = srcTabs();
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

  function swapRender(app, render) {
    const box = app.screenEl().querySelector('.fit-avatar');
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
      img.classList.add('is-cur');
      img.classList.remove('is-next');
      if (cur) { cur.classList.remove('is-cur'); cur.classList.add('is-out'); app.later(() => cur.remove(), 450); }
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

  /** a confirmed photo joins 我的上传 (this session only) and goes on at once */
  function addUpload(app, o) {
    const u = { id: VT.store.uid('u'), src: o.src, name: o.name, cat: o.cat, at: Date.now() };
    uploads.unshift(u);
    writeUploads();
    railSrc = 'mine';
    VT.store.update((s) => { s.fit.cat = u.cat; wear(s.fit.outfit, CAT_SLOT[u.cat], refOf(u)); });
    update(app, { top: true });
    refocus(app, `.fit-thumb[data-up="${u.id}"]`);
    swapRender(app, pickRender(app.s.fit.outfit).render);
    app.toast(`演示版暂无「${u.name}」的上身图，已加入临时试穿`, { ms: 2800 });
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

  VT.fitting = {
    pickRender,
    /** other screens that send garments here (VT.tryOn) show them under 推荐 */
    showRecommended() { railSrc = 'rec'; },
  };
})();
