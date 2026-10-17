/* AI 造型师 — AI Stylist (primary tab 4; scripted conversation, no LLM) */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  // item thumbnail boxes inside each look card (CSS px, relative to the card image), from the reference
  const ITEM_BOX = {
    look1: [[85.4, 11.3, 38.5], [85.4, 52.3, 49.7], [85.4, 104.7, 42.5], [85.4, 149.9, 34.8]],
    look2: [[83.6, 11.3, 34.8], [83.6, 48.4, 32.6], [83.6, 83.4, 39.8], [83.6, 125.6, 33.5], [83.6, 161.1, 32.6]],
    look3: [[81.8, 11.3, 55.6], [81.8, 69.2, 39.4], [81.8, 110.8, 38.9], [81.8, 152, 37.5]],
  };

  function userAvatar(s) {
    return `<span class="st-ava st-ava--user">${VT.ui.img(VT.ui.profilePhoto(s), '我的头像')}</span>`;
  }

  function lookCard(l, s) {
    const saved = !!s.savedLooks[l.id];
    return `<article class="look-card" aria-label="${l.name}：${l.sub}">
      <div class="look-img">
        <button type="button" class="look-open" data-act="look" data-look="${l.id}" aria-label="查看 ${l.name} 详情">${VT.ui.img(l.card, `${l.name}：模特上身效果`)}</button>
        <ul class="look-items">${l.items.map((it, i) => {
          const b = ITEM_BOX[l.id][i];
          const p = D().byId[it.p];
          return `<li style="top:${b[1]}px;height:${b[2]}px"><button type="button" data-act="item" data-pid="${it.p}" aria-label="查看单品：${p.name}">${VT.ui.img(it.img, '')}</button></li>`;
        }).join('')}</ul>
      </div>
      <div class="look-meta">
        <div class="look-h"><h3>${l.name}</h3><button type="button" class="look-save ${saved ? 'is-on' : ''}" data-act="save-look" data-look="${l.id}" aria-pressed="${saved}" aria-label="${saved ? '取消保存' : '保存'}${l.name}">${I(saved ? 'heart-filled' : 'heart', { size: 19, stroke: 1.6 })}</button></div>
        <p class="look-sub">${l.sub}</p>
        <ul class="look-tags">${l.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
      </div>
    </article>`;
  }

  function wardrobeLook(pids, s) {
    const items = pids.map((id) => D().byId[id]);
    return `<div class="st-wl">
      <div class="st-wl-grid">${items.map((p) => `<button type="button" data-act="item" data-pid="${p.id}" aria-label="查看单品：${p.name}">${VT.ui.img(p.img.tile, p.name)}</button>`).join('')}</div>
      <div class="st-wl-foot"><span>${items.map((p) => p.name).join(' + ')}</span><button type="button" class="btn btn--dark btn--sm" data-act="try-set" data-pids="${pids.join(',')}">去试衣间试穿</button></div>
    </div>`;
  }

  function message(m, s) {
    if (m.role === 'user') return `<div class="st-msg st-msg--user">${m.img ? `<div class="st-bubble st-bubble--img">${VT.ui.img(m.img, '我上传的穿搭照片')}</div>` : `<div class="st-bubble">${VT.ui.nl2br(m.text)}</div>`}${userAvatar(s)}</div>`;
    if (m.role === 'ai') return `<div class="st-msg st-msg--ai"><span class="st-ava st-ava--ai">${I('sparkle-duo', { size: 21 })}</span><div class="st-bubble">${VT.ui.nl2br(m.text)}</div></div>`;
    if (m.role === 'looks') return `<div class="st-looks ${m.looks.length === 1 ? 'is-single' : ''}">${m.looks.map((id) => lookCard(D().lookById[id], s)).join('')}</div>`;
    if (m.role === 'wardrobe') return wardrobeLook(m.pids, s);
    return '';
  }

  function thread(s) { return s.chat.map((m) => message(m, s)).join(''); }

  VT.screens.stylist = {
    title: 'AI 造型师',
    render(app) {
      const s = app.s;
      return `
        ${VT.ui.statusBar('dark')}
        <header class="st-head">
          <h1 class="st-title">AI 造型师</h1>
          ${VT.ui.iconBtn('history', '历史造型', 'history', { size: 24, stroke: 1.7, cls: 'st-hist' })}
          ${VT.ui.iconBtn('share', '分享对话', 'share', { size: 24, stroke: 1.7, cls: 'st-share' })}
        </header>
        <div class="scroll st-scroll" data-keep-scroll="st">
          <div class="st-thread" aria-live="polite">${thread(s)}</div>
          <div class="st-suggest" data-keep-scroll="st-sg" aria-label="快捷提问">${D().chatSuggestions.map((t) => `<button type="button" class="st-chip" data-act="suggest" data-text="${t}">${t}</button>`).join('')}</div>
        </div>
        <div class="st-bottom">
          <div class="st-input">
            <button type="button" class="st-plus" data-act="plus" aria-label="更多：上传照片或选择场合">${I('plus', { size: 20, stroke: 1.6 })}</button>
            <input type="text" class="st-field" placeholder="告诉我你的穿搭需求..." data-enter="send" data-focus-key="st-in" data-keep-value="st-in" aria-label="告诉我你的穿搭需求" enterkeyhint="send" maxlength="120">
            <button type="button" class="st-send" data-act="send" aria-label="发送">${I('arrow-up', { size: 20, stroke: 2 })}</button>
          </div>
        </div>
        ${VT.ui.tabBar('stylist')}`;
    },
    mount(app, el, params, o) {
      if (o && (o.refresh || o.restored)) return;
      const sc = el.querySelector('.st-scroll');
      if (app.s.chat.length > VT.data.chatSeed.length) sc.scrollTop = sc.scrollHeight;
    },
    actions: {
      send(app) {
        const input = app.screenEl().querySelector('.st-field');
        const text = (input.value || '').trim();
        if (!text) { input.focus(); app.toast('先输入你的穿搭需求吧'); return; }
        input.value = '';
        ask(app, text);
      },
      suggest(app, el) { ask(app, el.dataset.text); },
      item(app, el) { app.go('product', { pid: el.dataset.pid }); },
      'try-set'(app, el) { VT.tryOn(app, el.dataset.pids.split(',')); },
      'save-look'(app, el) {
        const id = el.dataset.look;
        let on = false;
        VT.store.update((s) => { on = !s.savedLooks[id]; if (on) s.savedLooks[id] = Date.now(); else delete s.savedLooks[id]; });
        app.screenEl().querySelectorAll(`.look-save[data-look="${id}"]`).forEach((b) => {
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on);
          b.innerHTML = I(on ? 'heart-filled' : 'heart', { size: 19, stroke: 1.6 });
        });
        app.toast(on ? '已保存到「历史造型」' : '已取消保存');
      },
      look(app, el) { openLook(app, el.dataset.look); },
      history(app) {
        const s = app.s;
        const saved = Object.keys(s.savedLooks).sort((a, b) => s.savedLooks[b] - s.savedLooks[a]).map((id) => D().lookById[id]);
        const ov = app.sheet({
          title: '历史造型',
          html: `<h4 class="st-sh-h">已保存的造型</h4>
            ${saved.length ? `<div class="st-saved">${saved.map((l) => `<button type="button" data-act="open" data-look="${l.id}">${VT.ui.img(l.card, l.name)}<span><b>${l.name}</b><em>${l.sub}</em></span></button>`).join('')}</div>` : '<p class="st-sh-empty">点击造型卡片上的 ♡ 即可保存</p>'}
            <h4 class="st-sh-h">最近的对话</h4>
            <ul class="st-hist-list"><li><b>朋友聚会穿搭</b><span>今天</span></li><li><b>一周通勤穿搭</b><span>10月12日</span></li><li><b>周末出游怎么穿</b><span>10月6日</span></li></ul>
            <p class="sheet-note">演示数据</p>`,
          actions: { open: (b) => { app.closeOverlay(ov, true); openLook(app, b.dataset.look); } },
        });
      },
      async share(app) {
        const text = 'AI 造型师为我推荐了 3 套朋友聚会造型：休闲时髦 / 摩登气质 / 优雅迷人';
        if (navigator.share && !VT.framed) { try { await navigator.share({ title: 'AI 造型师', text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
        try { await navigator.clipboard.writeText(text); app.toast('对话摘要已复制'); } catch (e) { app.toast('分享面板在此浏览器不可用'); }
      },
      plus(app) {
        const ov = app.sheet({
          title: '更多',
          html: `<label class="btn btn--ghost btn--lg btn--block st-up">${I('image', { size: 20 })}上传一张穿搭照片
              <input class="sr-only" type="file" accept="image/*" data-change="photo"></label>
            <h4 class="st-sh-h">按场合推荐</h4>
            <div class="st-occ">${['周末出游', '上班通勤', '晚餐约会', '降温保暖'].map((t) => `<button type="button" class="chip" data-act="occ" data-text="${t}">${t}</button>`).join('')}</div>`,
          actions: {
            occ: (b) => { app.closeOverlay(ov, true); ask(app, `${b.dataset.text}穿什么好？`); },
            photo: (el) => {
              const f = el.files && el.files[0];
              if (!f) return;
              if (!f.type.startsWith('image/')) { app.toast('请选择图片文件'); return; }
              const r = new FileReader();
              r.onload = () => shrink(r.result, (src) => {
                app.closeOverlay(ov, true);
                push(app, { role: 'user', img: src });
                reply(app, { text: '照片收到啦！这套搭配的配色很协调。演示版无法真正识别照片内容，\n我先按「朋友聚会」场景给你一个参考：叠穿一件西装外套会更有质感。', looks: ['look2'] });
              });
              r.readAsDataURL(f);
            },
          },
        });
      },
    },
  };

  function shrink(dataUrl, cb) {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 420 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      cb(cv.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => cb(dataUrl);
    img.src = dataUrl;
  }

  function push(app, msg) {
    VT.store.update((s) => { s.chat.push(msg); if (s.chat.length > 60) s.chat.splice(4, s.chat.length - 60); });
    const sc = app.screenEl().querySelector('.st-scroll');
    if (!sc) return;
    sc.querySelector('.st-thread').insertAdjacentHTML('beforeend', message(msg, app.s));
    sc.scrollTo({ top: sc.scrollHeight, behavior: VT.reducedMotion() ? 'auto' : 'smooth' });
  }

  function ask(app, text) {
    push(app, { role: 'user', text });
    const r = D().chatReplies.find((x) => x.k.some((k) => text.includes(k)));
    reply(app, r || { text: D().chatFallback });
  }

  function reply(app, r) {
    const sc = app.screenEl().querySelector('.st-scroll');
    const typing = document.createElement('div');
    typing.className = 'st-msg st-msg--ai st-typing';
    typing.innerHTML = `<span class="st-ava st-ava--ai">${I('sparkle-duo', { size: 21 })}</span><div class="st-bubble"><i></i><i></i><i></i><span class="sr-only">AI 造型师正在输入</span></div>`;
    sc.querySelector('.st-thread').appendChild(typing);
    sc.scrollTo({ top: sc.scrollHeight, behavior: VT.reducedMotion() ? 'auto' : 'smooth' });
    app.later(() => {
      typing.remove();
      if (app.cur.id !== 'stylist') {
        VT.store.update((s) => { s.chat.push({ role: 'ai', text: r.text }); if (r.looks) s.chat.push({ role: 'looks', looks: r.looks }); if (r.wardrobeLook) s.chat.push({ role: 'wardrobe', pids: r.wardrobeLook }); });
        return;
      }
      push(app, { role: 'ai', text: r.text });
      if (r.looks) push(app, { role: 'looks', looks: r.looks });
      if (r.wardrobeLook) push(app, { role: 'wardrobe', pids: r.wardrobeLook });
    }, VT.reducedMotion() ? 200 : 1100);
  }

  function openLook(app, id) {
    const l = D().lookById[id];
    const s = app.s;
    const total = l.items.reduce((n, it) => n + D().byId[it.p].price, 0);
    const ov = app.sheet({
      title: `${l.name} · ${l.sub}`,
      full: true,
      html: `<div class="lk-hero">${VT.ui.img(l.card, `${l.name} 上身效果`)}</div>
        <ul class="lk-items">${l.items.map((it) => { const p = D().byId[it.p]; const own = VT.store.h.inWardrobe(s, p.id); return `<li><button type="button" class="mini" data-act="item" data-pid="${p.id}">${VT.ui.img(p.img.card, p.name)}<span class="mini-main"><span class="mini-title">${p.name}</span><span class="mini-sub">${own ? '衣橱已有' : p.tags}</span></span>${VT.ui.price(p.price)}</button></li>`; }).join('')}</ul>
        <p class="lk-total">整套参考价 <b>${VT.ui.yuan(total)}</b></p>
        <div class="sheet-actions"><button type="button" class="btn btn--ghost btn--lg" data-act="save">${s.savedLooks[id] ? '已保存' : '保存搭配'}</button><button type="button" class="btn btn--dark btn--lg" data-act="try">去试衣间试穿</button></div>`,
      actions: {
        item: (el) => app.go('product', { pid: el.dataset.pid }),
        try: () => VT.tryOn(app, l.items.map((it) => it.p)),
        save: (el) => {
          VT.store.update((st) => { st.savedLooks[id] = st.savedLooks[id] || Date.now(); });
          el.textContent = '已保存';
          app.screenEl().querySelectorAll(`.look-save[data-look="${id}"]`).forEach((b) => { b.classList.add('is-on'); b.innerHTML = I('heart-filled', { size: 19, stroke: 1.6 }); });
          app.toast('已保存到「历史造型」');
        },
      },
    });
    return ov;
  }
})();
