/* 商品详情 — Product Details (secondary; from 购物广场, 衣橱, AI 造型师, 我的收藏 …) */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  let galleryIndex = {};

  function pidOf(app) { return (app.params && app.params.pid) || 'striped-shirt'; }

  function heroFit(src) { return /model|items\//.test(src) ? 'contain' : 'cover'; }

  const reviews = [
    { n: '小鹿***', t: '面料很舒服，透气不闷，版型宽松刚好，通勤穿很合适。', s: 5, sz: 'M · 蓝色条纹' },
    { n: 'Echo***', t: '先在数字分身上试了一下效果，实物和试穿效果几乎一致！', s: 5, sz: 'S · 蓝色条纹' },
    { n: '橙子***', t: '颜色比图片稍浅一点，洗过一次没有缩水，会回购。', s: 4, sz: 'M · 象牙白' },
  ];

  VT.screens.product = {
    title: '商品详情',
    render(app) {
      const s = app.s;
      const p = D().byId[pidOf(app)] || D().byId['striped-shirt'];
      const sel = VT.store.h.selection(s, p.id);
      const color = p.colors.find((c) => c.id === sel.color) || p.colors[0];
      const gi = galleryIndex[p.id] || 0;
      const thumbs = p.galleryThumbs || p.gallery;
      const fav = VT.store.h.isFav(s, p.id);
      const hero = p.gallery[gi] || p.gallery[0];
      return `
        ${VT.ui.statusBar('dark')}
        <div class="scroll pd-scroll" data-keep-scroll="pd">
          <div class="pd-hero ${p.small ? 'is-small' : ''}">
            ${VT.ui.img(hero, `${p.name}（第 ${gi + 1} 张，共 ${p.gallery.length} 张）`, 'pd-hero-img fit-' + heroFit(hero), 'fetchpriority="high"')}
            <button type="button" class="pd-hero-next" data-act="next-img" aria-label="下一张图片"></button>
          </div>
          <div class="pd-thumbs" role="tablist" aria-label="商品图片">
            ${thumbs.map((src, i) => `<button type="button" role="tab" class="pd-thumb ${i === gi ? 'is-on' : ''}" aria-selected="${i === gi}" aria-label="第 ${i + 1} 张图片" data-act="img" data-i="${i}">${VT.ui.img(src, '', p.small ? 'is-small' : '')}</button>`).join('')}
          </div>
          <div class="pd-body">
            <div class="pd-title-row">
              <h1 class="pd-title">${p.name}</h1>
              <button type="button" class="pd-rating" data-act="reviews" aria-label="评分 ${p.rating}，${p.reviews} 条评价">${I('star', { size: 17 })}<b>${p.rating.toFixed(1)}</b><span>(${p.reviews})</span></button>
            </div>
            <button type="button" class="pd-brand" data-act="brand">${p.brand}${I('chevron-right', { size: 15, stroke: 1.8 })}</button>
            <p class="pd-price">${VT.ui.price(p.price)}</p>
            <p class="pd-desc">${VT.ui.nl2br(p.desc)}</p>
            <div class="pd-sec">
              <h2>颜色</h2>
              <button type="button" class="pd-more" data-act="colors"><span class="js-color">${color.name}</span>${I('chevron-right', { size: 16, stroke: 1.8 })}</button>
            </div>
            <div class="pd-swatches" role="radiogroup" aria-label="颜色">
              ${p.colors.map((c) => `<button type="button" role="radio" class="pd-sw ${c.id === color.id ? 'is-on' : ''}" aria-checked="${c.id === color.id}" aria-label="${c.name}" data-act="color" data-color="${c.id}"><i style="${VT.ui.swatchStyle(c.hex)}"></i></button>`).join('')}
            </div>
            <div class="pd-sec pd-sec--size">
              <h2>尺码</h2>
              <button type="button" class="pd-more" data-act="guide">尺码指南${I('chevron-right', { size: 16, stroke: 1.8 })}</button>
            </div>
            <div class="pd-sizes" role="radiogroup" aria-label="尺码">
              ${p.sizes.map((z) => `<button type="button" role="radio" class="pd-size ${z === sel.size ? 'is-on' : ''}" aria-checked="${z === sel.size}" data-act="size" data-size="${z}">${z}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="pd-top">
          ${VT.ui.backBtn()}
          <div class="pd-top-r">
            ${VT.ui.heart(p.id, fav, { cls: 'pd-fav', size: 26, stroke: 1.6 })}
            ${VT.ui.iconBtn('share', '分享', 'share', { size: 26, stroke: 1.6, cls: 'pd-share' })}
          </div>
        </div>
        <div class="pd-cta">
          <button type="button" class="btn pd-try" data-act="try" aria-label="立即试穿：试穿上身">${I('dress', { size: 25, stroke: 1.5 })}<span>试穿上身</span></button>
          <button type="button" class="btn pd-add" data-act="add">${I('bag', { size: 25, stroke: 1.5 })}<span>加入衣橱</span></button>
        </div>`;
    },
    mount(app, el, params, o) {
      if (o && o.refresh) return;
      const pid = pidOf(app);
      VT.store.update((s) => VT.store.h.viewed(s, pid)); // 浏览记录
    },
    actions: {
      img(app, el) { setImage(app, +el.dataset.i); },
      'next-img'(app) {
        const p = D().byId[pidOf(app)];
        setImage(app, ((galleryIndex[p.id] || 0) + 1) % p.gallery.length);
      },
      color(app, el) {
        const p = D().byId[pidOf(app)];
        VT.store.update((s) => { s.selections[p.id] = Object.assign(VT.store.h.selection(s, p.id), { color: el.dataset.color }); });
        const root = app.screenEl();
        root.querySelectorAll('.pd-sw').forEach((b) => { const on = b.dataset.color === el.dataset.color; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); });
        root.querySelector('.js-color').textContent = p.colors.find((c) => c.id === el.dataset.color).name;
      },
      size(app, el) {
        const p = D().byId[pidOf(app)];
        VT.store.update((s) => { s.selections[p.id] = Object.assign(VT.store.h.selection(s, p.id), { size: el.dataset.size }); });
        app.screenEl().querySelectorAll('.pd-size').forEach((b) => { const on = b.dataset.size === el.dataset.size; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); });
      },
      colors(app) {
        const p = D().byId[pidOf(app)];
        const sel = VT.store.h.selection(app.s, p.id);
        const ov = app.sheet({
          title: '选择颜色',
          html: `<div class="opt-list">${p.colors.map((c) => `<button type="button" class="opt ${c.id === sel.color ? 'is-on' : ''}" data-act="pick" data-color="${c.id}"><i class="opt-sw" style="${VT.ui.swatchStyle(c.hex)}"></i><span class="opt-main"><span class="opt-title">${c.name}</span><span class="opt-sub">${c.id === p.colors[0].id ? '实拍图展示颜色' : '有货 · 演示原型仅展示主色实拍图'}</span></span><span class="radio"></span></button>`).join('')}</div>`,
          actions: {
            pick: (el) => {
              VT.screens.product.actions.color(app, el);
              app.closeOverlay(ov);
            },
          },
        });
      },
      guide(app) {
        const p = D().byId[pidOf(app)];
        const s = app.s;
        const rows = [['XS', 88, 64, 38, 54], ['S', 92, 66, 39, 55], ['M', 96, 68, 40, 56], ['L', 100, 70, 41, 57]];
        app.sheet({
          title: '尺码指南',
          html: `${s.avatar.status === 'ready' ? `<div class="guide-tip">${I('sparkle', { size: 18 })}<span>根据你的数字分身（身高 165cm · 胸围 84cm），推荐 <b>M 码</b>，宽松版型。</span></div>` : `<div class="guide-tip">${I('info', { size: 18 })}<span>创建数字分身后，可根据你的身材自动推荐尺码。</span></div>`}
            <table class="guide-table"><thead><tr><th>尺码</th><th>胸围</th><th>衣长</th><th>肩宽</th><th>袖长</th></tr></thead>
            <tbody>${rows.map((r) => `<tr class="${r[0] === VT.store.h.selection(s, p.id).size ? 'is-on' : ''}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</tbody></table>
            <p class="sheet-note">单位：cm，平铺测量，误差 ±1–2cm。</p>`,
        });
      },
      reviews(app) {
        const p = D().byId[pidOf(app)];
        app.sheet({
          title: `商品评价 (${p.reviews})`,
          html: `<div class="rv-sum"><b>${p.rating.toFixed(1)}</b><span>${'★★★★★'}</span><em>98% 买家认为「尺码合适」</em></div>
            <ul class="rv-list">${reviews.map((r) => `<li><div class="rv-h"><b>${r.n}</b><span>${'★'.repeat(r.s)}${'☆'.repeat(5 - r.s)}</span></div><p>${r.t}</p><em>${r.sz}</em></li>`).join('')}</ul>
            <p class="sheet-note">演示数据</p>`,
        });
      },
      brand(app) {
        const p = D().byId[pidOf(app)];
        const same = D().products.filter((x) => x.id !== p.id && x.cat === p.cat).slice(0, 3);
        const ov = app.sheet({
          title: p.brand,
          html: `<p class="sheet-lead">品牌店铺 · 演示数据。以下为同品类在售单品：</p>
            <div class="opt-list">${same.map((x) => `<button type="button" class="mini" data-act="go" data-pid="${x.id}">${VT.ui.img(x.img.card, x.name)}<span class="mini-main"><span class="mini-title">${x.name}</span><span class="mini-sub">${x.tags}</span></span>${VT.ui.price(x.price)}</button>`).join('')}</div>`,
          actions: { go: (el) => { app.closeOverlay(ov, true); app.go('product', { pid: el.dataset.pid }); } },
        });
      },
      async share(app) {
        const p = D().byId[pidOf(app)];
        const text = `${p.name} ¥${p.price} — 来自「全新的购物体验」原型`;
        if (navigator.share && !VT.framed) {
          try { await navigator.share({ title: p.name, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
        }
        try { await navigator.clipboard.writeText(text); app.toast('商品信息已复制，可粘贴分享'); }
        catch (e) { app.toast('分享面板在此浏览器不可用'); }
      },
      try(app) {
        const p = D().byId[pidOf(app)];
        tryOn(app, [p.id]);
      },
      add(app) {
        const p = D().byId[pidOf(app)];
        const sel = VT.store.h.selection(app.s, p.id);
        const color = p.colors.find((c) => c.id === sel.color) || p.colors[0];
        let isNew = false;
        VT.store.update((s) => {
          const ex = s.wardrobe.find((w) => w.p === p.id);
          if (ex) { ex.color = sel.color; ex.size = sel.size; }
          else { isNew = true; s.wardrobe.unshift({ uid: VT.store.uid('w'), p: p.id, fav: false, source: 'collected', color: sel.color, size: sel.size, addedAt: Date.now() }); }
        });
        const ov = app.sheet({
          title: isNew ? '已加入衣橱' : '已在你的衣橱中',
          html: `<div class="mini">${VT.ui.img(p.img.card, p.name)}<span class="mini-main"><span class="mini-title">${p.name}</span><span class="mini-sub">${color.name} / ${sel.size}</span></span>${VT.ui.price(p.price)}</div>
            <p class="sheet-lead" style="margin-top:12px">${isNew ? '已保存到「个人衣橱」，可随时在试衣间搭配试穿。' : '已更新为当前选择的颜色和尺码。'}</p>
            <div class="sheet-actions"><button type="button" class="btn btn--ghost btn--lg" data-act="to-wardrobe">去衣橱看看</button><button type="button" class="btn btn--dark btn--lg" data-act="buy">立即购买</button></div>`,
          actions: {
            'to-wardrobe': () => app.go('wardrobe'),
            buy: () => {
              VT.store.update((s) => { s.cart = { p: p.id, color: sel.color, size: sel.size, qty: 1 }; });
              app.go('checkout');
            },
          },
        });
        return ov;
      },
    },
  };

  function setImage(app, i) {
    const p = D().byId[pidOf(app)];
    galleryIndex[p.id] = i;
    const root = app.screenEl();
    const img = root.querySelector('.pd-hero-img');
    const src = p.gallery[i];
    img.classList.add('is-swap');
    const next = new Image();
    next.onload = next.onerror = () => {
      img.src = src;
      img.className = 'pd-hero-img fit-' + heroFit(src);
      img.alt = `${p.name}（第 ${i + 1} 张，共 ${p.gallery.length} 张）`;
    };
    next.src = src;
    root.querySelectorAll('.pd-thumb').forEach((b, k) => { b.classList.toggle('is-on', k === i); b.setAttribute('aria-selected', k === i); });
  }

  /** send garments to the fitting room, select them and jump there */
  function tryOn(app, pids) {
    const cats = D().fitCatsAll; // a garment without a render still opens its own category
    let first = null;
    VT.store.update((s) => {
      pids.forEach((pid) => {
        const p = D().byId[pid];
        if (!p) return;
        const slot = D().slotOf(p);
        s.fit.outfit[slot] = pid;
        if (slot === 'dress') { delete s.fit.outfit.top; delete s.fit.outfit.bottom; }
        if (slot === 'top' || slot === 'bottom') delete s.fit.outfit.dress;
        if (!first) first = p;
      });
      if (first) {
        const cat = cats.find((c) => c.items.includes(first.id) && (c.id !== 'upper' || ['top', 'outer'].includes(first.cat)));
        if (cat) s.fit.cat = cat.id;
      }
    });
    if (VT.store.get().avatar.status !== 'ready') {
      VT.store.update((s) => { s.avatar.status = 'ready'; s.avatar.demo = true; });
    }
    app.go('fitting');
    const { missing } = VT.fitting.pickRender(VT.store.get().fit.outfit);
    const miss = pids.filter((x) => missing.includes(x));
    app.later(() => {
      if (miss.length) app.toast(`演示版暂无「${D().byId[miss[0]].name}」的上身图，已加入当前搭配`, { ms: 3000 });
      else app.toast('已为你的数字分身换上所选单品');
    }, 420);
  }

  VT.tryOn = tryOn;
})();
