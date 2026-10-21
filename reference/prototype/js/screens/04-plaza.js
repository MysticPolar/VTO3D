/* 购物广场 — Shopping Plaza (primary tab 2)
   Top to bottom: search over every store and product · the user's favourite stores
   (全部 + favourites; swipe, tap to filter in place) · category chips · the feed: the platform
   banners for 全部, or the chosen store's promotional banner, whose 进入店铺 opens the store's
   own page (15-store.js); then the products in the chosen category.
   The chat icon at the top right opens 商家消息 (chats with stores). */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;

  /* ---------- stores ---------- */
  const favStores = (s) => (s.storeFavs || []).map((id) => D().storeById[id]).filter(Boolean);
  const isFavStore = (s, id) => (s.storeFavs || []).includes(id);
  /** the store the feed shows: a favourite, else 全部 */
  const curStore = (s) => (s.plaza.store && isFavStore(s, s.plaza.store) ? s.plaza.store : 'all');
  const query = (s) => (s.plaza.q || '').trim();
  const storeProducts = (id) => D().plazaOrder.map((pid) => D().byId[pid]).filter((p) => D().storeOf(p).id === id);

  function logo(st, cls) {
    return `<span class="st-logo ${st.mono.length > 2 ? 'is-word' : ''} ${cls || ''}" style="--st-bg:${st.bg};--st-fg:${st.fg}" aria-hidden="true">${VT.esc(st.mono)}</span>`;
  }

  function storeBar(s) {
    const cur = curStore(s);
    const favs = favStores(s);
    const tab = (id, label, face) => `<button type="button" role="tab" class="pz-st ${cur === id ? 'is-on' : ''}" aria-selected="${cur === id}" data-act="store" data-store="${id}">${face}<span class="pz-st-l">${VT.esc(label)}</span></button>`;
    return `<div class="pz-st-tabs" role="tablist" aria-label="关注的商家">
        ${tab('all', '全部', `<span class="st-logo st-logo--all" aria-hidden="true">${I('grid', { size: 20, stroke: 1.6 })}</span>`)}
        ${favs.map((st) => tab(st.id, st.name, logo(st))).join('')}
      </div>
      <button type="button" class="pz-st pz-st--manage" data-act="manage"><span class="st-logo st-logo--add" aria-hidden="true">${I('plus', { size: 18, stroke: 1.7 })}</span><span class="pz-st-l">${favs.length ? '管理' : '关注商家'}</span></button>`;
  }

  /* ---------- feed ---------- */
  /** products for the feed: search covers every store; otherwise the chosen store */
  function list(s) {
    const q = query(s).toLowerCase();
    const st = q ? 'all' : curStore(s);
    return D().plazaOrder.map((id) => D().byId[id]).filter((p) => {
      if (st !== 'all' && D().storeOf(p).id !== st) return false;
      if (!D().inCat(p, s.plaza.cat)) return false;
      if (!q) return true;
      return [p.name, p.cardName, p.tags, p.brand, D().storeOf(p).full, p.colors.map((c) => c.name).join('')].join(' ').toLowerCase().includes(q);
    });
  }

  function storeHits(q) {
    const k = q.toLowerCase();
    return D().stores.filter((st) => [st.name, st.full, st.tagline].join(' ').toLowerCase().includes(k));
  }

  /** how a product photo sits in its box: model photos keep the face, small items sit on a plate */
  function imgCls(p) {
    const src = p.img.plaza || p.img.card;
    return src.includes('/models/') ? 'is-model' : p.small ? 'is-small' : p.cardFocus === 'top' ? 'is-top' : '';
  }

  /** a product card; ✓ (top left: the heart has the right) when the active person owns it (VT.garments) */
  function card(p, s, i) {
    const fav = VT.store.h.isFav(s, p.id);
    const own = VT.garments.ownsProduct(s, p.id);
    return `<li class="pz-card" data-pid="${p.id}">
      <button type="button" class="pz-open" data-act="nav" data-to="product" data-pid="${p.id}" aria-label="查看 ${p.name}，¥${p.price}${own ? '，已拥有' : ''}"></button>
      <div class="pz-img ${imgCls(p)}">${VT.ui.img(p.img.plaza || p.img.card, p.name, '', i < 6 ? '' : 'loading="lazy"')}</div>
      ${VT.ui.heart(p.id, fav, { cls: 'pz-heart', size: 23, stroke: 1.55 })}
      ${VT.ui.ownMark(own, 'own-mark--l')}
      <div class="pz-meta">
        <h3>${p.cardName}</h3>
        <p class="pz-tags">${p.tags}</p>
        <div class="pz-row">${VT.ui.price(p.price, 'pz-price')}${VT.ui.dots(p)}</div>
      </div>
    </li>`;
  }

  function storeRow(st, s) {
    const on = isFavStore(s, st.id);
    return `<li class="pz-srow">
      <button type="button" class="pz-srow-open" data-act="store-info" data-store="${st.id}" aria-label="查看店铺 ${VT.esc(st.full)}"></button>
      ${logo(st, 'st-logo--md')}
      <span class="pz-srow-main"><b>${VT.esc(st.full)}</b><em>${VT.esc(st.tagline)} · 在售 ${storeProducts(st.id).length} 件</em></span>
      ${favBtn(st, on)}
    </li>`;
  }

  /** 关注 / 已关注 pill used in search results and the manage sheet */
  function favBtn(st, on) {
    return `<button type="button" class="pz-sfav ${on ? 'is-on' : ''}" data-act="sfav" data-store="${st.id}" aria-pressed="${on}">${on ? '已关注' : '关注'}<span class="sr-only">${VT.esc(st.name)}</span></button>`;
  }

  function banners() {
    const B = 'assets/plaza/banners/';
    const slides = [
      { src: B + 'platform-new-season.webp', label: 'NEW SEASON 秋日灵感穿搭，探索本季精选单品' },
      { src: B + 'platform-autumn.webp', label: '秋日灵感穿搭，精选单品，定义新季风格' },
    ];
    return `<div class="pz-banners">
      <div class="pz-ban-track" data-keep-scroll="pz-ban">${slides.map((b, i) => `<button type="button" class="pz-ban" data-act="season" aria-label="${b.label}">${VT.ui.img(b.src, '', '', i ? 'loading="lazy"' : '')}</button>`).join('')}</div>
      <div class="pz-ban-dots" aria-hidden="true">${slides.map((b, i) => `<i class="${i ? '' : 'is-on'}"></i>`).join('')}</div>
    </div>`;
  }

  /** hex colour `a` moved toward `b` by t (0–1): the collage banners' tint from the store's colour */
  function mix(a, b, t) {
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const x = rgb(a), y = rgb(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  /** a store's promotional banner, the same on 购物广场 and on the store's page: live copy over
      its text-free campaign photo, or, for a store without one, over a collage of its own
      products. opts.cta adds the 进入店铺 pill. Markup is phrasing content, so it can sit in a button. */
  function banner(st, opts) {
    const o = opts || {};
    const c = st.campaign || {};
    const tiles = storeProducts(st.id).slice(0, 3);
    const art = c.img
      ? `<span class="mban-art">${VT.ui.img(c.img, '', 'mban-img')}</span>`
      : `<span class="mban-art is-collage" style="--mb-tint:${mix(st.bg, '#F6F1EA', 0.78)}" aria-hidden="true"><span class="mban-tiles n${tiles.length}">${tiles.map((p) => `<span class="mban-tile ${imgCls(p)}">${VT.ui.img(p.img.plaza || p.img.card, '')}</span>`).join('')}</span></span>`;
    return `${art}<span class="mban-copy">
        <span class="mban-word ${st.mono.length > 2 ? '' : 'is-name'}">${VT.esc(st.name)}</span>
        ${c.line ? `<span class="mban-line">${VT.esc(c.line)}</span>` : ''}
        <span class="mban-line">${VT.esc(st.tagline)}</span>
        ${o.cta ? `<span class="mban-cta">进入店铺${I('chevron-right', { size: 14, stroke: 1.9 })}</span>` : ''}
      </span>`;
  }
  /** what the banner says, for its accessible name */
  const bannerText = (st) => `${st.name}${st.campaign && st.campaign.line ? ' ' + st.campaign.line : ''}：${st.tagline}`;

  /** the chosen store's head on 购物广场: its banner; the banner and its 进入店铺 open the store's page */
  function storeHead(st) {
    return `<button type="button" class="mban pz-shop-ban" data-act="store-info" data-store="${st.id}" aria-label="${VT.esc(bannerText(st))}，进入店铺">${banner(st, { cta: true })}</button>`;
  }

  const empty = (msg, btn, act) => `<div class="pz-empty">${I('search', { size: 30, stroke: 1.4 })}<p>${msg}</p><button type="button" class="btn btn--ghost btn--sm" data-act="${act}">${btn}</button></div>`;
  const grid = (items, s) => `<ul class="pz-grid">${items.map((p, i) => card(p, s, i)).join('')}</ul>`;

  function feed(s) {
    const q = query(s);
    const items = list(s);
    if (q) {
      const hits = storeHits(q);
      if (!hits.length && !items.length) return empty(`没有找到「${VT.esc(q)}」相关的商家或单品`, '清除搜索', 'clear');
      return `${hits.length ? `<h2 class="pz-sec">相关商家</h2><ul class="pz-srows">${hits.map((st) => storeRow(st, s)).join('')}</ul>` : ''}
        ${items.length ? `${hits.length ? '<h2 class="pz-sec">相关商品</h2>' : ''}${grid(items, s)}` : `<p class="pz-none">没有找到「${VT.esc(q)}」相关的单品</p>`}`;
    }
    const cur = curStore(s);
    const head = cur === 'all' ? banners() : storeHead(D().storeById[cur]);
    if (!items.length) {
      const cat = D().plazaCats.find((c) => c.id === s.plaza.cat);
      return head + empty(`${cur === 'all' ? '暂无' : '这家店暂无'}「${cat ? cat.label : ''}」商品`, '查看全部分类', 'allcats');
    }
    return head + grid(items, s);
  }

  /* ---------- screen ---------- */
  function msgBtn(s) {
    const n = VT.storeChat ? VT.storeChat.unread(s) : 0;
    return `<button type="button" class="icon-btn pz-msg" data-act="nav" data-to="messages" aria-label="商家消息${n ? `，${n} 条未读` : ''}">${I('chat-dots', { size: 24, stroke: 1.75 })}${n ? `<span class="pz-badge" aria-hidden="true">${n > 99 ? '99+' : n}</span>` : ''}</button>`;
  }

  VT.screens.plaza = {
    title: '购物广场',
    render(app) {
      const s = app.s;
      return `
        ${VT.ui.statusBar('dark')}
        <header class="pz-head">
          <h1 class="pz-title">购物广场</h1>
          <div class="pz-actions">
            ${VT.ui.iconBtn('bag', '购物袋', 'nav', { attrs: 'data-to="checkout"', size: 24, stroke: 1.75, cls: 'pz-bag' })}
            ${msgBtn(s)}
          </div>
        </header>
        <div class="pz-search">
          <label class="pz-search-box">${I('search', { size: 19, stroke: 1.7 })}
            <input type="search" placeholder="搜索商家、品牌或单品..." value="${VT.esc(s.plaza.q)}" data-input="search" data-focus-key="pz-q" aria-label="搜索商家、品牌或单品" enterkeyhint="search">
          </label>
          <button type="button" class="pz-scan" data-act="scan" aria-label="拍照找同款">${I('scan', { size: 18, stroke: 1.7 })}</button>
        </div>
        <div class="pz-stores" data-keep-scroll="pz-stores">${storeBar(s)}</div>
        <div class="pz-chips" role="tablist" aria-label="商品分类" data-keep-scroll="pz-chips">
          ${D().plazaCats.map((c) => `<button type="button" role="tab" class="chip ${c.id === s.plaza.cat ? 'is-on' : ''}" aria-selected="${c.id === s.plaza.cat}" data-act="cat" data-cat="${c.id}">${c.label}</button>`).join('')}
        </div>
        <div class="scroll pz-scroll" data-keep-scroll="pz">${feed(s)}</div>
        ${VT.ui.tabBar('plaza')}`;
    },
    mount(app, el) {
      if (el._pzBound) return;
      el._pzBound = true;
      // banner dots follow the swipe (scroll events don't bubble, so listen while capturing)
      el.addEventListener('scroll', (ev) => {
        const t = ev.target;
        if (!t.classList || !t.classList.contains('pz-ban-track')) return;
        const i = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
        t.parentElement.querySelectorAll('.pz-ban-dots i').forEach((d, k) => d.classList.toggle('is-on', k === i));
      }, true);
    },
    actions: {
      store(app, el) { selectStore(app, el.dataset.store); },
      cat(app, el) { setCat(app, el.dataset.cat); },
      allcats(app) { setCat(app, 'all'); },
      search(app, el) {
        const reset = !!el.value.trim() && curStore(app.s) !== 'all';
        // search covers every store, so the bar goes back to 全部 while searching
        VT.store.update((s) => { s.plaza.q = el.value; if (reset) s.plaza.store = 'all'; });
        const root = app.screenEl();
        if (reset) updateBar(root, app.s);
        root.querySelector('.pz-scroll').innerHTML = feed(app.s);
      },
      clear(app) {
        VT.store.update((s) => { s.plaza.q = ''; s.plaza.cat = 'all'; });
        app.refresh();
      },
      manage(app) { manageStores(app); },
      // the store banner's 进入店铺 and the search rows open the store's own page
      'store-info'(app, el) { VT.storefront.open(app, el.dataset.store); },
      sfav(app, el) { toggleFav(app, el.dataset.store); },
      season(app) { seasonPicks(app); },
      scan(app) {
        const ov = app.sheet({
          title: '拍照找同款',
          html: `<p class="sheet-lead">上传一张衣服照片，演示版会从本地商品库中推荐风格相近的单品（非真实图像识别）。</p>
            <label class="btn btn--dark btn--lg btn--block scan-pick">${I('image', { size: 20 })}选择照片
              <input class="sr-only" type="file" accept="image/*" data-change="scan-file"></label>
            <div class="scan-result" aria-live="polite"></div>`,
          actions: {
            'scan-file': (el) => {
              const f = el.files && el.files[0];
              if (!f) return;
              if (!f.type.startsWith('image/')) { app.toast('请选择图片文件'); return; }
              const url = URL.createObjectURL(f);
              const picks = ['striped-shirt', 'oxford-shirt', 'white-shirt'].map((id) => D().byId[id]);
              ov.querySelector('.scan-result').innerHTML = `
                <div class="scan-photo"><img src="${url}" alt="你上传的照片"><span>已上传</span></div>
                <h4 class="scan-h">相似单品推荐<span class="badge-demo">演示数据</span></h4>
                <div class="opt-list">${picks.map((p) => `<button type="button" class="mini" data-act="scan-go" data-pid="${p.id}">${VT.ui.img(p.img.card, p.name)}<span class="mini-main"><span class="mini-title">${p.name}</span><span class="mini-sub">${p.tags}</span></span>${VT.ui.price(p.price)}</button>`).join('')}</div>`;
            },
            'scan-go': (el) => app.go('product', { pid: el.dataset.pid }),
          },
        });
      },
    },
  };

  /* ---------- behaviour ---------- */
  function updateBar(root, s) {
    const bar = root.querySelector('.pz-stores');
    const x = bar.scrollLeft;
    bar.innerHTML = storeBar(s);
    bar.scrollLeft = x;
  }

  function selectStore(app, id) {
    if (query(app.s)) {
      // tapping a store leaves the search and shows that store
      VT.store.update((s) => { s.plaza.q = ''; s.plaza.store = id; });
      app.refresh();
    } else {
      VT.store.update((s) => { s.plaza.store = id; });
      const root = app.screenEl();
      root.querySelectorAll('.pz-st[data-store]').forEach((b) => { const on = b.dataset.store === id; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
      root.querySelector('.pz-scroll').innerHTML = feed(app.s);
    }
    const root = app.screenEl();
    root.querySelector('.pz-scroll').scrollTop = 0;
    // keep the chosen store in view
    const bar = root.querySelector('.pz-stores');
    const b = bar.querySelector(`.pz-st[data-store="${id}"]`);
    if (b) {
      if (b.offsetLeft < bar.scrollLeft) bar.scrollLeft = b.offsetLeft - 16;
      else if (b.offsetLeft + b.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = b.offsetLeft + b.offsetWidth - bar.clientWidth + 16;
    }
  }

  function setCat(app, id) {
    VT.store.update((s) => { s.plaza.cat = id; });
    const root = app.screenEl();
    root.querySelectorAll('.pz-chips .chip').forEach((c) => { const on = c.dataset.cat === id; c.classList.toggle('is-on', on); c.setAttribute('aria-selected', on); });
    const sc = root.querySelector('.pz-scroll');
    sc.innerHTML = feed(app.s);
    sc.scrollTop = 0;
  }

  /** 关注 / 取消关注 a store (the user's favourite stores, s.storeFavs: the same list on 购物广场's
      bar, search pills, 管理 and the store's page); a new one goes to the front of the bar */
  function toggleFav(app, id) {
    const st = D().storeById[id];
    if (!st) return false;
    let on = false;
    VT.store.update((s) => {
      const favs = s.storeFavs || (s.storeFavs = []);
      const i = favs.indexOf(id);
      if (i >= 0) { favs.splice(i, 1); if (s.plaza.store === id) s.plaza.store = 'all'; }
      else { favs.unshift(id); on = true; }
    });
    app.toast(on ? `已关注「${st.name}」` : `已取消关注「${st.name}」`);
    const el = app.screenEl();
    if (el && el.dataset.screen === 'plaza') app.refresh();
    return on;
  }

  const mini = (p) => `<button type="button" class="mini" data-act="go" data-pid="${p.id}">${VT.ui.img(p.img.plaza || p.img.card, p.name)}<span class="mini-main"><span class="mini-title">${p.name}</span><span class="mini-sub">${p.tags}</span></span>${VT.ui.price(p.price)}</button>`;

  /** kept for callers of the old store sheet: a store now opens its own page */
  function openStore(app, id) { VT.storefront.open(app, id); }

  /** 管理: 取消关注 a store, or 关注 one of the others */
  function manageStores(app) {
    const body = () => {
      const s = app.s;
      const favs = favStores(s);
      const others = D().stores.filter((st) => !isFavStore(s, st.id));
      const row = (st, on) => `<li class="ms-row">${logo(st, 'st-logo--md')}<span class="ms-main"><b>${VT.esc(st.name)}</b><em>${VT.esc(st.tagline)}</em></span>${favBtn(st, on)}</li>`;
      return `<p class="sheet-lead">关注的商家会显示在购物广场顶部，左右滑动、点击即可切换。</p>
        <h4 class="ss-h">已关注 ${favs.length}</h4>
        ${favs.length ? `<ul class="ms-list">${favs.map((st) => row(st, true)).join('')}</ul>` : '<p class="ms-empty">还没有关注的商家</p>'}
        ${others.length ? `<h4 class="ss-h">推荐商家</h4><ul class="ms-list">${others.map((st) => row(st, false)).join('')}</ul>` : ''}`;
    };
    const ov = app.sheet({
      title: '关注的商家',
      html: `<div class="js-ms">${body()}</div>`,
      actions: {
        sfav: (el) => {
          const id = el.dataset.store;
          toggleFav(app, id);
          ov.querySelector('.js-ms').innerHTML = body();
          const again = ov.querySelector(`.pz-sfav[data-store="${id}"]`);
          if (again) again.focus({ preventScroll: true });
        },
      },
    });
    return ov;
  }

  /** the platform banners' picks */
  function seasonPicks(app) {
    const items = D().seasonPicks.map((id) => D().byId[id]).filter(Boolean);
    app.sheet({
      title: '秋日灵感穿搭',
      cls: 'ov--shop',
      html: `<p class="sheet-lead">本季精选单品 · 演示数据</p><div class="opt-list">${items.map(mini).join('')}</div>`,
      actions: { go: (el) => app.go('product', { pid: el.dataset.pid }) },
    });
  }

  /** system notices (price drops, shipping, AI 造型师): first row of 商家消息 */
  function notices(app) {
    return app.sheet({
      title: '消息通知',
      html: `<ul class="notice-list">
        <li><button type="button" data-act="go-product"><span class="notice-ic">${I('heart', { size: 18 })}</span><span><b>心愿单降价提醒</b><em>你关注的「条纹亚麻衬衫」本周可用 ¥20 优惠券</em><i>10 分钟前</i></span></button></li>
        <li><button type="button" data-act="go-orders"><span class="notice-ic">${I('truck', { size: 18 })}</span><span><b>订单运输中</b><em>你的订单预计 7月18日 送达，点击查看物流</em><i>今天 08:32</i></span></button></li>
        <li><button type="button" data-act="go-stylist"><span class="notice-ic">${I('sparkle', { size: 18 })}</span><span><b>AI 造型师</b><em>为你准备了 3 套朋友聚会穿搭，快去看看</em><i>昨天</i></span></button></li>
      </ul>`,
      actions: {
        'go-product': () => app.go('product', { pid: 'striped-shirt' }),
        'go-orders': () => app.open('orders', { oid: D().seedOrder.id }, { anim: 'fade' }), // lives under 我的 → 我的订单
        'go-stylist': () => app.go('stylist'),
      },
    });
  }

  /** refresh the unread badge when chats change while 购物广场 is on screen */
  function syncBadge(app) {
    const el = app.screenEl();
    if (!el || el.dataset.screen !== 'plaza') return;
    const b = el.querySelector('.pz-msg');
    if (b) b.outerHTML = msgBtn(app.s);
  }

  // shared with the store's page (15-store.js), 商品详情 and 商家消息: one store model, one card, one banner
  VT.plaza = { openStore, manageStores, toggleFav, notices, logo, syncBadge, banner, bannerText, card, mini, storeProducts, isFavStore };
})();
