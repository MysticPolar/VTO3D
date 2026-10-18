/* 首页 — 虚拟试衣间 (primary tab 1)
   The avatar is the 2D image of the demo digital twin. Garment selection swaps
   to real on-body imagery only where it exists (base + three stylist looks);
   anything else is recorded in the outfit and flagged honestly. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  const SLOTS = ['top', 'bottom', 'dress', 'outer', 'shoes', 'bag', 'acc'];
  const EXTRA = ['outer', 'bag', 'acc', 'dress', 'shoes'];

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

  function menu(s) {
    return D().fitCats.map((c) => {
      const on = c.id === s.fit.cat;
      return `<li><button type="button" class="fit-cat ${on ? 'is-on' : ''}" data-act="cat" data-cat="${c.id}" aria-pressed="${on}">
        <span class="fit-cat-ic">${I(on ? c.icon + '-filled' : c.icon, { size: on ? 27 : 26, stroke: 1.5 })}</span><span class="fit-cat-l">${c.label}</span></button></li>`;
    }).join('');
  }

  function thumbs(s) {
    const cat = D().fitCats.find((c) => c.id === s.fit.cat) || D().fitCats[0];
    const sel = new Set(Object.values(s.fit.outfit).filter(Boolean));
    // garments without a render stay off the rail, unless one is selected (sent from
    // 商品详情, 个人衣橱 or a look): it shows until it is tapped off
    const all = D().fitCatsAll.find((c) => c.id === cat.id);
    const items = all.items.filter((pid) => cat.items.includes(pid) || sel.has(pid));
    return items.map((pid) => {
      const p = D().byId[pid];
      const on = sel.has(pid);
      return `<li><button type="button" class="fit-thumb ${on ? 'is-on' : ''}" data-act="pick" data-pid="${pid}" aria-pressed="${on}" aria-label="${on ? '取消试穿' : '试穿'}${p.name}">
        ${VT.ui.img(p.img.thumb || p.img.tile, '', 'fit-thumb-img')}${on ? `<span class="fit-check" aria-hidden="true">${I('check', { size: 11, stroke: 3 })}</span>` : ''}</button></li>`;
    }).join('');
  }

  function avatarLayers(s) {
    const { render } = pickRender(s.fit.outfit);
    return `<img class="fit-avatar-img is-cur" src="${render.img}" alt="数字分身当前造型：${render.label}" decoding="async" draggable="false" data-render="${render.id}">`;
  }

  VT.screens.fitting = {
    title: '虚拟试衣间',
    render(app) {
      const s = app.s;
      return `
        <div class="fit-plate" aria-hidden="true"></div>
        ${VT.ui.statusBar('light')}
        <div class="fit-avatar"><i class="fit-shadow" aria-hidden="true"></i>${avatarLayers(s)}</div>
        <header class="fit-head">
          <h1 class="fit-title">虚拟试衣间</h1>
          <button type="button" class="fit-cam" data-act="camera" aria-label="开启视频试衣（摄像头预览）">${I('video-filled', { size: 19 })}</button>
        </header>
        <nav class="fit-menu" aria-label="服装分类"><ul>${menu(s)}</ul></nav>
        <div class="fit-rail scroll" data-keep-scroll="rail" aria-label="可试穿单品"><ul>${thumbs(s)}</ul></div>
        ${VT.ui.tabBar('fitting')}`;
    },
    actions: {
      cat(app, el) {
        const id = el.dataset.cat;
        VT.store.update((s) => { s.fit.cat = id; });
        const root = app.screenEl();
        root.querySelector('.fit-menu ul').innerHTML = menu(app.s);
        const rail = root.querySelector('.fit-rail');
        rail.querySelector('ul').innerHTML = thumbs(app.s);
        rail.scrollTop = 0;
        const btn = root.querySelector(`.fit-cat[data-cat="${id}"]`);
        if (btn) btn.focus({ preventScroll: true });
      },
      pick(app, el) {
        const pid = el.dataset.pid;
        const p = D().byId[pid];
        const slot = D().slotOf(p);
        let added = false;
        VT.store.update((s) => {
          const o = s.fit.outfit;
          if (o[slot] === pid) { delete o[slot]; }
          else {
            o[slot] = pid; added = true;
            if (slot === 'dress') { delete o.top; delete o.bottom; }
            if (slot === 'top' || slot === 'bottom') delete o.dress;
          }
        });
        const root = app.screenEl();
        const rail = root.querySelector('.fit-rail');
        const st = rail.scrollTop;
        rail.querySelector('ul').innerHTML = thumbs(app.s);
        rail.scrollTop = st;
        const again = rail.querySelector(`.fit-thumb[data-pid="${pid}"]`);
        if (again) again.focus({ preventScroll: true });
        const { render, missing } = pickRender(app.s.fit.outfit);
        swapRender(app, render);
        if (added && missing.includes(pid)) {
          app.toast(`演示版暂无「${p.name}」的上身图，已加入当前搭配`, { ms: 2800 });
        } else if (added) {
          app.toast(`已试穿：${p.name}`);
        }
      },
      camera(app) { VT.camera.open(app); },
    },
  };

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

  VT.fitting = { pickRender };
})();
