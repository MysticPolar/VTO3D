/* 我的收藏 (favorites) and 浏览记录 (history) — secondary screens from 我的 */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  let favTab = 'items';

  function productCard(p, s) {
    return `<li class="fv-card">
      <button type="button" class="fv-open" data-act="nav" data-to="product" data-pid="${p.id}" aria-label="查看 ${p.name}，¥${p.price}"></button>
      <div class="fv-img ${p.small ? 'is-small' : ''}">${VT.ui.img(p.img.card, p.name, '', 'loading="lazy"')}</div>
      ${VT.ui.heart(p.id, VT.store.h.isFav(s, p.id), { cls: 'fv-heart', size: 21, stroke: 1.6 })}
      <div class="fv-meta"><h3>${p.cardName}</h3>${VT.ui.price(p.price, 'fv-price')}</div>
    </li>`;
  }

  VT.screens.favorites = {
    title: '我的收藏',
    render(app) {
      const s = app.s;
      const items = Object.keys(s.favorites).filter((id) => s.favorites[id] && D().byId[id]).map((id) => D().byId[id]);
      const looks = Object.keys(s.savedLooks).sort((a, b) => s.savedLooks[b] - s.savedLooks[a]).map((id) => D().lookById[id]).filter(Boolean);
      const tabs = [['items', `单品 ${items.length}`], ['looks', `造型 ${looks.length}`]];
      return `
        ${VT.ui.subHead('我的收藏')}
        <div class="fv-seg"><div class="seg" role="tablist" aria-label="收藏分类">${tabs.map(([id, l]) => `<button type="button" role="tab" class="${favTab === id ? 'is-on' : ''}" aria-selected="${favTab === id}" data-act="ftab" data-v="${id}">${l}</button>`).join('')}</div></div>
        <div class="scroll sub-scroll" data-keep-scroll="fv">
          ${favTab === 'items'
            ? (items.length ? `<ul class="fv-grid">${items.map((p) => productCard(p, s)).join('')}</ul>` : `<div class="ol-empty">${I('heart', { size: 32, stroke: 1.3 })}<p>还没有收藏的单品</p><button type="button" class="btn btn--ghost btn--sm" data-act="shop">去购物广场逛逛</button></div>`)
            : (looks.length ? `<ul class="fv-looks">${looks.map((l) => `<li class="set-card fv-look">${VT.ui.img(l.card, `${l.name} 上身效果`)}<div><b>${l.name}</b><span>${l.sub}</span><button type="button" class="btn btn--dark btn--sm" data-act="trylook" data-look="${l.id}">去试衣间试穿</button></div></li>`).join('')}</ul>` : `<div class="ol-empty">${I('sparkle', { size: 32, stroke: 1.3 })}<p>在 AI 造型师里点 ♡ 保存造型</p><button type="button" class="btn btn--ghost btn--sm" data-act="stylist">去问问 AI 造型师</button></div>`)}
        </div>`;
    },
    actions: {
      ftab(app, el) { favTab = el.dataset.v; app.refresh(); },
      fav(app, el) {
        const pid = el.dataset.pid;
        VT.store.update((s) => { s.favorites[pid] = !s.favorites[pid]; });
        app.refresh();
        app.toast(app.s.favorites[pid] ? '已收藏' : '已取消收藏');
      },
      trylook(app, el) { VT.tryOn(app, D().lookById[el.dataset.look].items.map((it) => it.p)); },
      shop(app) { app.go('plaza'); },
      stylist(app) { app.go('stylist'); },
    },
  };

  VT.screens.history = {
    title: '浏览记录',
    render(app) {
      const list = (app.s.history || []).filter((h) => D().byId[h.p]);
      const groups = [];
      list.forEach((h) => {
        const day = h.t.split(' ')[0];
        let g = groups.find((x) => x.day === day);
        if (!g) groups.push((g = { day, items: [] }));
        g.items.push(h);
      });
      return `
        ${VT.ui.subHead('浏览记录', list.length ? '<button type="button" class="sub-act" data-act="clear">清空</button>' : '')}
        <div class="scroll sub-scroll" data-keep-scroll="hs">
          ${groups.length ? groups.map((g) => `<section class="set-group"><h2 class="set-h">${g.day}</h2><div class="set-card">${g.items.map((h) => {
            const p = D().byId[h.p];
            return `<button type="button" class="hs-row" data-act="nav" data-to="product" data-pid="${p.id}"><span class="hs-img">${VT.ui.img(p.img.card, '')}</span><span class="set-main"><span class="set-label">${p.name}</span><span class="set-sub">${p.tags}</span></span>${VT.ui.price(p.price, 'hs-price')}</button>`;
          }).join('')}</div></section>`).join('') : `<div class="ol-empty">${I('history', { size: 32, stroke: 1.3 })}<p>暂无浏览记录</p><button type="button" class="btn btn--ghost btn--sm" data-act="shop">去购物广场逛逛</button></div>`}
        </div>`;
    },
    actions: {
      async clear(app) {
        const ok = await app.dialog({ title: '清空浏览记录？', ok: '清空' });
        if (!ok) return;
        VT.store.update((s) => { s.history = []; });
        app.refresh();
        app.toast('浏览记录已清空');
      },
      shop(app) { app.go('plaza'); },
    },
  };
})();
