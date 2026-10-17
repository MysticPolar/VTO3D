/* 我的订单 family (secondary screens, reached from 我的):
   我的订单 (orderlist) → 订单详情 (orders) → 物流跟踪 (tracking) / 申请退换货 (returns)
   Orders, logistics and after-sales are local demo data. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  const H = () => VT.store.h;

  function orderOf(s, params) { return H().order(s, params && params.oid); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function nowLabel() { const d = new Date(); return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function carrierParts(o) {
    const m = String(o.carrier || '').match(/^(\S+)\s+(.+)$/);
    return m ? { name: m[1], no: m[2] } : { name: o.carrier || '待分配', no: '' };
  }
  function etaLine(o) {
    if (o.status === -1) return `请在 ${o.payBy || '24 小时内'} 前完成支付`;
    if (o.status === 3) return '包裹已送达，请及时确认收货';
    if (o.status === 4) return '已签收，感谢你的购买';
    return `预计 ${o.eta} 送达`;
  }
  const RET_STAGES = (type) => ['提交申请', '商家审核', '寄回商品', type === '换货' ? '换货完成' : '退款完成'];
  function retLine(ret) { return `已提交${ret.type} · ${ret.stage >= 2 ? '商家已同意' : '等待商家处理'}`; }

  /* 4-step tracker (positions follow the reference screen) */
  function progress(o) {
    const POS = [10.3, 37.58, 63.76, 89.33];
    const done = Math.max(1, Math.min(4, o.progress != null ? o.progress : o.status + 1));
    const w = (POS[done - 1] - POS[0]).toFixed(2);
    return `<ol class="or-track" style="--done:${w}%" aria-label="物流进度：${o.steps[done - 1].label}">${o.steps.map((st, i) => {
      const on = i < done;
      return `<li class="or-step ${on ? 'is-done' : ''}"><i class="or-dot" aria-hidden="true"></i><b>${st.label}</b><span>${st.time}</span></li>`;
    }).join('')}</ol>`;
  }

  function actionRow(act, icon, title, sub, attrs) {
    return `<button type="button" class="or-row" data-act="${act}" ${attrs || ''}><span class="or-row-ic">${I(icon, { size: 26, stroke: 1.55 })}</span><span class="or-row-main"><b>${title}</b><em>${sub}</em></span><span class="or-chev">${I('chevron-right', { size: 20, stroke: 1.7 })}</span></button>`;
  }

  /* ---------- shared order actions (list, details, tracking) ---------- */
  const oidOf = (app, el) => (el && el.dataset.oid) || orderOf(app.s, app.params).id;
  function orderActions() {
    return {
      logistics(app, el) { app.go('tracking', { oid: oidOf(app, el) }); },
      merchant(app, el) { openChat(app, 'merchant', oidOf(app, el)); },
      service(app) { openChat(app, 'service'); },
      return(app, el) { app.go('returns', { oid: oidOf(app, el) }); },
      rebuy(app, el) { const o = orderOf(app.s, { oid: oidOf(app, el) }); app.go('product', { pid: o.p }); },
      remind(app) { app.toast('已提醒商家尽快发货', { icon: 'check' }); },
      async receive(app, el) {
        const oid = oidOf(app, el);
        const ok = await app.dialog({ title: '确认收货？', text: '请确认已收到商品且无质量问题。\n确认后订单将完成（演示）。', ok: '确认收货' });
        if (!ok) return;
        VT.store.update((s) => {
          const o = s.orders.find((x) => x.id === oid);
          if (!o) return;
          o.status = 4; o.progress = 4;
          o.steps[3] = { label: '已签收', time: nowLabel() };
          o.logistics.unshift({ t: nowLabel(), s: '你已确认收货，交易完成' });
        });
        app.refresh();
        app.toast('已确认收货', { icon: 'check' });
      },
      paynow(app, el) {
        const oid = oidOf(app, el);
        const o = orderOf(app.s, { oid });
        const ov = VT.pay(app, {
          payment: o.payment, amount: o.paid, cancelMsg: '已取消支付，订单仍在「待付款」',
          onPaid: () => VT.store.update((s) => {
            const x = s.orders.find((y) => y.id === oid);
            if (!x) return;
            x.status = 0; x.progress = 1; x.eta = '3 天内';
            x.steps[1] = { label: '已发货', time: '待发货' };
            x.logistics.unshift({ t: nowLabel(), s: '订单已支付（演示），等待商家发货' });
          }),
          onView: () => { app.closeOverlay(ov, true); app.refresh(); },
          onShop: () => app.go('plaza'),
        });
      },
      async cancel(app, el) {
        const oid = oidOf(app, el);
        const ok = await app.dialog({ title: '取消这个订单？', text: '未付款订单取消后不可恢复。', ok: '取消订单', cancel: '再想想' });
        if (!ok) return;
        VT.store.update((s) => { s.orders = s.orders.filter((x) => x.id !== oid); if (s.currentOrder === oid) s.currentOrder = s.orders[0] && s.orders[0].id; });
        app.toast('订单已取消');
        if (app.cur.id === 'orders') app.back(); else app.refresh();
      },
    };
  }

  /* ================= 我的订单 ================= */
  function listCard(o, s) {
    const p = D().byId[o.p];
    const ret = s.returns[o.id];
    const label = H().statusLabel(o);
    const btn = (act, text, dark) => `<button type="button" class="btn btn--sm ${dark ? 'btn--dark' : 'ol-btn'}" data-act="${act}" data-oid="${o.id}">${text}</button>`;
    let acts;
    if (o.status === -1) acts = btn('cancel', '取消订单') + btn('paynow', '去支付', true);
    else if (o.status === 0) acts = btn('remind', '提醒发货') + btn('open', '查看详情', true);
    else if (o.status <= 3) acts = btn('logistics', '查看物流') + btn('receive', '确认收货', true);
    else acts = btn('return', ret ? '售后进度' : '申请售后') + btn('rebuy', '再次购买', true);
    return `<article class="ol-card" aria-label="${VT.esc(o.title)}，${label}">
      <header class="ol-card-h"><span class="ol-shop">${I('store', { size: 16, stroke: 1.6 })}${VT.esc(o.shop || p.brand)}</span><b class="ol-status ${o.status === -1 ? 'is-warn' : ''}">${label}${ret ? ' · 售后中' : ''}</b></header>
      <button type="button" class="ol-item" data-act="open" data-oid="${o.id}" aria-label="查看订单详情：${VT.esc(o.title)}">
        <span class="ol-img">${VT.ui.img(p.img.order || p.img.card, '')}</span>
        <span class="ol-main"><b>${VT.esc(o.title)}</b><em>${VT.esc(o.colorLabel)} / ${VT.esc(o.size)}</em><span class="ol-time">下单时间 ${o.created.slice(5, 16).replace('-', '/')}</span></span>
        <span class="ol-pr">${VT.ui.price(o.price)}<em>×${o.qty}</em></span>
      </button>
      <div class="ol-foot"><span class="ol-sum">${o.status === -1 ? '需付款' : '实付款'} <b>${VT.ui.yuan(o.paid)}</b></span><span class="ol-acts">${acts}</span></div>
    </article>`;
  }

  VT.screens.orderlist = {
    title: '我的订单',
    render(app, params) {
      const s = app.s;
      const f = (params && params.filter) || 'all';
      const list = s.orders.filter((o) => H().inFilter(s, o, f));
      const label = D().orderFilters.find((x) => x.id === f).label;
      return `
        ${VT.ui.subHead('我的订单')}
        <div class="ol-tabs" role="tablist" aria-label="订单状态" data-keep-scroll="ol-tabs">
          ${D().orderFilters.map((x) => {
            const n = x.id === 'all' ? 0 : s.orders.filter((o) => H().inFilter(s, o, x.id)).length;
            return `<button type="button" role="tab" class="ol-tab ${x.id === f ? 'is-on' : ''}" aria-selected="${x.id === f}" data-act="filter" data-f="${x.id}">${x.label}${n ? `<i aria-label="${n} 个">${n}</i>` : ''}</button>`;
          }).join('')}
        </div>
        <div class="scroll ol-scroll" data-keep-scroll="ol">
          ${list.length ? list.map((o) => listCard(o, s)).join('') : `<div class="ol-empty">${I('receipt', { size: 34, stroke: 1.3 })}<p>暂无「${label}」的订单</p><button type="button" class="btn btn--ghost btn--sm" data-act="shop">去购物广场逛逛</button></div>`}
          <p class="sheet-note">订单为演示数据</p>
        </div>`;
    },
    actions: Object.assign(orderActions(), {
      filter(app, el) {
        app.cur.params.filter = el.dataset.f;
        app.refresh();
        const sc = app.screenEl().querySelector('.ol-scroll');
        if (sc) sc.scrollTop = 0;
      },
      open(app, el) { app.go('orders', { oid: el.dataset.oid }); },
      shop(app) { app.go('plaza'); },
    }),
  };

  /* ================= 订单详情 ================= */
  VT.screens.orders = {
    title: '订单详情',
    render(app, params) {
      const s = app.s;
      const o = orderOf(s, params);
      const p = D().byId[o.p];
      const thumbs = p.orderThumbs || [p.img.card, p.img.tile, p.img.thumb].filter(Boolean).slice(0, 4);
      const ret = s.returns[o.id];
      const unpaid = o.status === -1;
      const label = H().statusLabel(o);
      return `
        ${VT.ui.statusBar('dark')}
        <header class="or-head">${VT.ui.backBtn()}<h1 class="or-title">订单详情</h1>${VT.ui.iconBtn('headset', '在线客服', 'service', { size: 24, stroke: 1.6, cls: 'or-svc' })}</header>
        <div class="scroll or-scroll" data-keep-scroll="or">
          <section class="or-card or-status ${unpaid ? 'is-unpaid' : ''}">
            ${unpaid ? `
              <div class="or-status-link"><h2>${label}</h2><p>${etaLine(o)}</p></div>
              <div class="or-paybar"><span>需付款 <b>${VT.ui.yuan(o.paid)}</b></span><button type="button" class="btn btn--dark btn--sm" data-act="paynow">立即支付</button></div>` : `
              <button type="button" class="or-status-link" data-act="logistics" aria-label="${label}，查看物流详情">
                <h2>${label}</h2><p>${etaLine(o)}</p><span class="or-chev or-chev--top">${I('chevron-right', { size: 20, stroke: 1.7 })}</span>
              </button>
              ${progress(o)}`}
          </section>
          <section class="or-card or-item">
            <button type="button" class="or-item-top" data-act="nav" data-to="product" data-pid="${o.p}">
              <span class="or-item-img">${VT.ui.img(p.img.order || p.img.card, o.title)}</span>
              <span class="or-item-main"><b>${VT.esc(o.title)}</b><em>${VT.esc(o.colorLabel)} / ${VT.esc(o.size)}${o.qty > 1 ? ' × ' + o.qty : ''}</em>${VT.ui.price(o.price, 'or-price')}</span>
              <span class="or-chev or-chev--item">${I('chevron-right', { size: 20, stroke: 1.7 })}</span>
            </button>
            <div class="or-thumbs">${thumbs.map((src, i) => `<button type="button" data-act="photo" data-i="${i}" aria-label="查看商品图 ${i + 1}">${VT.ui.img(src, '')}</button>`).join('')}</div>
          </section>
          ${unpaid ? `<section class="or-card or-actions">${actionRow('cancel', 'close', '取消订单', '未付款订单可直接取消')}</section>` : `
          <section class="or-card or-actions">
            ${actionRow('logistics', 'truck', '查看物流', o.status === 0 ? '商家备货中，发货后可查看' : '实时跟踪包裹物流信息')}
            ${actionRow('merchant', 'chat-dots', '联系商家', '咨询商品、发货或售后问题')}
          </section>
          <section class="or-card or-actions">
            ${actionRow('return', 'refresh', '申请退换货', ret ? retLine(ret) : '支持 7 天无理由退换')}
          </section>`}
          <section class="or-card or-actions">
            ${actionRow('info', 'doc', '订单信息', '查看订单编号、收货地址等')}
            ${actionRow('help', 'question', '帮助与客服', '常见问题解答，获取更多帮助')}
          </section>
          ${o.status === 2 || o.status === 3 ? `<button type="button" class="btn btn--dark btn--lg btn--block or-confirm" data-act="receive">确认收货</button>` : ''}
        </div>`;
    },
    actions: Object.assign(orderActions(), {
      help(app) { app.go('help'); },
      info(app) {
        const s = app.s;
        const o = orderOf(s, app.params);
        const addr = H().address(s, o.address);
        const pay = D().payments.find((m) => m.id === o.payment) || D().payments[0];
        app.sheet({
          title: '订单信息',
          html: `<dl class="kv">
              <dt>订单编号</dt><dd><span class="or-no">${o.id}</span> <button type="button" class="co-link" data-act="copy">复制</button></dd>
              <dt>下单时间</dt><dd>${o.created}</dd>
              <dt>店铺</dt><dd>${VT.esc(o.shop || '')}</dd>
              <dt>支付方式</dt><dd>${pay.name}（演示）</dd>
              <dt>商品金额</dt><dd>${VT.ui.yuan(o.price * o.qty)}</dd>
              <dt>运费</dt><dd>${VT.ui.yuan(o.shipping)}</dd>
              <dt>优惠券</dt><dd>- ${VT.ui.yuan(o.coupon)}</dd>
              <dt>${o.status === -1 ? '需付款' : '实付款'}</dt><dd><b>${VT.ui.yuan(o.paid)}</b></dd>
              <dt>收货信息</dt><dd>${VT.esc(addr.name)}　${VT.esc(addr.phone)}<br>${VT.esc(addr.addr)}</dd>
            </dl>`,
          actions: {
            copy: async () => { try { await navigator.clipboard.writeText(o.id); app.toast('订单编号已复制'); } catch (e) { app.toast('订单编号：' + o.id); } },
          },
        });
      },
      photo(app, el) {
        const o = orderOf(app.s, app.params);
        const p = D().byId[o.p];
        const list = p.orderThumbs || [p.img.card, p.img.tile, p.img.thumb].filter(Boolean).slice(0, 4);
        let i = +el.dataset.i;
        const ov = app.sheet({
          title: '商品图片',
          html: `<div class="or-viewer">${VT.ui.img(list[i], `商品图 ${i + 1}`, 'js-view')}</div>
            <div class="or-viewer-nav"><button type="button" class="btn btn--ghost btn--sm" data-act="prev">上一张</button><span class="js-idx">${i + 1} / ${list.length}</span><button type="button" class="btn btn--ghost btn--sm" data-act="next">下一张</button></div>`,
          actions: {
            prev: () => { i = (i - 1 + list.length) % list.length; show(); },
            next: () => { i = (i + 1) % list.length; show(); },
          },
        });
        function show() { ov.querySelector('.js-view').src = list[i]; ov.querySelector('.js-idx').textContent = `${i + 1} / ${list.length}`; }
      },
    }),
  };

  /* ================= 物流跟踪 ================= */
  VT.screens.tracking = {
    title: '物流跟踪',
    render(app, params) {
      const s = app.s;
      const o = orderOf(s, params);
      const p = D().byId[o.p];
      const c = carrierParts(o);
      const label = H().statusLabel(o);
      return `
        ${VT.ui.subHead('物流跟踪')}
        <div class="scroll tr-scroll" data-keep-scroll="tr">
          <section class="or-card tr-sum">
            <span class="tr-img">${VT.ui.img(p.img.order || p.img.card, '')}</span>
            <div class="tr-sum-main"><h2>${label}</h2><p>${etaLine(o)}</p></div>
          </section>
          <section class="or-card tr-carrier" aria-label="快递信息">
            <div class="tr-kv"><span>承运快递</span><b>${VT.esc(c.name)}</b></div>
            <div class="tr-kv"><span>运单号</span><b class="tr-no">${c.no ? VT.esc(c.no) : '发货后生成'}</b>${c.no ? '<button type="button" class="co-link" data-act="copy">复制</button>' : ''}</div>
          </section>
          ${o.status >= 0 ? `<section class="or-card tr-track">${progress(o)}</section>` : ''}
          <section class="or-card tr-tl">
            <h3>物流详情</h3>
            <ol class="timeline">${o.logistics.map((l) => `<li><div class="t">${l.t}</div><div class="s">${l.s}</div></li>`).join('')}</ol>
            <p class="sheet-note">物流信息为演示数据</p>
          </section>
          <div class="tr-acts">
            <button type="button" class="btn btn--ghost btn--lg" data-act="merchant">${I('chat-dots', { size: 19 })}联系商家</button>
            ${o.status === 2 || o.status === 3 ? '<button type="button" class="btn btn--dark btn--lg" data-act="receive">确认收货</button>' : ''}
          </div>
        </div>`;
    },
    actions: Object.assign(orderActions(), {
      async copy(app) {
        const no = carrierParts(orderOf(app.s, app.params)).no.replace(/\s/g, '');
        try { await navigator.clipboard.writeText(no); app.toast('运单号已复制'); } catch (e) { app.toast('运单号：' + no); }
      },
    }),
  };

  /* ================= 申请退换货 / 售后进度 ================= */
  const drafts = {};
  const REASONS = ['尺码不合适', '颜色 / 款式与预期不符', '质量问题', '不想要了（7 天无理由）'];

  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 360 / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  VT.screens.returns = {
    title: '申请退换货',
    render(app, params) {
      const s = app.s;
      const o = orderOf(s, params);
      const p = D().byId[o.p];
      const ex = s.returns[o.id];
      const mini = `<div class="mini rt-mini">${VT.ui.img(p.img.order || p.img.card, o.title)}<span class="mini-main"><span class="mini-title">${VT.esc(o.title)}</span><span class="mini-sub">${VT.esc(o.colorLabel)} / ${VT.esc(o.size)} · 实付 ${VT.ui.yuan(o.paid)}</span></span></div>`;
      if (ex) {
        const stages = RET_STAGES(ex.type);
        return `
          ${VT.ui.subHead('售后进度')}
          <div class="scroll rt-scroll" data-keep-scroll="rt">
            ${mini}
            <section class="or-card rt-state">
              <h2>${ex.type}申请处理中</h2>
              <p>${ex.stage >= 2 ? '商家已同意，请按提示寄回商品' : '商家会在 1–2 个工作日内审核'}</p>
              <ol class="rt-steps">${stages.map((t, i) => `<li class="${i < ex.stage ? 'is-done' : ''}"><i></i><span>${t}</span></li>`).join('')}</ol>
            </section>
            <section class="or-card rt-detail">
              <dl class="kv">
                <dt>服务类型</dt><dd>${ex.type === '换货' ? '换货' : '退货退款'}</dd>
                <dt>申请原因</dt><dd>${VT.esc(ex.reason)}</dd>
                ${ex.note ? `<dt>补充说明</dt><dd>${VT.esc(ex.note)}</dd>` : ''}
                <dt>提交时间</dt><dd>${ex.time}</dd>
                ${ex.type === '退货' ? `<dt>退款金额</dt><dd>${VT.ui.yuan(o.paid)}（原路退回）</dd>` : ''}
              </dl>
              ${ex.photos && ex.photos.length ? `<div class="rt-photos">${ex.photos.map((src) => `<span>${VT.ui.img(src, '凭证照片')}</span>`).join('')}</div>` : ''}
            </section>
            <div class="tr-acts">
              <button type="button" class="btn btn--ghost btn--lg" data-act="withdraw">撤销申请</button>
              <button type="button" class="btn btn--dark btn--lg" data-act="merchant">联系商家</button>
            </div>
            <p class="sheet-note">售后进度为演示数据</p>
          </div>`;
      }
      const d = drafts[o.id] || (drafts[o.id] = { type: '退货', reason: '', photos: [] });
      return `
        ${VT.ui.subHead('申请退换货')}
        <div class="scroll rt-scroll" data-keep-scroll="rt">
          ${mini}
          <h4 class="co-sh-h">服务类型</h4>
          <div class="or-seg" role="radiogroup" aria-label="服务类型">${[['退货', '退货退款'], ['换货', '换货']].map(([v, l]) => `<button type="button" role="radio" class="${d.type === v ? 'is-on' : ''}" aria-checked="${d.type === v}" data-act="type" data-v="${v}">${l}</button>`).join('')}</div>
          <h4 class="co-sh-h">申请原因</h4>
          <div class="opt-list" role="radiogroup" aria-label="申请原因">${REASONS.map((r) => `<button type="button" role="radio" aria-checked="${d.reason === r}" class="opt or-reason ${d.reason === r ? 'is-on' : ''}" data-act="reason" data-v="${r}"><span class="opt-main"><span class="opt-title" style="font-weight:500">${r}</span></span><span class="radio"></span></button>`).join('')}</div>
          <h4 class="co-sh-h">补充说明（选填）</h4>
          <textarea class="field-area" maxlength="120" placeholder="描述一下遇到的问题" aria-label="补充说明" data-keep-value="rt-note" data-input="note">${VT.esc(d.note || '')}</textarea>
          <h4 class="co-sh-h">上传凭证（选填，最多 3 张）</h4>
          <div class="rt-photos rt-photos--edit">
            ${d.photos.map((src, i) => `<span>${VT.ui.img(src, `凭证照片 ${i + 1}`)}<button type="button" class="rt-del" data-act="unphoto" data-i="${i}" aria-label="删除第 ${i + 1} 张">${I('close', { size: 12, stroke: 2.4 })}</button></span>`).join('')}
            ${d.photos.length < 3 ? `<label class="rt-add" aria-label="添加凭证照片">${I('camera', { size: 22, stroke: 1.5 })}<input class="sr-only" type="file" accept="image/*" data-change="photo"></label>` : ''}
          </div>
          <button type="button" class="btn btn--dark btn--lg btn--block rt-submit" data-act="submit">提交申请</button>
          <p class="sheet-note">演示原型：提交后商家不会真的收到申请</p>
        </div>`;
    },
    actions: Object.assign(orderActions(), {
      type(app, el) { drafts[orderOf(app.s, app.params).id].type = el.dataset.v; app.refresh(); },
      reason(app, el) { drafts[orderOf(app.s, app.params).id].reason = el.dataset.v; app.refresh(); },
      note(app, el) { drafts[orderOf(app.s, app.params).id].note = el.value; },
      async photo(app, el) {
        const f = el.files && el.files[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) { app.toast('请选择图片文件'); return; }
        try {
          const src = await shrinkPhoto(f);
          drafts[orderOf(app.s, app.params).id].photos.push(src);
          app.refresh();
        } catch (e) { app.toast('无法读取这张图片，请换一张'); }
      },
      unphoto(app, el) { drafts[orderOf(app.s, app.params).id].photos.splice(+el.dataset.i, 1); app.refresh(); },
      submit(app) {
        const o = orderOf(app.s, app.params);
        const d = drafts[o.id];
        if (!d.reason) { app.toast('请选择申请原因'); return; }
        VT.store.update((st) => { st.returns[o.id] = { type: d.type, reason: d.reason, note: (d.note || '').trim(), photos: d.photos.slice(), time: nowLabel(), stage: 1 }; });
        delete drafts[o.id];
        app.back();
        app.toast(`${d.type}申请已提交（演示）`, { icon: 'check' });
      },
      async withdraw(app) {
        const o = orderOf(app.s, app.params);
        const ok = await app.dialog({ title: '撤销售后申请？', text: '撤销后可在有效期内重新申请。', ok: '撤销申请', cancel: '再想想' });
        if (!ok) return;
        VT.store.update((st) => { delete st.returns[o.id]; });
        app.refresh();
        app.toast('售后申请已撤销');
      },
    }),
  };

  /* ---------- scripted chat with merchant / support ---------- */
  function openChat(app, who, oid) {
    const merchant = who === 'merchant';
    const cur = orderOf(app.s, { oid });
    const name = merchant ? (cur.shop || '店铺客服') : '在线客服 · 小衣';
    const quick = merchant ? ['什么时候能到？', '可以换尺码吗？', '面料会起球吗？'] : ['怎么修改收货地址？', '数字分身怎么重新生成？', '如何开发票？'];
    const answers = {
      '什么时候能到？': cur.status <= 0 ? `亲，订单${cur.status === -1 ? '付款后' : '已支付，'}商家会在 48 小时内发货～` : cur.status >= 3 ? '亲，包裹已经送达啦，请及时查收～' : `亲，您的包裹正在运输中，预计 ${cur.eta} 送达，可在「查看物流」实时跟踪哦～`,
      '可以换尺码吗？': '可以的～签收后 7 天内可在「申请退换货」中选择换货，我们承担换货运费。',
      '面料会起球吗？': '这款面料正常穿着不易起球，建议冷水轻柔手洗。',
      '怎么修改收货地址？': '可以在「我的 → 收货地址」中编辑；已发货订单请联系快递改派。',
      '数字分身怎么重新生成？': '进入「我的 → 我的形象」，选择「更换照片」或「重新生成」即可。',
      '如何开发票？': '订单签收后可在「订单信息」中申请电子发票（演示版暂未开放）。',
    };
    const ov = app.sheet({
      title: name,
      full: true,
      html: `<div class="mchat js-thread"><div class="b them">您好，我是${merchant ? '店铺客服' : '小衣'}，请问有什么可以帮您？</div></div>
        <div class="or-quick">${quick.map((q) => `<button type="button" class="chip" data-act="q" data-q="${q}">${q}</button>`).join('')}</div>
        <div class="mchat-input"><input type="text" placeholder="输入消息…" aria-label="输入消息" data-enter="send" class="js-msg"><button type="button" class="btn btn--dark" data-act="send">发送</button></div>
        <p class="sheet-note">演示对话，回复为预设内容</p>`,
      actions: {
        q: (el) => say(el.dataset.q),
        send: () => { const i = ov.querySelector('.js-msg'); const v = i.value.trim(); if (!v) return; i.value = ''; say(v); },
      },
    });
    function say(text) {
      const th = ov.querySelector('.js-thread');
      th.insertAdjacentHTML('beforeend', `<div class="b me">${VT.esc(text)}</div>`);
      th.parentElement.scrollTop = th.parentElement.scrollHeight;
      app.later(() => {
        if (!document.body.contains(th)) return;
        th.insertAdjacentHTML('beforeend', `<div class="b them">${VT.esc(answers[text] || '收到～已为您记录，稍后会有专人跟进处理（演示回复）。')}</div>`);
        th.parentElement.scrollTop = th.parentElement.scrollHeight;
      }, 800);
    }
    return ov;
  }

  VT.openChat = openChat;
  VT.orders = { progress, etaLine };
})();
