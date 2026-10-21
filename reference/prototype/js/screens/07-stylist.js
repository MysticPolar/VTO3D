/* AI 造型师 — AI Stylist (primary tab 4; scripted conversation, no LLM)
   It styles from the active person's garments (VT.garments) and knows what they own:
   用我现有的衣服… uses owned garments only and says what's missing; a 购物广场 product or
   a photo they took is styled with what they own first. Products to buy come apart, under
   the outfit (可以单独购买的单品). Every garment card shows ✓ when the person owns it. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  const G = () => VT.garments;
  const esc = (x) => VT.esc(x);
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
          const own = G().ownsProduct(s, it.p);
          return `<li style="top:${b[1]}px;height:${b[2]}px"><button type="button" data-act="item" data-pid="${it.p}" aria-label="查看单品：${p.name}${own ? '，已拥有' : ''}">${VT.ui.img(it.img, '')}${VT.ui.ownMark(own)}</button></li>`;
        }).join('')}</ul>
      </div>
      <div class="look-meta">
        <div class="look-h"><h3>${l.name}</h3><button type="button" class="look-save ${saved ? 'is-on' : ''}" data-act="save-look" data-look="${l.id}" aria-pressed="${saved}" aria-label="${saved ? '取消保存' : '保存'}${l.name}">${I(saved ? 'heart-filled' : 'heart', { size: 19, stroke: 1.6 })}</button></div>
        <p class="look-sub">${l.sub}</p>
        <ul class="look-tags">${l.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
      </div>
    </article>`;
  }

  /** a garment in a reply: a product (✓ when the active person owns it) or one of their garment photos */
  function pieceOf(s, r) {
    if (r.startsWith('up:')) {
      const g = G().fromRef(s, r);
      return g && { ref: G().ref(g), photo: true, name: g.custom.name, src: g.custom.src, owned: g.isOwned };
    }
    const p = D().byId[r];
    return p && { ref: r, name: p.name, src: p.img.tile, owned: G().ownsProduct(s, r) };
  }

  /** an outfit: product ids, or up:<uid> for a photo (a photo that's gone is left out) */
  function wardrobeLook(refs, s) {
    const items = refs.map((r) => pieceOf(s, r)).filter(Boolean);
    if (!items.length) return '';
    return `<div class="st-wl">
      <div class="st-wl-grid">${items.map((x) => {
        const label = `${esc(x.name)}${x.owned ? '，已拥有' : ''}`;
        const body = VT.ui.img(x.src, x.name) + VT.ui.ownMark(x.owned);
        return x.photo ? `<span role="img" aria-label="${label}">${body}</span>` : `<button type="button" data-act="item" data-pid="${x.ref}" aria-label="查看单品：${label}">${body}</button>`;
      }).join('')}</div>
      <div class="st-wl-foot"><span>${items.map((x) => esc(x.name)).join(' + ')}</span><button type="button" class="btn btn--dark btn--sm" data-act="try-set" data-pids="${items.map((x) => x.ref).join(',')}">去试衣间试穿</button></div>
    </div>`;
  }

  /** 可以单独购买的单品: products to buy, apart from the outfit */
  function buyRow(pids, s) {
    const items = pids.map((id) => D().byId[id]).filter(Boolean);
    if (!items.length) return '';
    return `<ul class="st-buy" aria-label="可以单独购买的单品">${items.map((p) => {
      const own = G().ownsProduct(s, p.id);
      return `<li><button type="button" data-act="item" data-pid="${p.id}" aria-label="查看商品：${p.name}，¥${p.price}${own ? '，已拥有' : ''}">${VT.ui.img(p.img.tile, '')}${VT.ui.ownMark(own)}</button></li>`;
    }).join('')}</ul>`;
  }

  function message(m, s) {
    if (m.role === 'user') {
      const photo = m.img && VT.media.src(m.img); // kept on this device (js/media.js)
      if (m.img && !photo) return ''; // not loaded yet at start-up, or no longer on this device
      return `<div class="st-msg st-msg--user">${photo ? `<div class="st-bubble st-bubble--img">${VT.ui.img(photo, '我上传的穿搭照片')}</div>` : `<div class="st-bubble">${VT.ui.nl2br(m.text)}</div>`}${userAvatar(s)}</div>`;
    }
    if (m.role === 'ai') return `<div class="st-msg st-msg--ai"><span class="st-ava st-ava--ai">${I('sparkle-duo', { size: 21 })}</span><div class="st-bubble">${VT.ui.nl2br(m.text)}</div></div>`;
    if (m.role === 'looks') return `<div class="st-looks ${m.looks.length === 1 ? 'is-single' : ''}">${m.looks.map((id) => lookCard(D().lookById[id], s)).join('')}</div>`;
    if (m.role === 'wardrobe') return wardrobeLook(m.pids, s);
    if (m.role === 'buy') return buyRow(m.pids, s);
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
              shrink(f, async (blob) => {
                const img = { media: await VT.media.put(blob) };
                app.closeOverlay(ov, true);
                push(app, { role: 'user', img });
                reply(app, { text: '照片收到啦！这套搭配的配色很协调。演示版无法真正识别照片内容，\n我先按「朋友聚会」场景给你一个参考：叠穿一件西装外套会更有质感。', looks: ['look2'] });
              });
            },
          },
        });
      },
    },
  };

  /** a JPEG of at most 420 px; a file the browser can't decode is kept as it is */
  function shrink(file, cb) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 420 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob((blob) => cb(blob || file), 'image/jpeg', 0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(url); cb(file); };
    img.src = url;
  }

  function push(app, msg) {
    let gone = [];
    VT.store.update((s) => { s.chat.push(msg); if (s.chat.length > 60) gone = s.chat.splice(4, s.chat.length - 60); });
    VT.media.remove(gone.map((m) => m.img && m.img.media)); // photos of the messages that fell out
    const sc = app.screenEl().querySelector('.st-scroll');
    if (!sc) return;
    sc.querySelector('.st-thread').insertAdjacentHTML('beforeend', message(msg, app.s));
    sc.scrollTo({ top: sc.scrollHeight, behavior: VT.reducedMotion() ? 'auto' : 'smooth' });
  }

  function ask(app, text) {
    push(app, { role: 'user', text });
    const r = D().chatReplies.find((x) => x.k.some((k) => text.includes(k)));
    reply(app, r && r.plan ? { msgs: plan(app.s, r.plan, text) } : r || { text: D().chatFallback });
  }

  /** a scripted reply as messages: its text, then its look cards or outfit */
  function messagesOf(r) {
    if (r.msgs) return r.msgs;
    return [{ role: 'ai', text: r.text }].concat(r.looks ? [{ role: 'looks', looks: r.looks }] : [], r.wardrobeLook ? [{ role: 'wardrobe', pids: r.wardrobeLook }] : []);
  }

  function reply(app, r) {
    const sc = app.screenEl().querySelector('.st-scroll');
    const typing = document.createElement('div');
    typing.className = 'st-msg st-msg--ai st-typing';
    typing.innerHTML = `<span class="st-ava st-ava--ai">${I('sparkle-duo', { size: 21 })}</span><div class="st-bubble"><i></i><i></i><i></i><span class="sr-only">AI 造型师正在输入</span></div>`;
    sc.querySelector('.st-thread').appendChild(typing);
    sc.scrollTo({ top: sc.scrollHeight, behavior: VT.reducedMotion() ? 'auto' : 'smooth' });
    const msgs = messagesOf(r);
    app.later(() => {
      typing.remove();
      if (app.cur.id !== 'stylist') {
        VT.store.update((s) => { msgs.forEach((m) => s.chat.push(m)); });
        return;
      }
      msgs.forEach((m) => push(app, m));
    }, VT.reducedMotion() ? 200 : 1100);
  }

  /* ---------- outfits from the active person's garments ---------- */
  const SLOT_NAME = { top: '上衣', bottom: '下装', dress: '连衣裙', outer: '外套', shoes: '鞋子', bag: '包包' };
  const OUTFIT = ['outer', 'top', 'dress', 'bottom', 'shoes', 'bag'];
  const OCCASIONS = {
    work: { k: ['通勤', '上班', '正式', '会议', '面试', '职场'], like: ['西装', '衬衫', '西裤', '通勤', '职场', '利落', '知性', '质感'], label: '通勤装' },
    date: { k: ['约会', '聚会', '晚餐', '派对'], like: ['裙', '优雅', '约会', '温柔', '气质', '缎面', '细跟', '法式'], label: '约会穿搭' },
    casual: { k: ['休闲', '周末', '日常', '咖啡', '出游', '旅行', '轻松'], like: ['T恤', '牛仔', '针织', '休闲', '百搭', '日常', '板鞋', '卫衣', '舒适'], label: '休闲穿搭' },
  };
  /** garment words, longest first where one contains another */
  const NOUNS = [['连衣裙', 'dress'], ['裙', 'bottom'], ['裤', 'bottom'], ['衬衫', 'top'], ['T恤', 'top'], ['背心', 'top'], ['毛衣', 'top'], ['针织衫', 'top'], ['卫衣', 'top'], ['上衣', 'top'],
    ['外套', 'outer'], ['西装', 'outer'], ['大衣', 'outer'], ['夹克', 'outer'], ['开衫', 'outer'], ['鞋', 'shoes'], ['包', 'bag'], ['耳饰', 'acc'], ['配饰', 'acc']];
  const COLORS = ['蓝', '白', '黑', '米', '棕', '灰', '驼', '咖', '燕麦', '焦糖', '金'];

  const occasionOf = (text) => Object.keys(OCCASIONS).find((id) => OCCASIONS[id].k.some((k) => text.includes(k))) || null;
  const nounOf = (text) => NOUNS.find(([w]) => text.includes(w)) || null;
  const ai = (text) => ({ role: 'ai', text });
  const outfitMsg = (items) => ({ role: 'wardrobe', pids: items.map((x) => x.ref) });
  const buyMsg = (pids) => ({ role: 'buy', pids });
  const andJoin = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join('、') + '和' + a[a.length - 1]);
  const quoted = (list) => andJoin(list.map((x) => `「${x.name}」`));
  /** 你, or the person being dressed (切换角色) */
  function whoOf(s) {
    const A = VT.store.avatars, rec = A.active(s);
    return rec.self ? '你' : `「${A.nameOf(s, rec)}」`;
  }

  /** a garment as the planner sees it */
  function piece(g) {
    const p = G().product(g);
    return { ref: G().ref(g), slot: G().catOf(g), name: G().nameOf(g), owned: !!g.isOwned, text: G().nameOf(g) + (p ? p.tags : '') };
  }

  /** dress (or top + bottom), outer layer, shoes and bag: owned pieces first, then those suiting the occasion */
  function compose(pool, focal, occ) {
    const like = occ ? OCCASIONS[occ].like : [];
    const score = (x) => like.filter((k) => x.text.includes(k)).length;
    const best = (slot) => pool.filter((x) => x.slot === slot && (!focal || x.ref !== focal.ref)).sort((a, b) => (b.owned - a.owned) || (score(b) - score(a)))[0] || null;
    const pick = {};
    if (focal) pick[focal.slot] = focal;
    const dress = pick.dress || (!pick.top && !pick.bottom && occ === 'date' ? best('dress') : null);
    if (dress) pick.dress = dress;
    else {
      if (!pick.top) pick.top = best('top');
      if (!pick.bottom) pick.bottom = best('bottom');
      const keepsTop = focal && ['top', 'bottom'].includes(focal.slot);
      if (!keepsTop && !(pick.top && pick.bottom) && best('dress')) { pick.dress = best('dress'); delete pick.top; delete pick.bottom; }
    }
    ['outer', 'shoes', 'bag'].forEach((slot) => { if (!pick[slot]) pick[slot] = best(slot); });
    const items = OUTFIT.map((slot) => pick[slot]).filter(Boolean);
    if (focal && !OUTFIT.includes(focal.slot)) items.push(focal);
    const missing = (pick.dress ? [] : ['top', 'bottom'].filter((k) => !pick[k])).concat(pick.shoes ? [] : ['shoes']);
    return { items, missing };
  }

  /** products to buy for what's missing: ones the person saved first, never ones they own */
  function suggest(s, slots, occ, not) {
    const like = occ ? OCCASIONS[occ].like : [];
    const score = (p) => like.filter((k) => (p.name + p.tags).includes(k)).length;
    const savedOf = (p) => (G().ofProduct(s, p.id) ? 1 : 0);
    const per = Math.max(1, Math.floor(4 / slots.length));
    const out = [];
    slots.forEach((slot) => {
      const list = D().plazaOrder.map((id) => D().byId[id]).filter((p) => p && p.cat === slot && !G().ownsProduct(s, p.id) && !(not || []).includes(p.id));
      out.push(...list.sort((a, b) => (savedOf(b) - savedOf(a)) || (score(b) - score(a))).slice(0, per));
    });
    return out.slice(0, 4).map((p) => p.id);
  }

  function plan(s, kind, text) {
    if (!s.privacy.wardrobeAI) return [ai('你在设置里关闭了「允许 AI 造型师读取衣橱」，我暂时看不到你的衣服。\n可以在「设置 → 隐私与安全」中重新开启。')];
    return (kind === 'upload' ? uploadPlan : kind === 'focal' ? focalPlan : ownedPlan)(s, text, occasionOf(text), whoOf(s));
  }

  /** 用我现有的衣服…: only what the person owns; if that's not enough, say so, and products to buy come apart */
  function ownedPlan(s, text, occ, who) {
    const pool = G().saved(s).filter((g) => g.isOwned).map(piece);
    if (!pool.length) {
      return [ai(`${who}的衣橱里还没有标记为「已拥有」的衣服，我暂时没法只用已拥有的衣服来搭配。\n可以在个人衣橱里打开一件衣服，选择「标记为已拥有」。\n也可以先看看这些单品（需要另外购买）：`), buyMsg(suggest(s, ['top', 'bottom', 'shoes'], occ))];
    }
    const { items, missing } = compose(pool, null, occ);
    const label = occ ? OCCASIONS[occ].label : '';
    const need = andJoin(missing.map((k) => SLOT_NAME[k]));
    if (missing.some((k) => k !== 'shoes')) {
      return [ai(`只用${who}已拥有的衣服，还搭不出完整的一套${label}：还缺少${need}。\n已拥有的单品放在下面，缺少的可以看看这些（需要另外购买）。`)]
        .concat(items.length ? [outfitMsg(items)] : [], [buyMsg(suggest(s, missing, occ))]);
    }
    const msgs = [ai(`好的，我只用${who}已拥有的衣服搭了一套${label}：\n${items.map((x) => x.name).join(' + ')}。\n这几件都已拥有，可以直接去试衣间试穿。`), outfitMsg(items)];
    if (missing.length) msgs.push(ai(`${who}已拥有的衣服里还没有${need}，可以看看这些（需要另外购买）：`), buyMsg(suggest(s, missing, occ)));
    return msgs;
  }

  /** the 购物广场 product a sentence means: its garment word and colour, one the person saved or viewed */
  function findProduct(s, text) {
    const noun = nounOf(text);
    const color = COLORS.find((c) => text.includes(c));
    const seen = (s.history || []).map((h) => h.p);
    const score = (p) => (noun ? (p.name.includes(noun[0]) ? 4 : p.cat === noun[1] ? 2 : 0) : 0)
      + (color ? (p.name.includes(color) ? 3 : p.colors[0].name.includes(color) ? 2 : p.colors.some((c) => c.name.includes(color)) ? 1 : 0) : 0)
      + (G().ofProduct(s, p.id) && !G().ownsProduct(s, p.id) ? 1 : 0) + (seen.includes(p.id) ? 1 : 0);
    const order = (p) => { const i = seen.indexOf(p.id); return i < 0 ? 99 : i; };
    const top = D().products.slice().sort((a, b) => (score(b) - score(a)) || (order(a) - order(b)))[0];
    if (noun || color) return top;
    return seen.length ? D().byId[seen[0]] : null; // 这件 alone: the product viewed last
  }

  /** 帮我搭配这件…: the product is the focus, the person's own garments (owned first) go with it */
  function focalPlan(s, text, occ, who) {
    const p = findProduct(s, text);
    if (!p) return [ai('我没找到你说的这件单品。可以在购物广场打开它的商品详情，再来问我怎么搭配。')];
    const focal = { ref: p.id, slot: p.cat, name: p.name, owned: G().ownsProduct(s, p.id), text: p.name + p.tags };
    const { items, missing } = compose(G().saved(s).filter((g) => g.p !== p.id).map(piece), focal, occ);
    const others = items.filter((x) => x !== focal);
    const toBuy = items.filter((x) => !x.owned);
    let t = `以「${p.name}」为主角，` + (others.length ? `从${who}的衣橱里挑了${andJoin(others.map((x) => x.name))}来搭配：` : '先放在下面：');
    if (!toBuy.length) t += '\n这几件都已拥有。';
    else if (toBuy.length === items.length) t += '\n这几件都还没有标记为已拥有。';
    else t += `\n其中${quoted(toBuy)}需要另外购买，其余都是${who}已拥有的。`;
    const msgs = [ai(t), outfitMsg(items)];
    if (missing.length) msgs.push(ai(`还缺少${andJoin(missing.map((k) => SLOT_NAME[k]))}，可以看看这些单品：`), buyMsg(suggest(s, missing, occ, [p.id])));
    return msgs;
  }

  /** 我刚拍了一件…: the newest photo (of that kind) is the focus. It isn't taken as owned. */
  function uploadPlan(s, text, occ, who) {
    const noun = nounOf(text);
    const photos = G().all(s).filter((g) => g.custom);
    const g = (noun && photos.find((x) => x.custom.cat === noun[1])) || photos[0];
    if (!g) return [ai(`还没有找到${who}拍的衣服。可以在首页点「拍照」，拍一件或从相册上传，我再帮你搭配。`)];
    const focal = piece(g);
    const { items, missing } = compose(G().saved(s).filter((x) => x.uid !== g.uid).map(piece), focal, occ);
    const others = items.filter((x) => x !== focal);
    const notOwned = others.filter((x) => !x.owned);
    let t = `用${who}拍的「${g.custom.name}」做主角，` + (others.length ? `搭配了${andJoin(others.map((x) => x.name))}：` : '先放在下面：');
    if (!g.isOwned) t += '\n这件还没有标记为已拥有；演示版暂无它的上身图，试穿时会加入当前搭配。';
    if (notOwned.length) t += `\n${quoted(notOwned)}也还没有标记为已拥有。`;
    const msgs = [ai(t), outfitMsg(items)];
    if (missing.length) msgs.push(ai(`还缺少${andJoin(missing.map((k) => SLOT_NAME[k]))}，可以看看这些单品：`), buyMsg(suggest(s, missing, occ)));
    return msgs;
  }

  function openLook(app, id) {
    const l = D().lookById[id];
    const s = app.s;
    const total = l.items.reduce((n, it) => n + D().byId[it.p].price, 0);
    const ov = app.sheet({
      title: `${l.name} · ${l.sub}`,
      full: true,
      html: `<div class="lk-hero">${VT.ui.img(l.card, `${l.name} 上身效果`)}</div>
        <ul class="lk-items">${l.items.map((it) => { const p = D().byId[it.p]; const own = G().ownsProduct(s, p.id); return `<li><button type="button" class="mini" data-act="item" data-pid="${p.id}"><span class="lk-thumb">${VT.ui.img(p.img.card, p.name)}${VT.ui.ownMark(own)}</span><span class="mini-main"><span class="mini-title">${p.name}${own ? '<span class="sr-only">，已拥有</span>' : ''}</span><span class="mini-sub">${p.tags}</span></span>${VT.ui.price(p.price)}</button></li>`; }).join('')}</ul>
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
