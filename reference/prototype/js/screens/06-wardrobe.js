/* 个人衣橱 — My Wardrobe (primary tab 3)
   A row of portraits switches whose wardrobe this is (切换角色, shared with 首页: every
   person has their own garments, 搭配集 and 穿搭瞬间). Under it, 衣服 | 搭配集 | 穿搭瞬间:
   - 衣服: the 3-column grid with category filters, search, hearts, the try-on queue,
     a tap opens the item sheet, a long-press the action menu.
   - 搭配集: outfit collections (cover, name, count) → 搭配集详情 (screen `outfit`).
   - 穿搭瞬间: a private 2-column gallery of saved looks → screen `moment`. 首页's
     保存造型 adds the current try-on (VT.wardrobe.saveLook). */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  const A = () => VT.store.avatars;
  const esc = (x) => VT.esc(x);
  let searchOpen = false;
  let query = '';
  const viewScroll = {}; // each view's scroll position while the tab stays open

  const SRC_LABEL = { collected: '已收藏', purchased: '已购买', uploaded: '我上传的' };
  const VIEWS = [['clothes', '衣服'], ['sets', '搭配集'], ['moments', '穿搭瞬间']];
  /* 首页 切换场景 backdrops (mid-plate tones), behind a saved try-on */
  const SCENE_BG = { taupe: '#D0C0B0', cream: '#E8DED4', oat: '#E5D4C1', cocoa: '#5A4C3D' };
  const LONG_PRESS_MS = 480;

  /* ---------- data helpers ---------- */
  function itemOf(w) {
    if (w.custom) return { id: w.uid, name: w.custom.name, cat: w.custom.cat, img: { tile: w.custom.src }, custom: true };
    return D().byId[w.p];
  }
  /** the grid photo: the asset kit's square shot where there is one */
  const tileSrc = (w, p) => (w.custom ? w.custom.src : p.img.square || p.img.tile);
  const viewOf = (s) => (VIEWS.some(([id]) => id === s.wardrobeView) ? s.wardrobeView : 'clothes');
  const entry = (s, uid) => s.wardrobe.find((w) => w.uid === uid);
  const sets = (s) => s.collections || [];
  const setById = (s, id) => sets(s).find((c) => c.id === id);
  const setItems = (s, c) => c.items.map((u) => entry(s, u)).filter(Boolean);
  const momentsOf = (s) => (s.moments || []).slice().sort((a, b) => b.at - a.at);
  const momentById = (s, id) => (s.moments || []).find((m) => m.id === id);
  function md(ts) { const d = new Date(ts); return `${d.getMonth() + 1}月${d.getDate()}日`; }
  const whoName = (s) => A().nameOf(s, A().active(s));

  function visible(s) {
    const q = query.trim().toLowerCase();
    return s.wardrobe.filter((w) => {
      const p = itemOf(w);
      if (!p) return false;
      if (!D().inCat(p, s.wardrobeCat)) return false;
      if (q && !(p.name + (p.tags || '')).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  /* ---------- markup ---------- */
  /** 切换角色: portraits only (names are in the labels), the active one ringed */
  function people(s) {
    return `<div class="wr-people" data-keep-scroll="wr-people">
      <div class="wr-people-list" role="radiogroup" aria-label="切换角色">${A().list(s).map((rec) => {
        const on = rec.id === s.activeAvatar;
        const name = esc(A().nameOf(s, rec)) + (rec.self ? '（本人）' : '');
        return `<button type="button" class="wr-face ${on ? 'is-on' : ''}" role="radio" aria-checked="${on}" aria-label="${name}" title="${name}" data-act="who" data-id="${rec.id}">${VT.ui.img(A().portraitOf(s, rec), '', 'wr-face-img')}</button>`;
      }).join('')}</div>
      <button type="button" class="wr-face wr-face--add" data-act="who-new" aria-label="新建数字分身">${I('plus', { size: 21, stroke: 1.5 })}</button>
    </div>`;
  }

  function segs(view) {
    return `<div class="wr-segs" role="tablist" aria-label="衣橱内容" data-on="${view}">${VIEWS.map(([id, label]) => {
      const on = id === view;
      return `<button type="button" role="tab" class="wr-seg ${on ? 'is-on' : ''}" aria-selected="${on}" data-act="view" data-view="${id}" data-focus-key="wr-seg-${id}">${label}</button>`;
    }).join('')}</div>`;
  }

  function viewBlock(s, v) {
    const label = VIEWS.find(([id]) => id === v)[1];
    const inner = v === 'sets' ? setsView(s) : v === 'moments' ? momentsView(s) : clothesView(s);
    return `<div class="wr-view ${v === 'clothes' && s.tryQueue.length ? 'has-queue' : ''}" data-view="${v}" role="tabpanel" aria-label="${label}">${inner}</div>`;
  }

  function emptyState(icon, title, sub, btn, act) {
    return `<div class="wr-empty">${I(icon, { size: 34, stroke: 1.3 })}<p>${title}</p>${sub ? `<p class="wr-empty-sub">${sub}</p>` : ''}${btn ? `<button type="button" class="btn btn--ghost btn--sm" data-act="${act}">${btn}</button>` : ''}</div>`;
  }

  /* 衣服 */
  function clothesView(s) {
    return `${searchOpen ? `<div class="wr-searchbar"><label>${I('search', { size: 17 })}<input type="search" placeholder="搜索衣橱里的单品" value="${esc(query)}" data-input="q" data-focus-key="wr-q" aria-label="搜索衣橱" enterkeyhint="search"></label></div>` : ''}
      <div class="wr-tabs" role="tablist" aria-label="衣橱分类" data-keep-scroll="wr-tabs">
        ${D().wardrobeCats.map((c) => `<button type="button" role="tab" class="wr-tab ${c.id === s.wardrobeCat ? 'is-on' : ''}" aria-selected="${c.id === s.wardrobeCat}" data-act="cat" data-cat="${c.id}">${c.label}</button>`).join('')}
      </div>
      <div class="scroll wr-scroll" data-keep-scroll="wr-clothes">${grid(s)}</div>`;
  }

  function grid(s) {
    const items = visible(s);
    if (!items.length) return emptyState('hanger', query ? '没有找到匹配的单品' : '这个分类还没有衣服', '', '添加衣物', 'add-open');
    return `<ul class="wr-grid">${items.map((w) => {
      const p = itemOf(w);
      const fav = !!w.fav;
      const pending = s.tryQueue.includes(w.uid);
      return `<li class="wr-tile ${pending ? 'is-picked' : ''}">
        <button type="button" class="wr-open" data-act="item" data-uid="${w.uid}" aria-haspopup="dialog" aria-label="${esc(p.name)}${SRC_LABEL[w.source] ? '，' + SRC_LABEL[w.source] : ''}">${VT.ui.img(tileSrc(w, p), '', w.custom ? 'is-custom' : '', 'loading="lazy"')}</button>
        <button type="button" class="heart-btn wr-heart ${fav ? 'is-on' : ''}" data-act="fav-item" data-uid="${w.uid}" aria-pressed="${fav}" aria-label="${fav ? '取消喜欢' : '标记喜欢'}：${esc(p.name)}">${I(fav ? 'heart-filled' : 'heart', { size: 21, stroke: 1.6 })}</button>
        ${SRC_LABEL[w.source] ? `<span class="wr-src">${SRC_LABEL[w.source]}</span>` : ''}
        ${pending ? `<span class="wr-pick" aria-hidden="true">${I('check', { size: 12, stroke: 3 })}</span>` : ''}
      </li>`;
    }).join('')}</ul>`;
  }

  function queueBar(s) {
    const n = s.tryQueue.length;
    return n ? `<div class="wr-queue"><span>已选 ${n} 件</span><button type="button" class="wr-queue-clear" data-act="queue-clear">清空</button><button type="button" class="btn btn--dark btn--sm" data-act="queue-go">去试衣间${I('arrow-right', { size: 16, stroke: 1.8 })}</button></div>` : '';
  }

  /* 搭配集 */
  function setsView(s) {
    const list = sets(s);
    const bar = `<div class="wr-bar"><span>${list.length ? `${list.length} 个搭配集` : ''}</span><button type="button" class="wr-bar-btn" data-act="set-new">${I('plus', { size: 15, stroke: 2 })}新建搭配集</button></div>`;
    const body = list.length
      ? `<ul class="wr-sets">${list.map((c) => setCard(s, c)).join('')}</ul>`
      : emptyState('hanger', '还没有搭配集', '把喜欢的单品组合成一套 Look，随时一键试穿', '新建搭配集', 'set-new');
    return `${bar}<div class="scroll wr-scroll" data-keep-scroll="wr-sets">${body}</div>`;
  }

  function setCard(s, c) {
    const n = setItems(s, c).length;
    return `<li class="wr-set">
      <button type="button" class="wr-set-open" data-act="set-open" data-id="${c.id}" aria-label="${esc(c.name)}，${n} 件单品">${cover(s, c)}<span class="wr-set-meta"><span class="wr-set-name">${esc(c.name)}</span><span class="wr-set-n">${n} 件单品</span></span></button>
      <button type="button" class="icon-btn wr-set-more" data-act="set-more" data-id="${c.id}" aria-haspopup="dialog" aria-label="更多操作：${esc(c.name)}">${I('more', { size: 20 })}</button>
    </li>`;
  }

  /** the kit's editorial cover, else a collage of the first four garments */
  function cover(s, c, cls) {
    if (c.cover) return `<span class="wr-cover ${cls || ''}">${VT.ui.img(c.cover, '', 'wr-cover-img', 'loading="lazy"')}</span>`;
    const items = setItems(s, c).slice(0, 4);
    if (!items.length) return `<span class="wr-cover wr-cover--empty ${cls || ''}">${I('hanger', { size: 28, stroke: 1.3 })}</span>`;
    return `<span class="wr-cover wr-cover--grid n${items.length} ${cls || ''}">${items.map((w) => `<span class="wr-cover-cell">${VT.ui.img(tileSrc(w, itemOf(w)), '', '', 'loading="lazy"')}</span>`).join('')}</span>`;
  }

  /* 穿搭瞬间 */
  function momentsView(s) {
    const list = momentsOf(s);
    const bar = `<div class="wr-bar"><span class="wr-private">${I('lock', { size: 14, stroke: 1.8 })}仅自己可见</span><span>${list.length ? `${list.length} 张` : ''}</span></div>`;
    const body = list.length
      ? `<ul class="wr-moments">${list.map(momentCard).join('')}</ul>`
      : emptyState('image', '还没有穿搭瞬间', '在首页试穿后点「保存造型」，造型会保存在这里', '去试衣间', 'to-fitting');
    return `${bar}<div class="scroll wr-scroll" data-keep-scroll="wr-moments">${body}</div>`;
  }

  function momentCard(m) {
    return `<li class="wr-moment">
      <button type="button" class="wr-moment-open" data-act="moment-open" data-id="${m.id}" aria-label="${md(m.at)}的穿搭瞬间">${photo(m)}</button>
      ${momentHeart(m)}
      <span class="wr-moment-date">${md(m.at)}</span>
    </li>`;
  }
  function momentHeart(m) {
    const on = !!m.fav;
    return `<button type="button" class="heart-btn wr-moment-heart ${on ? 'is-on' : ''}" data-act="moment-fav" data-id="${m.id}" aria-pressed="${on}" aria-label="${on ? '取消喜欢' : '标记喜欢'}：${md(m.at)}的穿搭">${I(on ? 'heart-filled' : 'heart', { size: 20, stroke: 1.7 })}</button>`;
  }
  /** a saved photo, or a 首页 render on its scene's backdrop */
  function photo(m, cls) {
    return m.scene
      ? `<span class="wr-photo wr-photo--render ${cls || ''}" style="background:${SCENE_BG[m.scene] || SCENE_BG.taupe}">${VT.ui.img(m.src, '', '', 'loading="lazy"')}</span>`
      : `<span class="wr-photo ${cls || ''}">${VT.ui.img(m.src, '', '', 'loading="lazy"')}</span>`;
  }

  /** a row in the action menus; icon 'plus-ring' is the circled ＋ of the header */
  function menuRow(icon, label, act, cls, role) {
    const ic = icon === 'plus-ring' ? `<span class="wr-ring-plus">${I('plus', { size: 12, stroke: 2.2 })}</span>` : I(icon, { size: 20, stroke: 1.6 });
    return `<button type="button" class="wr-menu-row ${cls || ''}" ${role ? `role="${role}"` : ''} data-act="${act}">${ic}<span>${label}</span></button>`;
  }

  /* ---------- in-place updates (keep the header and the portrait row) ---------- */
  /** redraw the content under the toggle and the queue bar */
  function renderView(app, o) {
    const root = app.screenEl();
    if (!root || root.dataset.screen !== 'wardrobe') return;
    const s = app.s;
    const v = viewOf(s);
    const tmp = document.createElement('div');
    tmp.innerHTML = viewBlock(s, v);
    const next = tmp.firstElementChild;
    root.querySelector('.wr-view').replaceWith(next);
    const q = root.querySelector('.wr-queue');
    if (q) q.remove();
    if (v === 'clothes' && s.tryQueue.length) root.querySelector('.tabbar').insertAdjacentHTML('beforebegin', queueBar(s));
    const sc = next.querySelector('.wr-scroll');
    if (sc) sc.scrollTop = o && o.top ? 0 : viewScroll[v] || 0;
    if (o && o.anim && !VT.reducedMotion()) {
      if (o.dir) next.style.setProperty('--wr-dir', o.dir);
      next.classList.add(o.anim === 'slide' ? 'is-sliding' : 'is-fading');
    }
  }

  function popHeart(el, on, size) {
    el.classList.toggle('is-on', on);
    el.setAttribute('aria-pressed', on);
    el.setAttribute('aria-label', el.getAttribute('aria-label').replace(/^(取消喜欢|标记喜欢)/, on ? '取消喜欢' : '标记喜欢'));
    el.innerHTML = I(on ? 'heart-filled' : 'heart', { size, stroke: el.classList.contains('wr-moment-heart') ? 1.7 : 1.6 });
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  /* ---------- shared operations ---------- */
  /** 立即试穿 / 去试衣间 / 一键试穿这套: catalog garments go on the active avatar on 首页; uploads can't be worn yet */
  function tryItems(app, list, emptyMsg) {
    const pids = list.filter((w) => w && !w.custom).map((w) => w.p);
    if (!pids.length) { app.toast(emptyMsg || '演示版暂不支持上传衣物的上身效果'); return false; }
    VT.tryOn(app, pids);
    return true;
  }

  async function removeItem(app, w, ov) {
    const ok = await app.dialog({ title: '删除这件单品？', text: `「${itemOf(w).name}」将从衣橱和搭配集中移除。`, ok: '删除' });
    if (!ok) return;
    VT.store.update((st) => {
      st.wardrobe = st.wardrobe.filter((x) => x.uid !== w.uid);
      st.tryQueue = st.tryQueue.filter((u) => u !== w.uid);
      sets(st).forEach((c) => { c.items = c.items.filter((u) => u !== w.uid); });
    });
    if (ov) app.closeOverlay(ov);
    app.refresh();
    app.toast('已删除');
  }

  /** shared only on an explicit tap: the native share sheet, else the clipboard */
  async function shareText(app, title, text) {
    if (navigator.share && !VT.framed) {
      try { await navigator.share({ title, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); app.toast('已复制，可粘贴分享'); }
    catch (e) { app.toast('分享面板在此浏览器不可用'); }
  }

  function createSet(name, items) {
    const id = VT.store.uid('set');
    VT.store.update((st) => { st.collections = sets(st); st.collections.unshift({ id, name, cover: null, createdAt: Date.now(), items: items || [] }); });
    return id;
  }

  /* ---------- overlays ---------- */
  /** tap on a garment: a large photo and every action (also the keyboard route to the long-press menu) */
  function itemSheet(app, uid, o) {
    const s = app.s;
    const w = entry(s, uid);
    if (!w) return;
    const p = itemOf(w);
    const color = !w.custom && w.color ? (p.colors.find((c) => c.id === w.color) || {}).name : null;
    const queued = s.tryQueue.includes(w.uid);
    const inSet = o && o.set ? setById(s, o.set) : null;
    const ov = app.sheet({
      title: p.name, cls: 'ov--wr-item',
      html: `<div class="wr-sheet-img">${VT.ui.img(w.custom ? p.img.tile : (p.img.hd || p.img.tile), p.name)}</div>
        <p class="wr-sheet-meta">${[SRC_LABEL[w.source] || '我的衣物', color, w.size].filter(Boolean).join(' · ')}</p>
        <div class="wr-menu wr-menu--sheet">
          ${menuRow('hanger', '立即试穿', 'try')}
          ${menuRow('plus-ring', '加入搭配集', 'sets')}
          ${inSet ? menuRow('minus', `从「${esc(inSet.name)}」移出`, 'unset') : ''}
          ${menuRow(queued ? 'check' : 'tshirt', queued ? '移出试衣搭配' : '加入试衣搭配', 'queue')}
          ${w.custom ? '' : menuRow('bag', '查看商品详情', 'detail')}
          ${menuRow('share', '分享', 'share')}
          ${menuRow('trash', '删除', 'remove', 'is-danger')}
        </div>
        ${w.custom ? '<p class="sheet-note">自己上传的衣物暂不支持上身试穿（演示版）</p>' : ''}`,
      actions: {
        try: () => {
          if (w.custom) { app.toast('演示版暂不支持上传衣物的上身效果'); return; }
          app.closeOverlay(ov, true);
          tryItems(app, [w]);
        },
        sets: () => { app.closeOverlay(ov, true); addToSetSheet(app, w.uid); },
        unset: () => {
          VT.store.update((st) => { const c = setById(st, inSet.id); if (c) c.items = c.items.filter((u) => u !== w.uid); });
          app.closeOverlay(ov);
          app.refresh();
          app.toast(`已从「${inSet.name}」移出`);
        },
        queue: () => {
          VT.store.update((st) => {
            const i = st.tryQueue.indexOf(w.uid);
            if (i >= 0) st.tryQueue.splice(i, 1); else st.tryQueue.push(w.uid);
          });
          app.closeOverlay(ov);
          app.refresh();
          app.toast(queued ? '已移出试衣搭配' : '已加入试衣搭配');
        },
        detail: () => app.go('product', { pid: p.id }),
        share: () => shareText(app, p.name, `「${p.name}」— 来自我的个人衣橱`),
        remove: () => removeItem(app, w, ov),
      },
    });
  }

  /** long-press on a garment: lifted photo + 立即试穿 · 加入搭配集 · 分享 · 删除 */
  function pressMenu(app, uid) {
    const s = app.s;
    const w = entry(s, uid);
    if (!w || app.overlayEl.querySelector('.ov--wr-ctx')) return;
    const p = itemOf(w);
    const ov = app.layer({
      cls: 'ov--wr-ctx', label: p.name,
      html: `<div class="ov-scrim" data-act="ov-close"></div>
        <div class="wr-ctx">
          <div class="wr-ctx-card">${VT.ui.img(tileSrc(w, p), p.name)}
            <button type="button" class="heart-btn wr-ctx-heart ${w.fav ? 'is-on' : ''}" data-act="ctx-fav" aria-pressed="${!!w.fav}" aria-label="${w.fav ? '取消喜欢' : '标记喜欢'}：${esc(p.name)}">${I(w.fav ? 'heart-filled' : 'heart', { size: 22, stroke: 1.6 })}</button>
          </div>
          <div class="wr-menu wr-ctx-menu" role="menu" aria-label="${esc(p.name)}">
            ${menuRow('hanger', '立即试穿', 'ctx-try', '', 'menuitem')}
            ${menuRow('plus-ring', '加入搭配集', 'ctx-set', '', 'menuitem')}
            ${menuRow('share', '分享', 'ctx-share', '', 'menuitem')}
            ${menuRow('trash', '删除', 'ctx-del', 'is-danger', 'menuitem')}
          </div>
        </div>`,
      actions: {
        'ctx-fav': (el) => {
          let on = false;
          VT.store.update((st) => { const x = entry(st, uid); if (x) { x.fav = !x.fav; on = x.fav; } });
          popHeart(el, on, 22);
          const tile = app.screenEl().querySelector(`.wr-heart[data-uid="${uid}"]`);
          if (tile) popHeart(tile, on, 21);
        },
        'ctx-try': () => { app.closeOverlay(ov, true); tryItems(app, [w]); },
        'ctx-set': () => { app.closeOverlay(ov, true); addToSetSheet(app, uid); },
        'ctx-share': () => { app.closeOverlay(ov); shareText(app, p.name, `「${p.name}」— 来自我的个人衣橱`); },
        'ctx-del': () => { app.closeOverlay(ov, true); removeItem(app, w); },
      },
    });
    const items = [...ov.querySelectorAll('[role="menuitem"]')];
    ov.querySelector('.wr-ctx-menu').addEventListener('keydown', (ev) => {
      const i = items.indexOf(document.activeElement);
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        items[(i + (ev.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
      }
    });
    app.later(() => items[0].focus({ preventScroll: true }), 60);
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* not allowed */ } }
  }

  /* The menu opens under the finger, so the click that ends a long-press would land on the tile
     (item sheet) or on the menu's scrim (closing it). Swallow that one click, app-wide. */
  const press = { armed: false, upAt: 0 };
  function guardClicks(root) {
    if (root._wrGuard) return;
    root._wrGuard = true;
    root.addEventListener('pointerdown', () => { press.armed = false; press.upAt = 0; }, true);
    root.addEventListener('pointerup', () => { if (press.armed) { press.armed = false; press.upAt = Date.now(); } }, true);
    root.addEventListener('click', (ev) => {
      if (press.upAt && Date.now() - press.upAt < 600) { ev.stopPropagation(); ev.preventDefault(); }
      press.upAt = 0;
    }, true);
  }

  /** press-and-hold on a grid tile (touch or mouse), right-click, or the context-menu key */
  function bindLongPress(app, el) {
    guardClicks(app.root);
    if (el._wrPress) return;
    el._wrPress = true;
    let timer = null, start = null, held = null;
    const stop = () => {
      clearTimeout(timer); timer = null;
      if (held) held.classList.remove('is-pressing');
      held = null;
    };
    el.addEventListener('pointerdown', (ev) => {
      const t = ev.target.closest('.wr-open');
      if (!t || ev.button > 0) return;
      held = t; start = [ev.clientX, ev.clientY];
      t.classList.add('is-pressing');
      timer = setTimeout(() => { const uid = held && held.dataset.uid; stop(); press.armed = true; if (uid) pressMenu(app, uid); }, LONG_PRESS_MS);
    });
    el.addEventListener('pointermove', (ev) => {
      if (timer && Math.hypot(ev.clientX - start[0], ev.clientY - start[1]) > 10) stop();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => el.addEventListener(n, () => { if (timer) stop(); }));
    el.addEventListener('contextmenu', (ev) => {
      const t = ev.target.closest('.wr-open');
      if (!t) return;
      ev.preventDefault();
      const holding = !!timer; // Android sends contextmenu while the finger is still down
      stop();
      if (holding) press.armed = true;
      pressMenu(app, t.dataset.uid);
    });
  }

  /** 加入搭配集: tick one of the active person's collections, or start a new one */
  function addToSetSheet(app, uid) {
    const s = app.s;
    if (!entry(s, uid)) return;
    const list = sets(s);
    const ov = app.sheet({
      title: '加入搭配集', cls: 'ov--wr-sets',
      html: `${list.length ? `<div class="wr-set-rows">${list.map((c) => {
        const on = c.items.includes(uid);
        return `<button type="button" class="wr-set-row ${on ? 'is-on' : ''}" role="checkbox" aria-checked="${on}" data-act="toggle" data-id="${c.id}">${cover(s, c, 'wr-cover--mini')}<span class="wr-set-row-main"><span class="wr-set-name">${esc(c.name)}</span><span class="wr-set-n">${setItems(s, c).length} 件单品</span></span><span class="wr-set-tick" aria-hidden="true">${I('check', { size: 14, stroke: 2.6 })}</span></button>`;
      }).join('')}</div>` : ''}
        <button type="button" class="btn btn--ghost btn--lg btn--block wr-set-add" data-act="new">${I('plus', { size: 18, stroke: 1.9 })}新建搭配集</button>`,
      actions: {
        toggle: (el) => {
          let added = false, name = '';
          VT.store.update((st) => {
            const c = setById(st, el.dataset.id);
            if (!c) return;
            name = c.name;
            const i = c.items.indexOf(uid);
            if (i >= 0) c.items.splice(i, 1); else { c.items.push(uid); added = true; }
          });
          app.closeOverlay(ov);
          app.refresh();
          app.toast(added ? `已加入「${name}」` : `已从「${name}」移出`, added ? { icon: 'check' } : undefined);
        },
        new: () => {
          app.closeOverlay(ov, true);
          nameSheet(app, { title: '新建搭配集', ok: '创建并加入', onOk: (name) => { createSet(name, [uid]); app.refresh(); app.toast(`已加入「${name}」`, { icon: 'check' }); } });
        },
      },
    });
  }

  function nameSheet(app, o) {
    const ov = app.sheet({
      title: o.title,
      html: `<label class="field"><span class="field-label">名称</span><span class="field-row"><input type="text" maxlength="12" class="js-set-name" value="${esc(o.value || '')}" placeholder="例如：周末出游" aria-label="搭配集名称" data-enter="ok" data-autofocus></span></label>
        <button type="button" class="btn btn--dark btn--lg btn--block" data-act="ok">${o.ok}</button>`,
      actions: {
        ok: () => {
          const name = ov.querySelector('.js-set-name').value.trim();
          if (!name) { app.toast('请填写名称'); return; }
          app.closeOverlay(ov, true);
          o.onOk(name);
        },
      },
    });
  }

  /** ⋯ on a collection: 重命名 · 编辑单品 · 分享 · 删除搭配集 */
  function setMenu(app, id, inDetail) {
    const c = setById(app.s, id);
    if (!c) return;
    const ov = app.sheet({
      title: c.name, cls: 'ov--wr-menu',
      html: `<div class="wr-menu wr-menu--sheet">
          ${menuRow('edit', '重命名', 'm-rename')}
          ${menuRow('hanger', '编辑单品', 'm-edit')}
          ${menuRow('share', '分享', 'm-share')}
          ${menuRow('trash', '删除搭配集', 'm-del', 'is-danger')}
        </div>`,
      actions: {
        'm-rename': () => {
          app.closeOverlay(ov, true);
          nameSheet(app, { title: '重命名', value: c.name, ok: '保存', onOk: (name) => {
            VT.store.update((st) => { const x = setById(st, id); if (x) x.name = name; });
            app.refresh();
            app.toast('已重命名');
          } });
        },
        'm-edit': () => { app.closeOverlay(ov, true); pickSheet(app, id); },
        'm-share': () => {
          app.closeOverlay(ov);
          shareText(app, c.name, `我的搭配集「${c.name}」：${setItems(app.s, c).map((w) => itemOf(w).name).join('、')}`);
        },
        'm-del': async () => {
          app.closeOverlay(ov, true);
          const ok = await app.dialog({ title: `删除「${c.name}」？`, text: '搭配集里的单品仍会保留在衣橱中。', ok: '删除' });
          if (!ok) return;
          VT.store.update((st) => { st.collections = sets(st).filter((x) => x.id !== id); });
          if (inDetail) app.back(); else app.refresh();
          app.toast('已删除搭配集');
        },
      },
    });
  }

  /** 编辑单品: tick garments of the active person's wardrobe in or out of a collection */
  function pickSheet(app, id) {
    const s = app.s;
    const c = setById(s, id);
    if (!c) return;
    const chosen = new Set(c.items);
    const tiles = s.wardrobe.map((w) => {
      const p = itemOf(w);
      const on = chosen.has(w.uid);
      return `<li><button type="button" class="wr-pick-tile ${on ? 'is-on' : ''}" role="checkbox" aria-checked="${on}" aria-label="${esc(p.name)}" data-act="pick" data-uid="${w.uid}">${VT.ui.img(tileSrc(w, p), '', '', 'loading="lazy"')}<span class="wr-pick-tick" aria-hidden="true">${I('check', { size: 12, stroke: 3 })}</span></button></li>`;
    }).join('');
    const ov = app.sheet({
      title: '编辑单品', cls: 'ov--wr-pick', full: s.wardrobe.length > 8,
      html: s.wardrobe.length
        ? `<p class="sheet-lead">从「${esc(whoName(s))}」的衣橱里挑选单品，组成「${esc(c.name)}」。</p><ul class="wr-pick-grid">${tiles}</ul>
          <div class="wr-pick-foot"><button type="button" class="btn btn--dark btn--lg btn--block" data-act="done">完成 · 已选 <span class="js-n">${chosen.size}</span> 件</button></div>`
        : `<p class="sheet-lead">衣橱里还没有单品，先添加几件吧。</p><button type="button" class="btn btn--dark btn--lg btn--block" data-act="add">添加衣物</button>`,
      actions: {
        pick: (el) => {
          const u = el.dataset.uid;
          const on = !chosen.has(u);
          if (on) chosen.add(u); else chosen.delete(u);
          el.classList.toggle('is-on', on);
          el.setAttribute('aria-checked', on);
          ov.querySelector('.js-n').textContent = chosen.size;
        },
        done: () => {
          VT.store.update((st) => {
            const x = setById(st, id);
            if (x) x.items = x.items.filter((u) => chosen.has(u)).concat([...chosen].filter((u) => !x.items.includes(u)));
          });
          app.closeOverlay(ov);
          app.refresh();
          app.toast('已更新搭配集');
        },
        add: () => { app.closeOverlay(ov, true); addClothes(app); },
      },
    });
  }

  /** 添加衣物: a photo of the user's own garment */
  function addClothes(app) {
    const cats = [['top', '上衣'], ['bottom', '下装'], ['outer', '外套'], ['dress', '连衣裙'], ['shoes', '鞋子'], ['bag', '包包'], ['acc', '配饰']];
    let picked = null;
    let cat = 'top';
    const ov = app.sheet({
      title: '添加衣物',
      html: `<p class="sheet-lead">拍下或选择一张衣物照片，保存到你的个人衣橱。</p>
        <label class="wr-drop" tabindex="0">
          <input class="sr-only" type="file" accept="image/*" data-change="file">
          <span class="wr-drop-in">${I('upload', { size: 26, stroke: 1.5 })}<b>选择照片</b><em>支持 JPG / PNG，建议纯色背景平铺拍摄</em></span>
        </label>
        <div class="wr-add-form" hidden>
          <label class="field"><span class="field-label">名称</span><span class="field-row"><input type="text" maxlength="16" placeholder="例如：米白针织开衫" class="js-name" aria-label="衣物名称"></span></label>
          <span class="field-label">分类</span>
          <div class="wr-cats">${cats.map(([id, l]) => `<button type="button" class="chip ${id === cat ? 'is-on' : ''}" data-act="cat" data-cat="${id}">${l}</button>`).join('')}</div>
          <button type="button" class="btn btn--dark btn--lg btn--block" data-act="save">保存到衣橱</button>
        </div>
        <div class="wr-or"><span>或</span></div>
        <button type="button" class="btn btn--ghost btn--lg btn--block" data-act="shop">${I('bag', { size: 20 })}从购物广场挑选</button>`,
      actions: {
        file: async (el) => {
          const f = el.files && el.files[0];
          if (!f) return;
          if (!f.type.startsWith('image/')) { app.toast('请选择图片文件'); return; }
          try {
            picked = await downscale(f);
            const drop = ov.querySelector('.wr-drop');
            drop.classList.add('has-img');
            drop.querySelector('.wr-drop-in').innerHTML = `<img src="${picked.src}" alt="待添加的衣物照片预览"><span class="wr-drop-ok">${I('check', { size: 12, stroke: 3 })}已选择：${esc(f.name.slice(0, 18))}</span>`;
            ov.querySelector('.wr-add-form').hidden = false;
            const nm = ov.querySelector('.js-name');
            nm.value = f.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 16) || '我的衣物';
          } catch (e) { app.toast('无法读取这张图片，请换一张'); }
        },
        cat: (el) => {
          cat = el.dataset.cat;
          ov.querySelectorAll('.wr-cats .chip').forEach((c) => c.classList.toggle('is-on', c.dataset.cat === cat));
        },
        save: () => {
          if (!picked) return;
          const name = (ov.querySelector('.js-name').value || '我的衣物').trim();
          VT.store.update((s) => {
            s.wardrobe.unshift({ uid: VT.store.uid('w'), custom: { src: picked.src, name, cat }, fav: false, source: 'uploaded', addedAt: Date.now() });
            s.wardrobeCat = 'all';
            s.wardrobeView = 'clothes';
          });
          app.closeOverlay(ov);
          app.refresh();
          const sc = app.screenEl().querySelector('.wr-scroll');
          if (sc) sc.scrollTop = 0;
          app.toast('已添加到衣橱', { icon: 'check' });
        },
        shop: () => app.go('plaza'),
      },
    });
  }

  /** ⋯ on a 穿搭瞬间 */
  function momentMenu(app, id) {
    const m = momentById(app.s, id);
    if (!m) return;
    const ov = app.sheet({
      title: md(m.at), cls: 'ov--wr-menu',
      html: `<div class="wr-menu wr-menu--sheet">${menuRow('download', '保存图片', 'm-save')}${menuRow('share', '分享', 'm-share')}${menuRow('trash', '删除这张', 'm-del', 'is-danger')}</div>`,
      actions: {
        'm-save': () => { app.closeOverlay(ov); saveImage(app, m); },
        'm-share': () => { app.closeOverlay(ov); shareMoment(app, m); },
        'm-del': async () => {
          app.closeOverlay(ov, true);
          const ok = await app.dialog({ title: '删除这张穿搭瞬间？', text: '删除后无法恢复。', ok: '删除' });
          if (!ok) return;
          VT.store.update((st) => { st.moments = (st.moments || []).filter((x) => x.id !== id); });
          app.back();
          app.toast('已删除');
        },
      },
    });
  }

  /* ---------- 穿搭瞬间: files for 保存图片 / 分享 ---------- */
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('decode'));
      img.src = src;
    });
  }
  /** a saved photo as it is; a 首页 render composed onto its scene's backdrop (JPEG, 2:3) */
  async function momentFile(m) {
    const name = `穿搭瞬间-${md(m.at)}`;
    if (!m.scene) {
      const b = await (await fetch(m.src)).blob();
      return new File([b], name + (b.type === 'image/jpeg' ? '.jpg' : '.webp'), { type: b.type });
    }
    const img = await loadImage(m.src);
    const cv = document.createElement('canvas');
    cv.width = 800; cv.height = 1200;
    const g = cv.getContext('2d');
    g.fillStyle = SCENE_BG[m.scene] || SCENE_BG.taupe;
    g.fillRect(0, 0, cv.width, cv.height);
    const h = cv.height * 0.94, w = (h * img.naturalWidth) / img.naturalHeight;
    g.drawImage(img, (cv.width - w) / 2, cv.height - h, w, h);
    const b = await new Promise((resolve) => cv.toBlob(resolve, 'image/jpeg', 0.9));
    return new File([b], name + '.jpg', { type: 'image/jpeg' });
  }
  async function saveImage(app, m) {
    try {
      const f = await momentFile(m);
      const url = URL.createObjectURL(f);
      const a = document.createElement('a');
      a.href = url; a.download = f.name;
      document.body.appendChild(a); a.click(); a.remove();
      app.later(() => URL.revokeObjectURL(url), 4000);
      app.toast('图片已开始下载', { icon: 'download' });
    } catch (e) { app.toast('无法保存这张图片'); }
  }
  async function shareMoment(app, m) {
    const text = `我的穿搭瞬间 · ${md(m.at)}`;
    if (navigator.share && navigator.canShare && !VT.framed) {
      try {
        const f = await momentFile(m);
        if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: '穿搭瞬间', text }); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    shareText(app, '穿搭瞬间', text);
  }

  /* ---------- actions used on more than one screen ---------- */
  const shared = {
    'moment-fav'(app, el) {
      let on = false;
      VT.store.update((s) => { const m = momentById(s, el.dataset.id); if (m) { m.fav = !m.fav; on = m.fav; } });
      popHeart(el, on, 20);
    },
    'to-fitting'(app) { app.go('fitting'); },
  };

  /* ---------- 个人衣橱 (tab root) ---------- */
  VT.screens.wardrobe = {
    title: '个人衣橱',
    render(app) {
      const s = app.s;
      const view = viewOf(s);
      return `
        ${VT.ui.statusBar('dark')}
        <header class="wr-head">
          <h1 class="wr-title">个人衣橱</h1>
          ${VT.ui.iconBtn('search', '搜索衣橱', 'search-toggle', { size: 26, stroke: 1.7, cls: 'wr-search-btn', attrs: `aria-expanded="${searchOpen}"` })}
          <button type="button" class="icon-btn wr-add-btn" data-act="add-open" aria-label="添加衣物"><span class="wr-plus">${I('plus', { size: 17, stroke: 2 })}</span></button>
        </header>
        ${people(s)}
        ${segs(view)}
        ${viewBlock(s, view)}
        ${view === 'clothes' ? queueBar(s) : ''}
        ${VT.ui.tabBar('wardrobe')}`;
    },
    mount(app, el) {
      if (searchOpen) {
        const i = el.querySelector('.wr-searchbar input');
        if (i && document.activeElement !== i) i.focus({ preventScroll: true });
      }
      bindLongPress(app, el);
    },
    actions: Object.assign({
      /** 切换角色 here and on 首页 is one setting: the person whose wardrobe, 搭配集 and 穿搭瞬间 show */
      who(app, el) {
        const id = el.dataset.id;
        if (id === app.s.activeAvatar) return;
        A().switchTo(id);
        searchOpen = false; query = '';
        Object.keys(viewScroll).forEach((k) => { delete viewScroll[k]; });
        const root = app.screenEl();
        root.querySelectorAll('.wr-face[data-id]').forEach((b) => { const on = b.dataset.id === id; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); });
        root.querySelector('.wr-search-btn').setAttribute('aria-expanded', 'false');
        renderView(app, { anim: 'fade', top: true });
      },
      'who-new'(app) { VT.avatarUI.create(app); },
      view(app, el) {
        const v = el.dataset.view;
        const root = app.screenEl();
        const box = root.querySelector('.wr-view');
        const old = box.dataset.view;
        const sc = box.querySelector('.wr-scroll');
        if (v === old) { if (sc) sc.scrollTo({ top: 0, behavior: VT.reducedMotion() ? 'auto' : 'smooth' }); return; }
        if (sc) viewScroll[old] = sc.scrollTop;
        VT.store.update((s) => { s.wardrobeView = v; });
        const bar = root.querySelector('.wr-segs');
        bar.dataset.on = v;
        bar.querySelectorAll('.wr-seg').forEach((b) => { const on = b.dataset.view === v; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
        const at = (id) => VIEWS.findIndex(([x]) => x === id);
        renderView(app, { anim: 'slide', dir: at(v) > at(old) ? 1 : -1 });
      },
      cat(app, el) {
        VT.store.update((s) => { s.wardrobeCat = el.dataset.cat; });
        const root = app.screenEl();
        root.querySelectorAll('.wr-tab').forEach((t) => { const on = t.dataset.cat === el.dataset.cat; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); });
        const sc = root.querySelector('.wr-scroll');
        sc.innerHTML = grid(app.s);
        sc.scrollTop = 0;
      },
      'search-toggle'(app) {
        if (viewOf(app.s) !== 'clothes') {
          VT.store.update((s) => { s.wardrobeView = 'clothes'; });
          searchOpen = true;
        } else {
          searchOpen = !searchOpen;
        }
        if (!searchOpen) query = '';
        app.refresh();
      },
      q(app, el) {
        query = el.value;
        app.screenEl().querySelector('.wr-scroll').innerHTML = grid(app.s);
      },
      'fav-item'(app, el) {
        let on = false;
        VT.store.update((s) => { const w = entry(s, el.dataset.uid); if (w) { w.fav = !w.fav; on = w.fav; } });
        popHeart(el, on, 21);
      },
      item(app, el) { itemSheet(app, el.dataset.uid); },
      'queue-go'(app) {
        const s = app.s;
        const list = s.tryQueue.map((u) => entry(s, u)).filter(Boolean);
        VT.store.update((st) => { st.tryQueue = []; });
        if (!tryItems(app, list, '所选衣物暂不支持试穿')) app.refresh();
      },
      'queue-clear'(app) {
        VT.store.update((st) => { st.tryQueue = []; });
        app.refresh();
      },
      'add-open'(app) { addClothes(app); },
      'set-new'(app) {
        nameSheet(app, { title: '新建搭配集', ok: '创建', onOk: (name) => { const id = createSet(name); app.go('outfit', { id, pick: '1' }); } });
      },
      'set-open'(app, el) { app.go('outfit', { id: el.dataset.id }); },
      'set-more'(app, el) { setMenu(app, el.dataset.id); },
      'moment-open'(app, el) { app.go('moment', { id: el.dataset.id }); },
    }, shared),
  };

  /* ---------- 搭配集详情 (secondary, from 个人衣橱 → 搭配集) ---------- */
  VT.screens.outfit = {
    title: '搭配集',
    render(app, params) {
      const s = app.s;
      const c = setById(s, params && params.id) || sets(s)[0];
      if (!c) return `${VT.ui.subHead('搭配集')}<div class="scroll wr-od">${emptyState('hanger', '这个搭配集已不存在', '', '返回', 'back')}</div>`;
      const items = setItems(s, c);
      return `${VT.ui.statusBar('dark')}
        <header class="sub-head wr-od-head">${VT.ui.backBtn()}
          <div class="wr-od-title"><h1 class="wr-od-name">${esc(c.name)}</h1><span class="wr-od-n">${items.length} 件单品</span></div>
          ${VT.ui.iconBtn('more', '更多操作', 'od-more', { size: 22, cls: 'wr-head-more', attrs: `data-id="${c.id}" aria-haspopup="dialog"` })}
        </header>
        <div class="scroll wr-od" data-keep-scroll="wr-od">
          ${cover(s, c, 'wr-od-cover')}
          <ul class="wr-od-items" aria-label="搭配集里的单品">${items.map((w) => {
            const p = itemOf(w);
            return `<li><button type="button" class="wr-od-item" data-act="od-item" data-uid="${w.uid}" data-set="${c.id}" aria-haspopup="dialog" aria-label="${esc(p.name)}">${VT.ui.img(tileSrc(w, p), '', '', 'loading="lazy"')}</button></li>`;
          }).join('')}
            <li><button type="button" class="wr-od-item wr-od-add" data-act="od-edit" data-id="${c.id}" aria-label="编辑单品">${I('plus', { size: 22, stroke: 1.6 })}</button></li>
          </ul>
          ${items.length ? '' : '<p class="wr-od-hint">还没有单品，点「＋」从衣橱里挑选</p>'}
        </div>
        <div class="sub-foot wr-foot"><button type="button" class="btn btn--xl btn--block wr-cta" data-act="od-try" data-id="${c.id}" ${items.some((w) => !w.custom) ? '' : 'disabled'}>一键试穿这套</button></div>`;
    },
    mount(app, el, params, info) {
      // a collection just created from 新建搭配集 opens with 编辑单品
      if (params && params.pick && !(info && (info.restored || info.refresh))) app.later(() => pickSheet(app, params.id), 380);
    },
    actions: {
      'od-item'(app, el) { itemSheet(app, el.dataset.uid, { set: el.dataset.set }); },
      'od-edit'(app, el) { pickSheet(app, el.dataset.id); },
      'od-more'(app, el) { setMenu(app, el.dataset.id, true); },
      'od-try'(app, el) {
        const c = setById(app.s, el.dataset.id);
        if (c) tryItems(app, setItems(app.s, c), '这个搭配集还没有可试穿的单品');
      },
    },
  };

  /* ---------- 穿搭瞬间 (secondary, from 个人衣橱 → 穿搭瞬间) ---------- */
  VT.screens.moment = {
    title: '穿搭瞬间',
    render(app, params) {
      const s = app.s;
      const m = momentById(s, params && params.id) || momentsOf(s)[0];
      if (!m) return `${VT.ui.subHead('穿搭瞬间')}<div class="scroll wr-mo">${emptyState('image', '这张穿搭瞬间已不存在', '', '返回', 'back')}</div>`;
      const items = (m.items || []).map((pid) => D().byId[pid]).filter(Boolean);
      return `${VT.ui.subHead('穿搭瞬间', VT.ui.iconBtn('more', '更多操作', 'mo-more', { size: 22, cls: 'wr-head-more', attrs: `data-id="${m.id}" aria-haspopup="dialog"` }))}
        <div class="scroll wr-mo" data-keep-scroll="wr-mo">
          <div class="wr-mo-photo">${photo(m, 'wr-photo--lg')}${momentHeart(m)}</div>
          <div class="wr-mo-meta"><span class="wr-mo-date">${md(m.at)} 保存</span><span class="wr-private">${I('lock', { size: 13, stroke: 1.8 })}仅自己可见</span></div>
          ${items.length ? `<h2 class="wr-mo-h">相关单品</h2>
          <ul class="wr-mo-items">${items.map((p) => `<li><button type="button" class="wr-mo-item" data-act="mo-item" data-pid="${p.id}" aria-label="查看商品详情：${esc(p.name)}">
            <span class="wr-mo-thumb">${VT.ui.img(p.img.square || p.img.tile, '', '', 'loading="lazy"')}</span><span class="wr-mo-name">${esc(p.name)}</span>${(m.missing || []).includes(p.id) ? '<em class="wr-mo-tag">暂无上身图</em>' : ''}</button></li>`).join('')}</ul>` : ''}
          <p class="sheet-note">${m.scene ? '首页数字分身的试穿画面（演示版使用示例模特）' : '示例照片（演示版）'}</p>
        </div>
        <div class="sub-foot wr-foot wr-mo-cta">
          ${VT.ui.iconBtn('download', '保存图片', 'mo-save', { size: 22, stroke: 1.7, cls: 'wr-round', attrs: `data-id="${m.id}"` })}
          ${VT.ui.iconBtn('share', '分享', 'mo-share', { size: 22, stroke: 1.7, cls: 'wr-round', attrs: `data-id="${m.id}"` })}
          <button type="button" class="btn btn--xl wr-cta" data-act="mo-again" data-id="${m.id}" ${items.length ? '' : 'disabled'}>再次试穿</button>
        </div>`;
    },
    actions: Object.assign({
      'mo-more'(app, el) { momentMenu(app, el.dataset.id); },
      'mo-item'(app, el) { app.go('product', { pid: el.dataset.pid }); },
      'mo-save'(app, el) { const m = momentById(app.s, el.dataset.id); if (m) saveImage(app, m); },
      'mo-share'(app, el) { const m = momentById(app.s, el.dataset.id); if (m) shareMoment(app, m); },
      'mo-again'(app, el) {
        const m = momentById(app.s, el.dataset.id);
        if (m && m.items && m.items.length) VT.tryOn(app, m.items.filter((pid) => D().byId[pid]));
      },
    }, shared),
  };

  /* ---------- 首页 → 保存造型 ---------- */
  /** the active avatar's current try-on (the render 首页 shows, on its scene) joins their 穿搭瞬间 */
  function saveLook(app) {
    const s = app.s;
    const { render, missing } = VT.fitting.pickRender(s.fit.outfit);
    const chosen = Object.values(s.fit.outfit).filter((v) => typeof v === 'string' && D().byId[v]);
    const items = chosen.length ? chosen : Object.values(render.wears);
    const scene = s.fitScene || 'taupe';
    const open = () => { VT.store.update((st) => { st.wardrobeView = 'moments'; }); app.go('wardrobe'); };
    const last = momentsOf(s)[0];
    if (last && last.src === render.img && last.scene === scene && last.items.slice().sort().join() === items.slice().sort().join()) {
      app.toast('这套造型已经保存过了', { action: '去看看', onAction: open });
      return;
    }
    VT.store.update((st) => {
      st.moments = st.moments || [];
      st.moments.unshift({ id: VT.store.uid('m'), src: render.img, scene, at: Date.now(), items, missing: missing.filter((p) => items.includes(p)), fav: false });
    });
    app.toast('已保存到穿搭瞬间', { icon: 'check', action: '去看看', onAction: open });
  }

  VT.wardrobe = { saveLook };

  function downscale(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 520 / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve({ src: cv.toDataURL('image/jpeg', 0.82) });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
})();
