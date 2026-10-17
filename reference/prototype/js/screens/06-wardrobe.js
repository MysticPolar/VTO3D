/* 个人衣橱 — My Wardrobe (primary tab 3) */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  let searchOpen = false;
  let query = '';

  const SRC_LABEL = { collected: '已收藏', purchased: '已购买', uploaded: '我上传的' };

  function itemOf(w) {
    if (w.custom) return { id: w.uid, name: w.custom.name, cat: w.custom.cat, img: { tile: w.custom.src }, custom: true };
    return D().byId[w.p];
  }

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

  function grid(s) {
    const items = visible(s);
    if (!items.length) {
      return `<div class="wr-empty">${I('hanger', { size: 34, stroke: 1.3 })}<p>${query ? '没有找到匹配的单品' : '这个分类还没有衣服'}</p><button type="button" class="btn btn--ghost btn--sm" data-act="add-open">添加衣物</button></div>`;
    }
    return `<ul class="wr-grid">${items.map((w) => {
      const p = itemOf(w);
      const fav = !!w.fav;
      const pending = s.tryQueue.includes(w.uid);
      return `<li class="wr-tile ${pending ? 'is-picked' : ''}">
        <button type="button" class="wr-open" data-act="item" data-uid="${w.uid}" aria-label="${p.name}${SRC_LABEL[w.source] ? '，' + SRC_LABEL[w.source] : ''}">${VT.ui.img(p.img.tile, '', w.custom ? 'is-custom' : '', 'loading="lazy"')}</button>
        <button type="button" class="heart-btn wr-heart ${fav ? 'is-on' : ''}" data-act="fav-item" data-uid="${w.uid}" aria-pressed="${fav}" aria-label="${fav ? '取消喜欢' : '标记喜欢'}：${p.name}">${I(fav ? 'heart-filled' : 'heart', { size: 21, stroke: 1.6 })}</button>
        ${SRC_LABEL[w.source] ? `<span class="wr-src">${SRC_LABEL[w.source]}</span>` : ''}
        ${pending ? `<span class="wr-pick" aria-hidden="true">${I('check', { size: 12, stroke: 3 })}</span>` : ''}
      </li>`;
    }).join('')}</ul>`;
  }

  function queueBar(s) {
    const n = s.tryQueue.length;
    return n ? `<div class="wr-queue"><span>已选 ${n} 件</span><button type="button" class="wr-queue-clear" data-act="queue-clear">清空</button><button type="button" class="btn btn--dark btn--sm" data-act="queue-go">去试衣间${I('arrow-right', { size: 16, stroke: 1.8 })}</button></div>` : '';
  }

  VT.screens.wardrobe = {
    title: '个人衣橱',
    render(app) {
      const s = app.s;
      return `
        ${VT.ui.statusBar('dark')}
        <header class="wr-head">
          <h1 class="wr-title">个人衣橱</h1>
          ${VT.ui.iconBtn('search', '搜索衣橱', 'search-toggle', { size: 26, stroke: 1.7, cls: 'wr-search-btn', attrs: `aria-expanded="${searchOpen}"` })}
          <button type="button" class="icon-btn wr-add-btn" data-act="add-open" aria-label="添加衣物"><span class="wr-plus">${I('plus', { size: 17, stroke: 2 })}</span></button>
        </header>
        ${searchOpen ? `<div class="wr-searchbar"><label>${I('search', { size: 17 })}<input type="search" placeholder="搜索衣橱里的单品" value="${VT.esc(query)}" data-input="q" data-focus-key="wr-q" aria-label="搜索衣橱" enterkeyhint="search"></label></div>` : ''}
        <div class="wr-tabs" role="tablist" aria-label="衣橱分类" data-keep-scroll="wr-tabs">
          ${D().wardrobeCats.map((c) => `<button type="button" role="tab" class="wr-tab ${c.id === s.wardrobeCat ? 'is-on' : ''}" aria-selected="${c.id === s.wardrobeCat}" data-act="cat" data-cat="${c.id}">${c.label}</button>`).join('')}
        </div>
        <div class="scroll wr-scroll" data-keep-scroll="wr">${grid(s)}</div>
        ${queueBar(s)}
        ${VT.ui.tabBar('wardrobe')}`;
    },
    mount(app, el) {
      if (searchOpen) {
        const i = el.querySelector('.wr-searchbar input');
        if (i && document.activeElement !== i) i.focus({ preventScroll: true });
      }
    },
    actions: {
      cat(app, el) {
        VT.store.update((s) => { s.wardrobeCat = el.dataset.cat; });
        const root = app.screenEl();
        root.querySelectorAll('.wr-tab').forEach((t) => { const on = t.dataset.cat === el.dataset.cat; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); });
        const sc = root.querySelector('.wr-scroll');
        sc.innerHTML = grid(app.s);
        sc.scrollTop = 0;
      },
      'search-toggle'(app) {
        searchOpen = !searchOpen;
        if (!searchOpen) query = '';
        app.refresh();
      },
      q(app, el) {
        query = el.value;
        app.screenEl().querySelector('.wr-scroll').innerHTML = grid(app.s);
      },
      'fav-item'(app, el) {
        let on = false;
        VT.store.update((s) => { const w = s.wardrobe.find((x) => x.uid === el.dataset.uid); if (w) { w.fav = !w.fav; on = w.fav; } });
        el.classList.toggle('is-on', on);
        el.setAttribute('aria-pressed', on);
        el.innerHTML = I(on ? 'heart-filled' : 'heart', { size: 21, stroke: 1.6 });
        el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      },
      item(app, el) {
        const s = app.s;
        const w = s.wardrobe.find((x) => x.uid === el.dataset.uid);
        if (!w) return;
        const p = itemOf(w);
        const color = !w.custom && w.color ? (p.colors.find((c) => c.id === w.color) || {}).name : null;
        const queued = s.tryQueue.includes(w.uid);
        const ov = app.sheet({
          title: p.name,
          html: `<div class="wr-sheet-img">${VT.ui.img(w.custom ? p.img.tile : (p.img.hd || p.img.tile), p.name)}</div>
            <p class="wr-sheet-meta">${[SRC_LABEL[w.source] || '我的衣物', color, w.size].filter(Boolean).join(' · ')}</p>
            <div class="wr-sheet-actions">
              <button type="button" class="btn btn--dark btn--lg" data-act="try">${I('dress', { size: 20 })}试穿这件</button>
              <button type="button" class="btn btn--ghost btn--lg" data-act="queue">${queued ? '移出搭配' : '加入试衣搭配'}</button>
              ${w.custom ? '' : `<button type="button" class="btn btn--ghost btn--lg" data-act="detail">查看商品详情</button>`}
              ${w.source !== 'owned' ? `<button type="button" class="btn btn--lg wr-remove" data-act="remove">${I('trash', { size: 18 })}移出衣橱</button>` : ''}
            </div>
            ${w.custom ? '<p class="sheet-note">自己上传的衣物暂不支持上身试穿（演示版）</p>' : ''}`,
          actions: {
            try: () => {
              if (w.custom) { app.toast('演示版暂不支持上传衣物的上身效果'); return; }
              app.closeOverlay(ov, true);
              VT.tryOn(app, [p.id]);
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
            remove: async () => {
              const ok = await app.dialog({ title: '移出衣橱？', text: `「${p.name}」将从你的衣橱中移除。`, ok: '移出' });
              if (!ok) return;
              VT.store.update((st) => { st.wardrobe = st.wardrobe.filter((x) => x.uid !== w.uid); st.tryQueue = st.tryQueue.filter((u) => u !== w.uid); });
              app.closeOverlay(ov);
              app.refresh();
              app.toast('已移出衣橱');
            },
          },
        });
      },
      'queue-go'(app) {
        const s = app.s;
        const pids = s.tryQueue.map((u) => s.wardrobe.find((w) => w.uid === u)).filter((w) => w && !w.custom).map((w) => w.p);
        VT.store.update((st) => { st.tryQueue = []; });
        if (!pids.length) { app.toast('所选衣物暂不支持试穿'); app.refresh(); return; }
        VT.tryOn(app, pids);
      },
      'queue-clear'(app) {
        VT.store.update((st) => { st.tryQueue = []; });
        app.refresh();
      },
      'add-open'(app) {
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
                drop.querySelector('.wr-drop-in').innerHTML = `<img src="${picked.src}" alt="待添加的衣物照片预览"><span class="wr-drop-ok">${I('check', { size: 12, stroke: 3 })}已选择：${VT.esc(f.name.slice(0, 18))}</span>`;
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
      },
    },
  };

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
