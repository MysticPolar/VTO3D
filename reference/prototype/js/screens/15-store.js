/* 商家店铺 — a store's own page (secondary, parent 购物广场; no tab bar).
   Opened from 购物广场 (the chosen store's banner and its 进入店铺, the store rows in search),
   商品详情 (the brand row) and 商家消息 (a chat's store avatar and the chat header).
   Top to bottom: back + share · the store (logo, name, tagline) with 关注 and 联系商家 · its
   banner · its introduction · 当季精选 (only stores with collections) · 全部商品: the categories it
   sells and the two-column feed, the same cards as 购物广场.
   One store model: 关注 is the same list as 购物广场's favourite stores (s.storeFavs), and
   联系商家 opens the same chat as 商家消息. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  const esc = (t) => VT.esc(t);

  const storeOf = (app) => D().storeById[app.params.sid] || D().storeById.zara;
  /** 全部 plus the categories this store actually sells */
  const catsOf = (items) => D().plazaCats.filter((c) => c.id === 'all' || items.some((p) => D().inCat(p, c.id)));
  function catOf(app, items) {
    const c = app.params.cat;
    return c && catsOf(items).some((x) => x.id === c) ? c : 'all';
  }

  const followBtn = (on) => `<button type="button" class="sf-follow ${on ? 'is-on' : ''}" data-act="follow" aria-pressed="${on}">${I(on ? 'check' : 'plus', { size: 14, stroke: 2 })}${on ? '已关注' : '关注'}</button>`;

  function feed(app) {
    const items = VT.plaza.storeProducts(storeOf(app).id);
    const cat = catOf(app, items);
    // the feed sits below the fold here, so every card image loads lazily (index offset)
    return `<ul class="pz-grid">${items.filter((p) => D().inCat(p, cat)).map((p, i) => VT.plaza.card(p, app.s, i + 6)).join('')}</ul>`;
  }

  VT.screens.store = {
    title: '商家店铺',
    render(app) {
      const s = app.s;
      const st = storeOf(app);
      const items = VT.plaza.storeProducts(st.id);
      const cat = catOf(app, items);
      const cols = st.collections || [];
      return `
        ${VT.ui.statusBar('dark')}
        <header class="sf-top">${VT.ui.backBtn()}${VT.ui.iconBtn('share', '分享店铺', 'share', { size: 24, stroke: 1.6, cls: 'sf-share' })}</header>
        <div class="scroll sf-scroll" data-keep-scroll="sf">
          <section class="sf-id">
            ${VT.plaza.logo(st, 'st-logo--sf')}
            <div class="sf-id-main">
              <h1 class="sf-name">${esc(st.name)}</h1>
              <p class="sf-tag">${esc(st.tagline)}</p>
              <p class="sf-meta">在售 ${items.length} 件 · 店铺评分 ${st.rating.toFixed(1)}</p>
            </div>
            <div class="sf-id-acts">
              ${followBtn(VT.plaza.isFavStore(s, st.id))}
              <button type="button" class="sf-contact" data-act="chat">${I('chat-dots', { size: 14, stroke: 1.7 })}联系商家</button>
            </div>
          </section>
          <div class="mban sf-ban">${VT.plaza.banner(st)}</div>
          ${st.intro ? `<button type="button" class="sf-intro" data-act="about"><span>${esc(st.intro)}</span>${I('chevron-right', { size: 16, stroke: 1.7 })}<i class="sr-only">，查看品牌介绍</i></button>` : ''}
          ${cols.length ? `<h2 class="sf-h">当季精选</h2>
            <div class="sf-cols" data-keep-scroll="sf-cols">${cols.map((c) => `<button type="button" class="sf-col" data-act="col" data-col="${c.id}">${VT.ui.img(c.img, '', '', 'loading="lazy"')}<b>${esc(c.name)}</b><em>${esc(c.sub)}</em></button>`).join('')}</div>` : ''}
          <h2 class="sf-h">全部商品</h2>
          <div class="pz-chips sf-chips" role="tablist" aria-label="商品分类" data-keep-scroll="sf-chips">
            ${catsOf(items).map((c) => `<button type="button" role="tab" class="chip ${c.id === cat ? 'is-on' : ''}" aria-selected="${c.id === cat}" data-act="cat" data-cat="${c.id}">${c.label}</button>`).join('')}
          </div>
          <div class="sf-feed">${feed(app)}</div>
          <p class="sheet-note">店铺介绍、商品与评分均为演示数据</p>
        </div>`;
    },
    actions: {
      back(app) {
        // opened from a chat's header: going back re-opens that chat (history and draft intact)
        const reopen = app.params.chat && !app.overlayEl.querySelector('.ov.is-open') ? storeOf(app).id : null;
        app.back();
        if (reopen) VT.storeChat.open(app, reopen);
      },
      async share(app) {
        const st = storeOf(app);
        const text = `${st.full} · ${st.tagline} — 来自「全新的购物体验」原型`;
        if (navigator.share && !VT.framed) {
          try { await navigator.share({ title: st.full, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
        }
        try { await navigator.clipboard.writeText(text); app.toast('店铺信息已复制，可粘贴分享'); }
        catch (e) { app.toast('分享面板在此浏览器不可用'); }
      },
      follow(app) {
        const on = VT.plaza.toggleFav(app, storeOf(app).id);
        const root = app.screenEl();
        root.querySelector('.sf-follow').outerHTML = followBtn(on);
        root.querySelector('.sf-follow').focus({ preventScroll: true });
      },
      chat(app) { VT.storeChat.open(app, storeOf(app).id); },
      cat(app, el) {
        app.cur.params.cat = el.dataset.cat; // kept in this page's history entry
        const root = app.screenEl();
        root.querySelectorAll('.sf-chips .chip').forEach((c) => { const on = c === el; c.classList.toggle('is-on', on); c.setAttribute('aria-selected', on); });
        root.querySelector('.sf-feed').innerHTML = feed(app);
      },
      about(app) {
        const st = storeOf(app);
        const items = VT.plaza.storeProducts(st.id);
        const sells = catsOf(items).filter((c) => c.id !== 'all').map((c) => c.label).join(' · ');
        app.sheet({
          title: '品牌介绍',
          html: `<div class="sf-about-head">${VT.plaza.logo(st, 'st-logo--lg')}<div class="sf-about-main"><b>${esc(st.full)}</b><span>${esc(st.tagline)}</span></div></div>
            <p class="sf-about-text">${esc(st.intro)}</p>
            <dl class="sf-facts"><div><dt>主营品类</dt><dd>${sells}</dd></div><div><dt>在售商品</dt><dd>${items.length} 件</dd></div><div><dt>店铺评分</dt><dd>${st.rating.toFixed(1)}</dd></div></dl>
            <p class="sheet-note">店铺介绍与评分均为演示数据</p>`,
        });
      },
      col(app, el) {
        const st = storeOf(app);
        const c = (st.collections || []).find((x) => x.id === el.dataset.col);
        if (!c) return;
        // a collection only ever lists this store's own products
        const items = c.items.map((id) => D().byId[id]).filter((p) => p && D().storeOf(p).id === st.id);
        app.sheet({
          title: c.name,
          html: `<div class="sf-col-hero">${VT.ui.img(c.img, '')}</div>
            <p class="sheet-lead">${esc(c.sub)} · ${items.length} 件</p>
            <div class="opt-list">${items.map(VT.plaza.mini).join('')}</div>`,
          actions: { go: (b) => app.go('product', { pid: b.dataset.pid }) },
        });
      },
    },
  };

  /** open a store's page without stacking a second copy: when the page is already in this tab's
      history, go back to it. extra (e.g. { chat: '1' }) only applies to a newly opened page. */
  function open(app, sid, extra) {
    if (!D().storeById[sid]) return;
    const st = app.stack;
    const i = st.findIndex((e) => e.id === 'store' && e.params.sid === sid);
    if (i >= 0 && i === st.length - 1) { app.closeAllOverlays(); return; }
    if (i > 0) { app.closeAllOverlays(true); st.splice(i + 1); app.render('pop'); return; }
    app.go('store', Object.assign({ sid }, extra || {}));
  }

  VT.storefront = { open };
})();
