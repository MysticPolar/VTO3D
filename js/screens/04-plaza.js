/* 购物广场 — Shopping Plaza (primary tab 2) */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  // image heights of the first six cards follow the reference feed (masonry-style rows)
  const REF_H = { 'knit-cardigan': 165, 'straight-jeans': 165, 'striped-shirt': 142.3, 'brown-blazer': 142.3, 'basic-cami': 83.7, 'pleated-skirt': 83.7 };

  function list(s) {
    const q = (s.plaza.q || '').trim().toLowerCase();
    return D().plazaOrder.map((id) => D().byId[id]).filter((p) => {
      if (!D().inCat(p, s.plaza.cat)) return false;
      if (!q) return true;
      return [p.name, p.cardName, p.tags, p.brand, p.colors.map((c) => c.name).join('')].join(' ').toLowerCase().includes(q);
    });
  }

  function card(p, s, i, filtered) {
    const fav = VT.store.h.isFav(s, p.id);
    const h = !filtered && REF_H[p.id] ? REF_H[p.id] : (p.small ? 150 : 158);
    return `<li class="pz-card">
      <button type="button" class="pz-open" data-act="nav" data-to="product" data-pid="${p.id}" aria-label="查看 ${p.name}，¥${p.price}"></button>
      <div class="pz-img ${p.small ? 'is-small' : ''}" style="height:${h}px">${VT.ui.img(p.img.card, p.name, '', i < 6 ? '' : 'loading="lazy"')}</div>
      ${VT.ui.heart(p.id, fav, { cls: 'pz-heart', size: 23, stroke: 1.55 })}
      <div class="pz-meta">
        <h3>${p.cardName}</h3>
        <p class="pz-tags">${p.tags}</p>
        <div class="pz-row">${VT.ui.price(p.price, 'pz-price')}${VT.ui.dots(p)}</div>
      </div>
    </li>`;
  }

  function grid(s) {
    const items = list(s);
    const filtered = s.plaza.cat !== 'all' || !!(s.plaza.q || '').trim();
    if (!items.length) {
      return `<div class="pz-empty">${I('search', { size: 30, stroke: 1.4 })}<p>没有找到「${VT.esc(s.plaza.q)}」相关的单品</p><button type="button" class="btn btn--ghost btn--sm" data-act="clear">清除搜索</button></div>`;
    }
    return `<ul class="pz-grid">${items.map((p, i) => card(p, s, i, filtered)).join('')}</ul>`;
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
            ${VT.ui.iconBtn('bell', '消息通知', 'notices', { size: 24, stroke: 1.75, cls: 'pz-bell' })}
          </div>
        </header>
        <div class="pz-search">
          <label class="pz-search-box">${I('search', { size: 19, stroke: 1.7 })}
            <input type="search" placeholder="搜索品牌、风格或单品..." value="${VT.esc(s.plaza.q)}" data-input="search" data-focus-key="pz-q" aria-label="搜索品牌、风格或单品" enterkeyhint="search">
          </label>
          <button type="button" class="pz-scan" data-act="scan" aria-label="拍照找同款">${I('scan', { size: 18, stroke: 1.7 })}</button>
        </div>
        <div class="pz-chips" role="tablist" aria-label="商品分类" data-keep-scroll="pz-chips">
          ${D().plazaCats.map((c) => `<button type="button" role="tab" class="chip ${c.id === s.plaza.cat ? 'is-on' : ''}" aria-selected="${c.id === s.plaza.cat}" data-act="cat" data-cat="${c.id}">${c.label}</button>`).join('')}
        </div>
        <div class="scroll pz-scroll" data-keep-scroll="pz">${grid(s)}</div>
        ${VT.ui.tabBar('plaza')}`;
    },
    actions: {
      cat(app, el) {
        VT.store.update((s) => { s.plaza.cat = el.dataset.cat; });
        const root = app.screenEl();
        root.querySelectorAll('.pz-chips .chip').forEach((c) => { const on = c.dataset.cat === el.dataset.cat; c.classList.toggle('is-on', on); c.setAttribute('aria-selected', on); });
        const sc = root.querySelector('.pz-scroll');
        sc.innerHTML = grid(app.s);
        sc.scrollTop = 0;
      },
      search(app, el) {
        VT.store.update((s) => { s.plaza.q = el.value; });
        app.screenEl().querySelector('.pz-scroll').innerHTML = grid(app.s);
      },
      clear(app) {
        VT.store.update((s) => { s.plaza.q = ''; s.plaza.cat = 'all'; });
        app.refresh();
      },
      notices(app) {
        const ov = app.sheet({
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
        return ov;
      },
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
})();
