/* 上传照片 · 创建数字分身 (secondary screen)
   Reached from the first-launch flow (启动页 → here → 首页) and from
   我的 → 我的形象 → 更换照片. Generation is simulated. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const esc = (s) => VT.esc(s);

  const SLOTS = {
    fullbody: { title: '上传全身照', sub: '展示你的身材和体型特征', tips: ['请上传正面、站立的全身照片', '建议光线充足，背景简洁'], sample: 'assets/people/upload-fullbody.webp', alt: '示例全身照：穿白色吊带背心与蓝色阔腿牛仔裤的模特', label: '全身照' },
    portrait: { title: '上传生活照', sub: '展示你的面部特征和气质', tips: ['请上传清晰、自然的正面照', '建议素颜或淡妆，五官清晰'], sample: 'assets/people/upload-portrait.webp', alt: '示例生活照：模特正面半身照', label: '生活照' },
  };

  function stepper(step) {
    const labels = ['上传照片', '生成建模', '完成'];
    return `<ol class="av-steps" aria-label="创建进度">${labels.map((l, i) => {
      const n = i + 1;
      const st = n < step ? 'done' : n === step ? 'on' : 'todo';
      return `<li class="av-step is-${st}" ${n === step ? 'aria-current="step"' : ''}><span class="av-num">${n < step ? I('check', { size: 15, stroke: 2.4 }) : n}</span><span class="av-lbl">${l}</span></li>`;
    }).join('<li class="av-line" aria-hidden="true"></li>')}</ol>`;
  }

  function card(id, s, busy) {
    const c = SLOTS[id];
    const up = s.avatar[id];
    const isBusy = busy === id;
    return `
      <section class="av-card" aria-labelledby="av-${id}-t">
        <h2 id="av-${id}-t">${c.title}</h2>
        <p class="av-card-sub">${c.sub}</p>
        <div class="av-photo ${up ? 'has-upload' : ''}">
          ${VT.ui.img(up ? up.src : c.sample, up ? `已上传的${c.label}预览` : c.alt, 'av-img')}
          ${up ? `<span class="av-badge">${I('check', { size: 12, stroke: 2.6 })}已上传</span>` : ''}
          ${isBusy ? `<span class="av-busy"><span class="spinner"></span>处理中…</span>` : ''}
          <label class="av-plus" aria-label="${up ? '重新选择' : '上传'}${c.label}">
            <input class="sr-only" type="file" accept="image/*" data-change="upload" data-slot="${id}" ${isBusy ? 'disabled' : ''}>
            ${I(up ? 'refresh' : 'plus', { size: up ? 17 : 19, stroke: up ? 1.9 : 1.6 })}
          </label>
        </div>
        <p class="av-tips">${up ? `<span class="av-ok">${I('check', { size: 12, stroke: 2.6 })}已上传：${esc(truncate(up.name, 14))}</span><br>点击按钮可重新选择` : `${c.tips[0]}<br>${c.tips[1]}`}</p>
      </section>`;
  }

  function truncate(s, n) { s = String(s || '照片'); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /** downscale a picked image to keep localStorage small */
  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type || !file.type.startsWith('image/')) { reject(new Error('type')); return; }
      if (file.size > 25 * 1024 * 1024) { reject(new Error('size')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        try { resolve({ src: cv.toDataURL('image/jpeg', 0.8), name: file.name, w, h }); } catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  let busySlot = null;

  VT.screens.avatar = {
    title: '上传照片，创建数字分身',
    render(app, params) {
      const s = app.s;
      const fromProfile = params && params.from === 'profile';
      return `
        ${VT.ui.statusBar('dark')}
        <div class="scroll av-scroll" data-keep-scroll="av">
          <div class="av-top">${VT.ui.backBtn()}${fromProfile ? '' : '<button type="button" class="av-skip" data-act="skip">跳过</button>'}</div>
          <h1 class="av-title">上传照片，创建数字分身</h1>
          <p class="av-lead">上传清晰的全身照和生活照，<br>我们将为你生成专属的3D数字分身，用于虚拟试衣。</p>
          ${stepper(1)}
          <div class="av-cards">${card('fullbody', s, busySlot)}${card('portrait', s, busySlot)}</div>
        </div>
        <div class="av-cta"><button type="button" class="btn btn--dark btn--xl av-go" data-act="generate">${fromProfile ? '重新生成数字分身' : '生成我的数字分身'}<span class="btn-arrow">${I('arrow-right', { size: 24, stroke: 1.5 })}</span></button></div>`;
    },
    actions: {
      async upload(app, el) {
        const file = el.files && el.files[0];
        const slot = el.dataset.slot;
        if (!file) return;
        busySlot = slot;
        app.refresh();
        try {
          const data = await readImage(file);
          VT.store.update((s) => { s.avatar[slot] = data; if (s.avatar.status === 'ready') s.avatar.status = 'stale'; });
          app.toast(`${SLOTS[slot].label}已上传`, { icon: 'check' });
        } catch (e) {
          const msg = e.message === 'type' ? '请选择图片文件（JPG / PNG / HEIC 等）' : e.message === 'size' ? '图片超过 25MB，请换一张' : '无法读取这张图片，请换一张试试';
          app.toast(msg);
        } finally {
          busySlot = null;
          app.refresh();
        }
      },
      generate(app) {
        const s = VT.store.get();
        const usingSamples = !s.avatar.fullbody || !s.avatar.portrait;
        runGeneration(app, usingSamples, app.params.from === 'profile' ? 'profile' : 'launch');
      },
      /* first launch only: use the demo avatar and go straight to 首页 */
      skip(app) {
        VT.store.update((s) => { if (s.avatar.status !== 'ready') { s.avatar.status = 'ready'; s.avatar.demo = true; } });
        app.enterMain();
        app.later(() => app.toast('已使用示例数字分身，可在「我的 → 我的形象」中更换'), 300);
      },
    },
  };

  /* ---------- simulated generation (no real AI backend in this prototype) ---------- */
  /* ctx: 'launch' (first launch) · 'profile' (upload screen opened from 我的形象) · 'hub' (重新生成 on 我的形象) */
  function runGeneration(app, usingSamples, ctx) {
    const s = VT.store.get();
    const fb = s.avatar.fullbody ? s.avatar.fullbody.src : SLOTS.fullbody.sample;
    const stages = ['解析身材比例与体型特征', '识别面部特征与发型', '构建数字分身模型', '匹配肤色与光影细节'];
    let cancelled = false;
    const ov = app.layer({
      cls: 'av-gen', label: '正在生成数字分身',
      html: `<div class="av-gen-in">
          ${VT.ui.statusBar('dark')}
          <div class="av-gen-head">${stepper(2)}</div>
          <div class="av-gen-stage">
            <div class="av-scan">${VT.ui.img(fb, '用于生成的全身照', 'av-scan-img')}<i class="av-scan-line" aria-hidden="true"></i><i class="av-scan-grid" aria-hidden="true"></i></div>
            <p class="av-gen-pct" aria-live="polite"><b>0</b>%</p>
            <div class="av-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="生成进度"><i></i></div>
            <ul class="av-gen-list">${stages.map((t) => `<li>${I('check', { size: 14, stroke: 2.4 })}<span>${t}</span></li>`).join('')}</ul>
            ${usingSamples ? '<p class="av-gen-note">未上传全部照片，演示将使用示例照片</p>' : ''}
          </div>
          <div class="av-gen-foot"><button type="button" class="btn btn--ghost btn--lg btn--block" data-act="cancel">取消</button></div>
        </div>`,
      actions: {
        cancel() { cancelled = true; app.closeOverlay(ov); app.toast('已取消生成'); },
      },
    });
    const pct = ov.querySelector('.av-gen-pct b');
    const bar = ov.querySelector('.av-bar');
    const items = ov.querySelectorAll('.av-gen-list li');
    const total = VT.reducedMotion() ? 900 : 4200;
    const t0 = performance.now();
    function tick(now) {
      if (cancelled || !document.body.contains(ov)) return;
      const p = Math.min(1, (now - t0) / total);
      const eased = 1 - Math.pow(1 - p, 1.6);
      const v = Math.round(eased * 100);
      pct.textContent = v;
      bar.style.setProperty('--p', v + '%');
      bar.setAttribute('aria-valuenow', v);
      items.forEach((li, i) => { li.classList.toggle('is-done', v >= (i + 1) * 24); li.classList.toggle('is-on', v >= i * 24 && v < (i + 1) * 24); });
      if (p < 1) requestAnimationFrame(tick);
      else app.later(() => finish(app, ov, usingSamples, ctx || 'launch'), 350);
    }
    requestAnimationFrame(tick);
  }

  function finish(app, ov, usingSamples, ctx) {
    VT.store.update((s) => { s.avatar.status = 'ready'; s.avatar.generatedAt = Date.now(); s.avatar.demo = true; });
    const inner = ov.querySelector('.av-gen-in');
    inner.classList.add('is-done');
    inner.querySelector('.av-gen-head').innerHTML = stepper(3);
    inner.querySelector('.av-gen-stage').innerHTML = `
      <div class="av-result">
        <div class="av-result-fig">${VT.ui.img('assets/people/avatar-base.webp', '生成的数字分身：穿白色吊带背心与蓝色牛仔裤的全身形象', 'av-result-img')}</div>
        <h2 class="av-result-t">数字分身已生成</h2>
        <p class="av-result-s">演示原型使用预设的数字分身（2D 形象预览）。<br>真实产品将基于你上传的照片进行三维重建。</p>
      </div>`;
    const launch = ctx === 'launch';
    inner.querySelector('.av-gen-foot').innerHTML = launch ? `
      <button type="button" class="btn btn--dark btn--xl btn--block" data-act="enter">进入虚拟试衣间<span class="btn-arrow">${I('arrow-right', { size: 22, stroke: 1.6 })}</span></button>
      <button type="button" class="btn btn--ghost btn--lg btn--block" data-act="redo">重新上传照片</button>` : `
      <button type="button" class="btn btn--dark btn--xl btn--block" data-act="done">完成</button>
      <button type="button" class="btn btn--ghost btn--lg btn--block" data-act="try">去首页试穿</button>`;
    ov._actions.enter = () => { app.enterMain(); };
    ov._actions.redo = () => { app.closeOverlay(ov); };
    ov._actions.done = () => {
      app.closeOverlay(ov, true);
      if (ctx === 'profile') app.back(); else app.refresh();
      app.toast('数字分身已更新', { icon: 'check' });
    };
    ov._actions.try = () => { app.go('fitting'); };
    const b = inner.querySelector('[data-act="enter"], [data-act="done"]');
    if (b) b.focus({ preventScroll: true });
    if (usingSamples) app.toast('已使用示例照片生成演示分身');
  }

  VT.avatarGen = {
    /** start the simulated generation from another screen (我的形象 → 重新生成) */
    run(app) {
      const s = VT.store.get();
      runGeneration(app, !s.avatar.fullbody || !s.avatar.portrait, 'hub');
    },
    readImage,
  };
})();
