/* 我的形象 — digital avatar management (secondary, from 我的)
   View the active avatar, replace photos, regenerate, edit body data and
   avatar preferences; rename or delete an avatar other than 本人. Generation
   itself is simulated (see 02-avatar.js). Also home to the 切换角色 sheet
   (VT.avatarUI), opened from 首页 and 个人衣橱. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const esc = (x) => VT.esc(x);
  const A = () => VT.store.avatars;

  function md(ts) { const d = new Date(ts); return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

  /* ---------- 切换角色: every digital avatar, each with its own wardrobe and outfit ---------- */
  function switcher(app) {
    const s = app.s;
    const row = (rec) => {
      const on = rec.id === s.activeAvatar;
      const d = A().dataOf(s, rec);
      return `<button type="button" class="opt as-opt ${on ? 'is-on' : ''}" role="radio" aria-checked="${on}" data-act="as-pick" data-id="${rec.id}">
        ${VT.ui.img(A().portraitOf(s, rec), '', 'as-face')}
        <span class="opt-main"><span class="opt-title">${esc(A().nameOf(s, rec))}${rec.self ? '<em class="set-tag">本人</em>' : ''}</span><span class="opt-sub">衣橱 ${d.wardrobe.length} 件 · ${d.avatar.status === 'ready' ? '已生成' : '示例形象'}</span></span>
        <span class="radio" aria-hidden="true"></span></button>`;
    };
    const ov = app.sheet({
      title: '切换角色',
      html: `<div class="opt-list" role="radiogroup" aria-label="数字分身">${A().list(s).map(row).join('')}</div>
        <button type="button" class="btn btn--ghost btn--lg btn--block as-new" data-act="as-new">${I('plus', { size: 18, stroke: 1.9 })}新建数字分身</button>
        <p class="sheet-note">每个数字分身都有自己的衣橱和搭配<br>演示版的数字分身均使用示例模特形象</p>`,
      actions: {
        'as-pick': (el) => {
          const id = el.dataset.id;
          app.closeOverlay(ov);
          if (id === app.s.activeAvatar) return;
          A().switchTo(id);
          app.refresh();
          app.toast(`已切换到「${A().nameOf(app.s, A().active(app.s))}」`, { icon: 'check' });
        },
        'as-new': () => { app.closeOverlay(ov, true); createSheet(app); },
      },
    });
  }

  function createSheet(app) {
    const ov = app.sheet({
      title: '新建数字分身',
      html: `<p class="sheet-lead">为家人或朋友创建一个数字分身，TA 的衣橱和搭配与你的分开保存。</p>
        <label class="field"><span class="field-label">名称</span><span class="field-row"><input type="text" maxlength="8" class="js-name" placeholder="例如：家人、朋友" aria-label="数字分身名称" data-enter="as-next" data-autofocus></span></label>
        <button type="button" class="btn btn--dark btn--lg btn--block" data-act="as-next">下一步：上传照片</button>`,
      actions: {
        'as-next': () => {
          const name = ov.querySelector('.js-name').value.trim();
          if (!name) { app.toast('请填写名称'); return; }
          app.closeOverlay(ov, true);
          app.go('avatar', { ctx: 'new', name });
        },
      },
    });
  }

  VT.avatarUI = { switcher };

  VT.screens.avatarhub = {
    title: '我的形象',
    render(app) {
      const s = app.s;
      const rec = A().active(s);
      const a = s.avatar;
      const ready = a.status === 'ready';
      const b = s.body;
      const shot = (slot, label, sample) => {
        const up = a[slot];
        return `<figure class="ah-shot">${VT.ui.img(up ? up.src : sample, up ? `我上传的${label}` : `示例${label}`)}<figcaption>${label}<em>${up ? '已上传' : '示例'}</em></figcaption></figure>`;
      };
      return `
        ${VT.ui.subHead('我的形象')}
        <div class="scroll sub-scroll ah-scroll" data-keep-scroll="ah">
          <section class="ah-hero">
            <div class="ah-plate">${VT.ui.img('assets/people/avatar-base.webp', '我的数字分身：穿白色吊带背心与蓝色牛仔裤的全身形象', 'ah-fig')}</div>
            <div class="ah-info">
              <span class="ah-chip ${ready ? 'is-ok' : ''}">${ready ? I('check', { size: 12, stroke: 2.6 }) : ''}${ready ? '已生成' : '示例形象'}</span>
              <h2>${rec.self ? '我的数字分身' : esc(rec.name)}</h2>
              <p>${ready && a.generatedAt ? `更新于 ${md(a.generatedAt)}` : ready ? '使用示例照片生成' : '尚未用你的照片生成'}</p>
              <p class="ah-note">2D 形象预览 · 演示版</p>
              <button type="button" class="btn btn--dark btn--sm" data-act="tab" data-to="fitting">${I('dress', { size: 16 })}去试衣间</button>
            </div>
          </section>
          <section class="set-group"><h2 class="set-h">生成照片</h2>
            <div class="set-card ah-shots">
              ${shot('fullbody', '全身照', 'assets/people/upload-fullbody.webp')}
              ${shot('portrait', '生活照', 'assets/people/upload-portrait.webp')}
            </div>
            <div class="ah-acts">
              <button type="button" class="btn btn--ghost btn--lg" data-act="photos">${I('upload', { size: 18 })}更换照片</button>
              <button type="button" class="btn btn--dark btn--lg" data-act="regen">${I('refresh', { size: 18 })}重新生成</button>
            </div>
          </section>
          <section class="set-group"><h2 class="set-h">身材数据</h2>
            <div class="set-card">
              ${VT.ui.row({ act: 'body', icon: 'ruler', label: '身高 / 体重', value: `${esc(b.height)} cm · ${esc(b.weight)} kg` })}
              ${VT.ui.row({ act: 'body', icon: 'tshirt', label: '常穿尺码', value: `${esc(b.size)} · 鞋码 ${esc(b.shoe)}` })}
            </div>
            <p class="set-note">用于合身度参考和尺码推荐</p>
          </section>
          <section class="set-group"><h2 class="set-h">形象偏好</h2>
            <div class="set-card">
              ${VT.ui.toggleRow('试穿时显示尺码建议', 'avatarPrefs.sizeTips', s.avatarPrefs.sizeTips, '根据身材数据提示偏大或偏小')}
              ${VT.ui.toggleRow('AI 造型师使用我的形象', 'avatarPrefs.stylistUse', s.avatarPrefs.stylistUse, '推荐造型时用数字分身预览上身效果')}
            </div>
            <p class="set-note">照片只保存在本机，可在「设置 → 隐私与安全」中清除</p>
          </section>
          ${rec.self ? '' : `<section class="set-group"><h2 class="set-h">角色管理</h2>
            <div class="set-card">
              ${VT.ui.row({ act: 'as-rename', icon: 'edit', label: '名称', value: esc(rec.name) })}
              ${VT.ui.row({ act: 'as-delete', icon: 'trash', label: '删除这个数字分身', sub: 'TA 的照片、衣橱和搭配会一并删除' })}
            </div>
          </section>`}
        </div>`;
    },
    actions: {
      'as-rename'(app) {
        const rec = A().active(app.s);
        const ov = app.sheet({
          title: '修改名称',
          html: `<label class="field"><span class="field-label">名称</span><span class="field-row"><input type="text" maxlength="8" class="js-name" value="${esc(rec.name)}" aria-label="数字分身名称" data-enter="save" data-autofocus></span></label>
            <button type="button" class="btn btn--dark btn--lg btn--block" data-act="save">保存</button>`,
          actions: {
            save: () => {
              const name = ov.querySelector('.js-name').value.trim();
              if (!name) { app.toast('请填写名称'); return; }
              A().rename(rec.id, name);
              app.closeOverlay(ov);
              app.refresh();
              app.toast('名称已保存', { icon: 'check' });
            },
          },
        });
      },
      async 'as-delete'(app) {
        const rec = A().active(app.s);
        const ok = await app.dialog({ title: `删除「${rec.name}」？`, text: 'TA 的照片、衣橱和搭配会一并删除，无法恢复。', ok: '删除' });
        if (!ok) return;
        A().remove(rec.id);
        app.refresh();
        app.toast(`已删除「${rec.name}」，已切换回本人`);
      },
      photos(app) { app.go('avatar', { from: 'profile' }); },
      regen(app) { VT.avatarGen.run(app); },
      toggle(app, el) {
        const [grp, key] = el.dataset.key.split('.');
        let on = false;
        VT.store.update((s) => { s[grp][key] = !s[grp][key]; on = s[grp][key]; });
        el.classList.toggle('is-on', on);
        el.setAttribute('aria-checked', on);
      },
      body(app) {
        const b = app.s.body;
        const sizes = ['XS', 'S', 'M', 'L', 'XL'];
        let size = b.size;
        const ov = app.sheet({
          title: '身材数据',
          html: `
            <div class="ah-fields">
              <label class="field"><span class="field-label">身高（cm）</span><span class="field-row"><input type="number" inputmode="numeric" min="130" max="210" class="js-h" value="${esc(b.height)}" aria-label="身高（厘米）"></span></label>
              <label class="field"><span class="field-label">体重（kg）</span><span class="field-row"><input type="number" inputmode="numeric" min="30" max="150" class="js-w" value="${esc(b.weight)}" aria-label="体重（公斤）"></span></label>
            </div>
            <span class="field-label">常穿尺码</span>
            <div class="ad-tags">${sizes.map((z) => `<button type="button" class="chip ${z === size ? 'is-on' : ''}" data-act="size" data-v="${z}">${z}</button>`).join('')}</div>
            <label class="field"><span class="field-label">鞋码</span><span class="field-row"><input type="number" inputmode="numeric" min="33" max="46" class="js-shoe" value="${esc(b.shoe)}" aria-label="鞋码"></span></label>
            <button type="button" class="btn btn--dark btn--lg btn--block" data-act="save">保存</button>`,
          actions: {
            size: (el) => { size = el.dataset.v; ov.querySelectorAll('.ad-tags .chip').forEach((c) => c.classList.toggle('is-on', c.dataset.v === size)); },
            save: () => {
              const h = +ov.querySelector('.js-h').value, w = +ov.querySelector('.js-w').value, shoe = +ov.querySelector('.js-shoe').value;
              if (!(h >= 130 && h <= 210)) { app.toast('身高请填写 130–210 cm'); return; }
              if (!(w >= 30 && w <= 150)) { app.toast('体重请填写 30–150 kg'); return; }
              if (!(shoe >= 33 && shoe <= 46)) { app.toast('鞋码请填写 33–46'); return; }
              VT.store.update((s) => { s.body = { height: h, weight: w, size, shoe: String(shoe) }; });
              app.closeOverlay(ov);
              app.refresh();
              app.toast('身材数据已更新', { icon: 'check' });
            },
          },
        });
      },
    },
  };
})();
