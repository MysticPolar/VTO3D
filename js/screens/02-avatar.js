/* 上传照片 / 视频 · 创建数字分身 (secondary screen)
   One guided flow in one screen: 选择上传方式 → 照片上传 (5 photos) or 视频上传
   (upload or record about 10 s) → 智能检测与确认 → 生成建模 → 创建完成.
   Contexts: 'launch' (first launch: 启动页 → here → 首页), 'profile' (我的 → 我的形象 →
   更换照片) and 'new' (切换角色 → 新建数字分身: the avatar exists only once
   generation has finished).
   Honest by design: photos and video stay on this device (IndexedDB, js/media.js),
   nothing is sent anywhere, and the checks are only what the browser really
   measures (format, size, resolution, orientation, brightness, sharpness,
   duplicates, video length). Body, face, background and angle recognition need
   an AI service and say 无法检测. Generation is simulated and says so. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const esc = (s) => VT.esc(s);
  const A = 'assets/avatar-onboarding/';

  const PHOTO_SLOTS = [
    { id: 'front', label: '正面全身', ref: A + 'ref/front.webp', body: true },
    { id: 'back', label: '背面全身', ref: A + 'ref/back.webp', body: true },
    { id: 'left', label: '左侧全身', ref: A + 'ref/left.webp', body: true },
    { id: 'right', label: '右侧全身', ref: A + 'ref/right.webp', body: true },
    { id: 'face', label: '面部生活照', ref: A + 'ref/face.webp', body: false },
  ];
  const slotById = Object.fromEntries(PHOTO_SLOTS.map((s) => [s.id, s]));
  const PHOTO_TIPS = [
    ['person-standing', '保持自然站立，展示完整身体'],
    ['scan', '身体与面部清晰，避免过度修图'],
    ['sun', '使用均匀光线，避免逆光'],
    ['tshirt', '穿着相对合身、能看清身体轮廓的普通服装'],
    ['image', '保持背景简洁'],
    ['person', '确保照片中只有目标人物'],
  ];
  const GOOD = [
    ['front', '头脚完整'], ['three_quarter', '自然站立'], ['face', '面部清晰'],
    ['left', '光线充足'], ['back', '背景简洁'], ['right', '单人入镜'],
  ];
  const WRONG = [
    ['cropped_body', '身体被裁剪'], ['blurry_photo', '画面模糊'], ['face_obstructed', '面部遮挡'], ['heavy_filter', '滤镜过重'],
    ['multiple_people', '多人入镜'], ['poor_lighting', '过暗或过曝'], ['cluttered_background', '背景杂乱'],
  ];
  const TURN = [
    ['01_front_fullbody', '正面站立', '面向镜头自然站立'],
    ['02_left_fullbody', '缓慢转身', '展示左右两侧'],
    ['03_back_fullbody', '展示背面', '背对镜头稍作停留'],
    ['04_right_fullbody', '完成一圈', '转回正面结束'],
  ];
  const VIDEO_REQ = [
    ['clock', '时长约 10 秒'], ['scan', '全身入镜'], ['video', '镜头稳定'], ['person', '单人入镜'],
    ['sun', '光线明亮均匀'], ['image', '背景简洁'], ['person-standing', '姿态自然'], ['tshirt', '衣物不宜过松'],
  ];
  const STAGES = [
    ['素材解析中', '分析上传的照片与视频'],
    ['身体模型生成中', '构建身体结构与比例'],
    ['面部特征生成中', '提取面部关键特征'],
    ['细节优化中', '优化肤质与服装贴合'],
    ['创建完成', '生成你的专属数字分身'],
  ];
  const STEP_OF = { method: 1, photo: 1, video: 1, check: 2, gen: 3, done: 4 };
  const TITLE = { photo: '照片上传', video: '视频上传', check: '智能检测与确认', gen: '生成建模', done: '创建完成' };
  /* what the browser can really measure (calibrated on the onboarding kit's examples).
     twin: two photos at least this alike are the same picture. Re-saved, resized or
     brightened copies measured ≥ .987; different angles against one wall ≤ .85 */
  const LIMIT = { minSide: 300, dark: 0.28, bright: 0.94, blown: 0.3, sharp: 30, videoSharp: 12, minSec: 6, maxSec: 20, videoBytes: 200 * 1024 * 1024, twin: 0.96 };

  /* ---------- images: decode, downscale, measure ---------- */
  function readImage(file, max, quality) {
    return new Promise((resolve, reject) => {
      if (!file.type || !file.type.startsWith('image/')) { reject(new Error('type')); return; }
      if (file.size > 25 * 1024 * 1024) { reject(new Error('size')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, (max || 900) / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        try { resolve({ src: cv.toDataURL('image/jpeg', quality || 0.8), name: file.name, w, h }); } catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
  function decode(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
  const sizeOf = (el) => [el.naturalWidth || el.videoWidth, el.naturalHeight || el.videoHeight];
  function toBlob(el, max, quality) {
    const [W, H] = sizeOf(el);
    const k = Math.min(1, max / Math.max(W, H));
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    cv.getContext('2d').drawImage(el, 0, 0, cv.width, cv.height);
    return new Promise((resolve) => cv.toBlob((b) => resolve({ blob: b, w: cv.width, h: cv.height }), 'image/jpeg', quality));
  }
  /** brightness (mean luminance 0–1), share of blown-out pixels, sharpness (variance of the
      Laplacian at ≤ 256 px) and, for photos, a fingerprint for spotting the same photo twice */
  function measure(el, withPrint) {
    const [W, H] = sizeOf(el);
    const k = Math.min(1, 256 / Math.max(W, H));
    const w = Math.max(3, Math.round(W * k)), h = Math.max(3, Math.round(H * k));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(el, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    const Y = new Float32Array(w * h);
    let sum = 0, blown = 0;
    for (let i = 0; i < w * h; i++) {
      const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      Y[i] = v; sum += v; if (v > 248) blown++;
    }
    let ls = 0, ls2 = 0, n = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const l = 4 * Y[i] - Y[i - 1] - Y[i + 1] - Y[i - w] - Y[i + w];
        ls += l; ls2 += l * l; n++;
      }
    }
    const mean = ls / n;
    const out = { bright: sum / (w * h) / 255, blown: blown / (w * h), sharp: ls2 / n - mean * mean };
    if (withPrint) out.print = fingerprint(el);
    return out;
  }
  /** 64×64 luminance, zero-mean and unit-length, so two prints compare by their dot product.
      (An 8×8 hash isn't enough: a back and a side view against one wall share the outline.) */
  function fingerprint(el) {
    const N = 64;
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(el, 0, 0, N, N);
    const d = g.getImageData(0, 0, N, N).data;
    const v = new Float32Array(N * N);
    let mean = 0;
    for (let i = 0; i < v.length; i++) { v[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; mean += v[i]; }
    mean /= v.length;
    let len = 0;
    for (let i = 0; i < v.length; i++) { v[i] -= mean; len += v[i] * v[i]; }
    len = Math.sqrt(len) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= len;
    return v;
  }
  /** 1 = the same picture (see LIMIT.twin) */
  const likeness = (a, b) => { let r = 0; for (let i = 0; i < a.length; i++) r += a[i] * b[i]; return r; };

  /** the problems a photo really has, as concrete fixes */
  function photoProblems(slot, W, H, m) {
    const out = [];
    if (Math.min(W, H) < LIMIT.minSide) out.push({ key: 'size', msg: '分辨率太低，请上传更清晰的原图' });
    if (slot.body && W > H * 1.05) out.push({ key: 'orient', msg: '全身照请竖拍，让头到脚都在画面中' });
    if (m.bright < LIMIT.dark) out.push({ key: 'light', msg: '光线过暗，请在明亮、均匀的光线下拍摄' });
    else if (m.bright > LIMIT.bright || m.blown > LIMIT.blown) out.push({ key: 'light', msg: '画面过曝，请避开强光直射' });
    if (m.sharp < LIMIT.sharp) out.push({ key: 'sharp', msg: '画面模糊，请对焦后重新拍摄' });
    return out;
  }

  /* ---------- video: metadata, length, frames ---------- */
  function once(el, ev, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { el.removeEventListener(ev, ok); reject(new Error('timeout')); }, ms || 8000);
      const ok = () => { clearTimeout(t); el.removeEventListener(ev, ok); resolve(); };
      el.addEventListener(ev, ok);
    });
  }
  /** Chrome's own recordings report an infinite duration until it is read from the end */
  async function lengthOf(v) {
    if (isFinite(v.duration)) return v.duration;
    v.currentTime = 1e101;
    try { await once(v, 'durationchange', 3000); } catch (e) { /* fall back to the recorder's clock */ }
    const d = v.duration;
    v.currentTime = 0;
    return isFinite(d) ? d : NaN;
  }
  async function frameAt(v, t) {
    v.currentTime = t;
    await once(v, 'seeked', 4000);
    return v;
  }
  async function analyzeVideo(blob, name, recordedSec) {
    if (!blob.type || !blob.type.startsWith('video/')) throw new Error('vtype');
    if (blob.size > LIMIT.videoBytes) throw new Error('vsize');
    const url = URL.createObjectURL(blob);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    try { await once(v, 'loadeddata', 10000); } catch (e) { URL.revokeObjectURL(url); throw new Error('vdecode'); }
    let sec = await lengthOf(v);
    if (!isFinite(sec) && recordedSec) sec = recordedSec;
    const W = v.videoWidth, H = v.videoHeight;
    const frames = [];
    const ms = [];
    for (const f of [0.1, 0.36, 0.62, 0.88]) {
      try {
        await frameAt(v, Math.max(0, (isFinite(sec) ? sec : 1) * f));
        ms.push(measure(v));
        frames.push(await toBlob(v, 480, 0.82));
      } catch (e) { /* a frame the browser couldn't seek to */ }
    }
    if (!frames.length) { URL.revokeObjectURL(url); throw new Error('vdecode'); }
    const avg = (k) => ms.reduce((a, m) => a + m[k], 0) / ms.length;
    const m = { bright: avg('bright'), sharp: avg('sharp') };
    const problems = [];
    if (!isFinite(sec)) problems.push({ key: 'length', msg: '无法读取视频时长，请换一段视频' });
    else if (sec < LIMIT.minSec) problems.push({ key: 'length', msg: `视频只有 ${sec.toFixed(1)} 秒，请拍摄约 10 秒` });
    else if (sec > LIMIT.maxSec) problems.push({ key: 'length', msg: `视频有 ${Math.round(sec)} 秒，请控制在 10 秒左右` });
    if (Math.min(W, H) < 360) problems.push({ key: 'size', msg: '视频分辨率太低，请用更高清晰度拍摄' });
    if (m.bright < LIMIT.dark) problems.push({ key: 'light', msg: '画面过暗，请在明亮、均匀的光线下拍摄' });
    if (m.sharp < LIMIT.videoSharp) problems.push({ key: 'sharp', msg: '画面模糊，请保持镜头稳定并对焦' });
    return { url, name, sec, w: W, h: H, frames, m, problems };
  }
  const canRecord = () => !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const coarse = () => !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  /* ---------- the flow (one per visit to this screen) ---------- */
  /** 'launch' (first launch) · 'profile' (我的形象 → 更换照片) · 'new' (切换角色 → 新建数字分身) */
  const ctxOf = (params) => (params && params.ctx === 'new' ? 'new' : params && params.from === 'profile' ? 'profile' : 'launch');
  let flow = null;
  function flowFor(params) {
    if (flow && flow.params === params) return flow;
    if (flow) dropDrafts(flow);
    flow = { params, ctx: ctxOf(params), name: (params && params.name) || '', step: 'method', method: null, photos: {}, video: null, job: null, avatarId: null, focus: null, reveal: 0 };
    return flow;
  }
  /** media of a flow that no avatar refers to (an unfinished visit) */
  function dropDrafts(f) {
    const saved = new Set(VT.media.keysInState(VT.store.get()));
    const keys = Object.values(f.photos).map((p) => p.ref && p.ref.media).concat(f.video ? f.video.frames.map((fr) => fr.media) : []);
    VT.media.remove(keys.filter((k) => k && !saved.has(k)));
    if (f.video && f.video.url) URL.revokeObjectURL(f.video.url);
    if (f.job) f.job.cancelled = true;
  }
  const photoList = (f) => PHOTO_SLOTS.map((s) => f.photos[s.id]).filter(Boolean);
  const photosReady = (f) => PHOTO_SLOTS.every((s) => f.photos[s.id] && f.photos[s.id].status === 'ok');
  const videoReady = (f) => !!(f.video && f.video.status === 'ok');

  /* ---------- markup ---------- */
  function stepper(n) {
    const labels = ['上传素材', '智能检测', '生成建模', '完成'];
    return `<ol class="av-steps" aria-label="创建进度">${labels.map((l, i) => {
      const k = i + 1;
      const st = k < n ? 'done' : k === n ? 'on' : 'todo';
      return `<li class="av-step is-${st}" ${k === n ? 'aria-current="step"' : ''}><span class="av-num">${k < n ? I('check', { size: 13, stroke: 2.6 }) : k}</span><span class="av-lbl">${l}</span></li>`;
    }).join('<li class="av-line" aria-hidden="true"></li>')}</ol>`;
  }
  const img = (src, alt, cls, extra) => VT.ui.img(src, alt, cls, extra);
  const chip = (st, text) => `<span class="av-chip is-${st}">${{ ok: I('check-circle', { size: 15, stroke: 1.9 }), fail: I('alert-circle', { size: 15, stroke: 1.9 }), na: I('info', { size: 15, stroke: 1.8 }), busy: '<i class="av-chip-spin"></i>' }[st]}${text}</span>`;

  function bar(f) {
    const back = f.step === 'done' ? '' : VT.ui.backBtn();
    const title = f.step === 'method' ? '' : `<h1 class="av-bar-t">${TITLE[f.step]}</h1>`;
    const skip = f.ctx === 'launch' && f.step !== 'gen' && f.step !== 'done' ? '<button type="button" class="av-skip" data-act="skip">跳过</button>' : '';
    return `<header class="av-bar">${back}${title}${skip}</header>`;
  }

  function methodStep(f) {
    const lead = f.ctx === 'new'
      ? `上传「${esc(f.name || '新的数字分身')}」清晰的照片或视频，<br>为 TA 生成专属的数字分身，体验全新的虚拟试衣。`
      : '上传清晰的照片或视频，生成专属于你的数字分身，<br>体验全新的虚拟试衣方式。';
    return `
      <h1 class="av-title">上传照片 / 视频，<br>创建数字分身</h1>
      <p class="av-lead">${lead}</p>
      ${stepper(1)}
      <div class="av-methods">
        <button type="button" class="av-method" data-act="method" data-m="photo">
          <span class="av-method-txt">
            <span class="av-method-ic">${I('image', { size: 22, stroke: 1.6 })}</span>
            <b>照片上传</b>
            <em>上传 4 张全身照 + 1 张<span class="av-nw">清晰面部生活照</span></em>
            <small>展示你的身材、体型和面部特征，生成更精准的数字分身</small>
          </span>
          <span class="av-method-pic">${img(A + 'method/photo.webp', '示例：正面全身照')}</span>
          <span class="av-method-go">${I('chevron-right', { size: 18, stroke: 1.8 })}</span>
        </button>
        <button type="button" class="av-method" data-act="method" data-m="video">
          <span class="av-method-txt">
            <span class="av-method-ic">${I('video', { size: 22, stroke: 1.6 })}</span>
            <b>视频上传</b>
            <em>上传或拍摄 10 秒全身展示视频</em>
            <small>按照示范动作拍摄，全方位展示你的身材与气质，效果更真实自然</small>
          </span>
          <span class="av-method-pic av-method-pic--video" aria-hidden="true">${TURN.slice(0, 3).map(([f]) => img(A + `turn/${f}.webp`, '')).join('')}<i>${I('play-filled', { size: 16 })}</i></span>
          <span class="av-method-go">${I('chevron-right', { size: 18, stroke: 1.8 })}</span>
        </button>
      </div>
      <p class="av-safe">${I('shield-check', { size: 15, stroke: 1.7 })}照片和视频只保存在本机，仅用于生成数字分身</p>`;
  }

  function slotHtml(f, slot, i) {
    const p = f.photos[slot.id];
    const input = `<input class="sr-only" type="file" accept="image/*" data-change="photo" data-slot="${slot.id}">`;
    const st = !p ? 'empty' : p.status;
    const src = p ? (p.sample ? slot.ref : VT.media.src(p.ref) || slot.ref) : slot.ref;
    const badge = !p ? '<span class="av-slot-tag">示例</span>'
      : p.status === 'checking' ? '<span class="av-busy"><span class="spinner"></span>检测中…</span>'
      : p.sample ? '<span class="av-slot-tag">示例照片</span>'
      : p.status === 'ok' ? `<span class="av-slot-ok">${I('check', { size: 12, stroke: 2.6 })}通过</span>`
      : `<span class="av-slot-bad">${I('alert-circle', { size: 12, stroke: 2.2 })}需重拍</span>`;
    const acts = !p ? `<label class="av-plus" aria-label="上传${slot.label}">${input}${I('plus', { size: 19, stroke: 1.7 })}</label>`
      : p.status === 'checking' ? ''
      : `<span class="av-slot-acts"><label class="av-act" aria-label="重新选择${slot.label}">${input}${I('refresh', { size: 15, stroke: 1.9 })}</label><button type="button" class="av-act" data-act="photo-del" data-slot="${slot.id}" aria-label="删除${slot.label}">${I('trash', { size: 15, stroke: 1.8 })}</button></span>`;
    return `<div class="av-slot ${i > 2 ? 'av-slot--wide' : ''} ${slot.id === 'face' ? 'av-slot--face' : ''} is-${st}" data-slot="${slot.id}">
      <div class="av-slot-h"><i>${i + 1}</i>${slot.label}</div>
      <div class="av-slot-img">${img(src, p ? (p.sample ? `示例照片：${slot.label}` : `已上传的${slot.label}`) : `示例：${slot.label}`, '', 'loading="lazy"')}${badge}${acts}</div>
      ${p && p.status === 'fail' ? `<p class="av-slot-msg">${esc(p.problems[0].msg)}</p>` : ''}
    </div>`;
  }

  function examples(kind) {
    if (kind === 'good') {
      return `<section class="av-ex"><h2 class="is-ok">${I('check-circle', { size: 16, stroke: 1.9 })}正确示范<em>符合以下要求，建模效果更好</em></h2>
        <ul class="av-ex-row">${GOOD.map(([id, l]) => `<li>${img(A + `ref/${id}.webp`, `正确示范：${l}`, '', 'loading="lazy"')}<span class="is-ok">${I('check', { size: 11, stroke: 2.8 })}${l}</span></li>`).join('')}</ul></section>`;
    }
    const list = kind === 'video' ? WRONG.filter(([id]) => ['blurry_photo', 'multiple_people', 'poor_lighting', 'cropped_body'].includes(id)) : WRONG;
    return `<section class="av-ex"><h2 class="is-bad">${I('alert-circle', { size: 16, stroke: 1.9 })}错误示范<em>请避免以下常见问题</em></h2>
      <ul class="av-ex-row">${list.map(([id, l]) => `<li>${img(A + `wrong/${id}.webp`, `错误示范：${l}`, '', 'loading="lazy"')}<span class="is-bad">${I('close', { size: 11, stroke: 2.8 })}${l}</span></li>`).join('')}</ul></section>`;
  }

  function photoStep(f) {
    const list = photoList(f);
    const bad = list.filter((p) => p.status === 'fail').length;
    return `
      ${stepper(1)}
      <p class="av-lead av-lead--sm">请上传 5 张照片，确保展示完整的身材和面部特征<br>建议在光线充足、背景简洁的环境下拍摄。</p>
      <section class="av-tips-card"><h2>拍摄建议</h2><ul>${PHOTO_TIPS.map(([ic, t]) => `<li>${I(ic, { size: 16, stroke: 1.6 })}<span>${t}</span></li>`).join('')}</ul></section>
      <div class="av-slots">${PHOTO_SLOTS.map((s, i) => slotHtml(f, s, i)).join('')}</div>
      <div class="av-count"><span>已上传 <b>${list.length}</b>/5${bad ? `<em> · ${bad} 张需要重新上传</em>` : ''}</span><button type="button" class="av-demo" data-act="samples">演示：使用示例照片</button></div>
      ${examples('good')}${examples('photo')}`;
  }

  function videoStep(f) {
    const v = f.video;
    const box = !v ? `
      <div class="av-vbox">
        <span class="av-vbox-ic">${I('video', { size: 26, stroke: 1.5 })}</span>
        <b>上传视频 / 开始拍摄</b>
        <small>支持 MP4、MOV，时长约 10 秒，不超过 200MB</small>
        <div class="av-vbox-acts">
          <label class="btn btn--ghost btn--lg av-vbtn">${I('upload', { size: 18 })}上传视频<input class="sr-only" type="file" accept="video/*" data-change="video"></label>
          <button type="button" class="btn btn--dark btn--lg av-vbtn" data-act="record" ${canRecord() || coarse() ? '' : 'disabled'}>${I('camera', { size: 18 })}开始拍摄</button>
        </div>
        ${canRecord() || coarse() ? '' : '<p class="av-vbox-note">当前浏览器不支持直接录制，请使用「上传视频」</p>'}
      </div>`
      : v.status === 'checking' ? `<div class="av-vbox av-vbox--busy"><span class="spinner spinner--dark"></span><b>正在检测视频…</b><small>读取时长并截取画面</small></div>`
      : `
      <div class="av-vcard is-${v.status}">
        ${v.sample ? `<div class="av-vplay">${img(A + 'turn/01_front_fullbody.webp', '示例视频截帧')}</div>`
          : `<button type="button" class="av-vplay" data-act="play" aria-label="播放已上传的视频">${v.frames[0] ? img(VT.media.src(v.frames[0]), '') : ''}<span class="av-mplay" aria-hidden="true">${I('play-filled', { size: 18 })}</span></button>`}
        <div class="av-vmeta">
          <b>${v.sample ? '示例素材（无实际视频）' : esc(v.name)}</b>
          <span>${v.sample ? '演示：4 张示范截帧' : `时长 ${isFinite(v.sec) ? v.sec.toFixed(1) : '—'} 秒 · ${v.w}×${v.h}`}</span>
          ${v.sample ? chip('na', '示例素材') : v.status === 'ok' ? chip('ok', '通过') : chip('fail', '需要重新上传')}
          ${v.status === 'fail' ? `<p class="av-vmsg">${esc(v.problems[0].msg)}</p>` : ''}
        </div>
        <div class="av-vacts">
          <button type="button" class="av-link" data-act="record">${I('camera', { size: 15 })}重新拍摄</button>
          <label class="av-link">${I('upload', { size: 15 })}更换视频<input class="sr-only" type="file" accept="video/*" data-change="video"></label>
          <button type="button" class="av-link" data-act="video-del">${I('trash', { size: 15 })}删除</button>
        </div>
      </div>`;
    return `
      ${stepper(1)}
      <p class="av-lead av-lead--sm">上传或拍摄一段 10 秒的全身展示视频，<br>帮助系统获取多角度身体信息。</p>
      ${box}
      <p class="av-count av-count--end"><button type="button" class="av-demo" data-act="samples">演示：使用示例素材</button></p>
      <section class="av-seq"><h2>请按以下顺序完成动作，保持全身在画面中</h2>
        <ol class="av-turn">${TURN.map(([fr, t, sub], i) => `<li style="--i:${i}">${img(A + `turn/${fr}.webp`, `动作示范：${t}`, '', 'loading="lazy"')}<b><i>${i + 1}</i>${t}</b><span>${sub}</span></li>`).join('')}</ol></section>
      <section class="av-req"><h2>视频拍摄要求</h2><ul>${VIDEO_REQ.map(([ic, t]) => `<li>${I(ic, { size: 19, stroke: 1.6 })}<span>${t}</span></li>`).join('')}</ul></section>
      ${examples('video')}`;
  }

  /** demo only: ?mockFail=avatar.check makes the AI body check fail for 正面全身 (or the video)
      until that material is replaced, so the failure guidance can be reviewed */
  const MOCK_BODY = {
    photo: { slot: 'front', msg: '正面全身照缺少脚部，请重新上传一张包含头部到脚部的完整照片。' },
    video: { slot: 'video', msg: '视频中有画面缺少脚部，请重新拍摄，让头部到脚部始终在画面中。' },
  };
  const mockBody = (f) => (f.mockBody === 'on' ? MOCK_BODY[f.method] : null);

  /** the check rows: only what the browser measured passes or fails; recognition needs an AI
      service and says 无法检测 (the demo's ?mockFail=avatar.check failure says it is simulated) */
  function checkRows(f) {
    const na = (title, sub, ic) => ({ title, sub, ic, st: 'na', text: '无法检测' });
    const res = (title, sub, ic, bad) => ({ title, sub, ic, st: bad ? 'fail' : 'ok', text: bad ? '需要重新上传' : '通过' });
    const ai = '需接入 AI 识别，演示版未检测';
    const body = mockBody(f) ? { title: '身体完整度', sub: '演示：模拟识别结果', ic: 'person-standing', st: 'fail', text: '需要重新上传' } : na('身体完整度', ai, 'person-standing');
    if (f.method === 'video') {
      const v = f.video;
      if (v.sample) return [na('基础检测', '示例素材，未检测', 'shield-check'), body, na('面部清晰度', ai, 'scan'), na('背景简洁度', ai, 'image'), na('光线质量', '示例素材，未检测', 'sun'), na('角度完整性', ai, 'rotate'), na('视频稳定性', ai, 'video')];
      const other = v.problems.filter((p) => p.key !== 'light');
      return [
        res('基础检测', `格式、时长 ${isFinite(v.sec) ? v.sec.toFixed(1) : '—'} 秒、分辨率、画面锐度`, 'shield-check', other.length),
        body,
        na('面部清晰度', '需接入 AI 识别人脸，演示版未检测', 'scan'),
        na('背景简洁度', ai, 'image'),
        res('光线质量', '按截取画面的亮度检测', 'sun', v.problems.length > other.length),
        na('角度完整性', '需 AI 确认是否转身一圈', 'rotate'),
        na('视频稳定性', ai, 'video'),
      ];
    }
    const list = photoList(f);
    const angles = '5 个角度均已上传，实际角度需 AI 识别';
    if (list.some((p) => p.sample)) return [na('基础检测', '示例照片，未检测', 'shield-check'), body, na('面部清晰度', '示例照片，未检测', 'scan'), na('背景简洁度', ai, 'image'), na('光线质量', '示例照片，未检测', 'sun'), na('角度完整性', angles, 'rotate')];
    const face = f.photos.face;
    const dark = list.filter((p) => p.problems.some((x) => x.key === 'light'));
    return [
      res('基础检测', '格式、分辨率、竖拍、锐度、重复照片', 'shield-check', list.some((p) => p.problems.some((x) => x.key !== 'light'))),
      body,
      res('面部清晰度', '按面部照片的锐度检测，未做人脸识别', 'scan', face && face.problems.some((x) => x.key === 'sharp')),
      na('背景简洁度', ai, 'image'),
      res('光线质量', dark.length ? `${dark.map((p) => slotById[p.slot].label).join('、')} 亮度异常` : '5 张照片的亮度均在正常范围', 'sun', dark.length),
      na('角度完整性', angles, 'rotate'),
    ];
  }
  /** concrete fixes for everything that failed */
  function fixes(f) {
    const mock = mockBody(f) ? [Object.assign({ demo: true }, mockBody(f))] : [];
    if (f.method === 'video') return (f.video && !f.video.sample ? f.video.problems.map((p) => ({ msg: p.msg, slot: 'video' })) : []).concat(mock);
    return PHOTO_SLOTS.flatMap((s) => {
      const p = f.photos[s.id];
      return p && !p.sample ? p.problems.map((x) => ({ msg: `「${s.label}」${x.msg}`, slot: s.id })) : [];
    }).concat(mock);
  }

  function checkStep(f) {
    const rows = checkRows(f);
    const fx = fixes(f);
    const mats = f.method === 'video'
      ? `<h3 class="av-mh">视频（1/1）</h3><div class="av-mstrip av-mstrip--video">${f.video.sample ? TURN.map(([fr]) => img(A + `turn/${fr}.webp`, '示例截帧')).join('') : f.video.frames.map((fr, i) => img(VT.media.src(fr), `视频截帧 ${i + 1}`)).join('')}
          ${f.video.sample ? '' : `<button type="button" class="av-mplay" data-act="play" aria-label="播放视频">${I('play-filled', { size: 18 })}</button>`}
          <button type="button" class="av-medit" data-act="edit" data-slot="video" aria-label="更换视频">${I('edit', { size: 14, stroke: 1.9 })}</button></div>`
      : `<h3 class="av-mh">照片（${photoList(f).length}/5）</h3><ul class="av-mstrip">${PHOTO_SLOTS.map((s) => {
        const p = f.photos[s.id];
        return `<li class="${p && p.status === 'fail' ? 'is-bad' : ''}">${img(p.sample ? s.ref : VT.media.src(p.ref), s.label)}<span>${s.label}</span><button type="button" class="av-medit" data-act="edit" data-slot="${s.id}" aria-label="更换${s.label}">${I('edit', { size: 13, stroke: 1.9 })}</button></li>`;
      }).join('')}</ul>`;
    return `
      ${stepper(2)}
      <h2 class="av-h2 av-h2--left">已上传的素材</h2>
      <p class="av-sub">请确认以下素材是否正确，或重新上传。</p>
      <section class="av-mats">${mats}</section>
      <section class="av-checks">
        <h2>素材检测结果</h2>
        <p>已在本机完成基础检测；人体、面部与背景识别需接入 AI 服务</p>
        <ul>${rows.map((r, i) => `<li class="av-crow ${i < f.reveal ? '' : 'is-pending'}" data-i="${i}">
          <span class="av-crow-ic">${I(r.ic, { size: 20, stroke: 1.6 })}</span>
          <span class="av-crow-t"><b>${r.title}</b><em>${r.sub}</em></span>
          <span class="av-crow-st">${chip('busy', '检测中')}${chip(r.st, r.text)}</span></li>`).join('')}</ul>
      </section>
      ${fx.length ? `<section class="av-fix"><h2>${I('alert-circle', { size: 16, stroke: 1.9 })}需要处理</h2><ul>${fx.map((x) => `<li><span>${x.demo ? '<em class="av-fix-demo">演示</em>' : ''}${esc(x.msg)}</span><button type="button" class="av-link" data-act="edit" data-slot="${x.slot}">去重新上传</button></li>`).join('')}</ul></section>` : ''}
      <section class="av-tipbox">${I('bulb', { size: 22, stroke: 1.6 })}<div><b>拍摄要点</b><ol>
        <li>在光线充足的环境下拍摄，避免逆光或昏暗</li><li>穿着相对合身的普通服装，能看清身体轮廓</li><li>确保背景简洁、无杂物，画面中只有一人</li></ol></div></section>`;
  }

  /** The progress ring. A percentage only when the modeling service reports real progress
      (job.progress); with job status alone, as in this demo, an indeterminate arc with the
      current stage (第 n 步，共 5 步). No completion time is ever promised. */
  function ring(job, failed) {
    const known = !!job && job.progress != null;
    const k = job ? job.stage : 0;
    const label = `第 ${k + 1} 步，共 ${STAGES.length} 步：${STAGES[k][0]}`;
    const value = known ? `aria-valuemin="0" aria-valuemax="100" aria-valuenow="${job.progress}"` : `aria-valuetext="${failed ? '生成失败' : label}"`;
    const inner = failed ? `${I('alert-circle', { size: 30, stroke: 1.6 })}<span>生成失败</span>`
      : `${known ? `<b class="js-pct">${job.progress}<em>%</em></b>` : `<b class="js-step">${k + 1}<em>/${STAGES.length}</em></b>`}<span class="js-stage">${STAGES[k][0]}</span>`;
    return `<div class="av-ring ${known || failed ? '' : 'is-indet'}" role="progressbar" aria-label="生成进度" ${value}>
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="av-ring-track" cx="60" cy="60" r="52"/><circle class="av-ring-bar" cx="60" cy="60" r="52" ${known ? `style="stroke-dashoffset:${326.7 * (1 - job.progress / 100)}"` : ''}/></svg>
        <div class="av-ring-in">${inner}</div>
      </div>`;
  }
  /** the five stages; a failed job keeps the stages it finished and marks where it stopped */
  function stageList(job, failed) {
    const k = job ? job.stage : 0;
    return `<ol class="av-stages">${STAGES.map(([t, sub], i) => {
      const st = i < k ? 'is-done' : i === k ? (failed ? 'is-fail' : 'is-on') : '';
      return `<li class="js-st ${st}" data-i="${i}"><i aria-hidden="true">${I(st === 'is-fail' ? 'close' : 'check', { size: 12, stroke: 2.8 })}</i><b>${t}</b><span>${sub}</span></li>`;
    }).join('')}</ol>`;
  }

  function genStep(f) {
    const failed = f.job && f.job.state === 'failed';
    return `
      ${stepper(3)}
      <h2 class="av-h2">${failed ? '生成没有完成' : '正在生成数字分身'}</h2>
      <p class="av-sub av-sub--c">${failed ? '你的素材已保留，可以直接重试' : '我们正在根据你上传的素材，创建专属于你的数字分身。'}</p>
      <div class="av-genbox ${failed ? 'is-failed' : ''}">
        ${ring(f.job, failed)}
        <div class="av-genfig">${img('assets/people/avatar-base.webp', '数字分身预览（示例形象）')}<i class="av-genscan" aria-hidden="true"></i></div>
      </div>
      <p class="av-sim">${I('info', { size: 14, stroke: 1.8 })}${failed ? '演示：模拟生成失败（?mockFail=avatar.generate）' : '模拟进度 · 演示版未接入建模服务'}</p>
      ${failed ? '<p class="av-fail-msg">服务暂时不可用，请稍后重试。重试不会重新上传素材。</p>' : ''}
      ${stageList(f.job, failed)}
      <div class="av-after">${img(A + 'result/face.webp', '')}<span><b>建模完成后</b><em>即可进入虚拟试衣间，体验专属穿搭</em></span></div>`;
  }

  function doneStep(f, s) {
    const rec = VT.store.avatars.active(s);
    const name = VT.store.avatars.nameOf(s, rec);
    return `
      ${stepper(4)}
      <h2 class="av-h2 av-done-t">你的数字分身已创建！</h2>
      <div class="av-result"><div class="av-result-fig">${img('assets/people/avatar-base.webp', `${name}的数字分身：2D 形象预览`)}</div><span class="av-result-tag">2D 形象预览 · 演示版</span></div>
      <div class="av-name"><span>角色</span><b>${esc(name)}</b>${rec.self ? '<em class="set-tag">本人</em>' : ''}<button type="button" class="av-link" data-act="rename">${I('edit', { size: 14, stroke: 1.9 })}修改名称</button></div>
      <p class="av-sub av-sub--c">演示原型使用预设的数字分身形象，并非三维模型；<br>真实产品将基于你上传的素材进行三维重建。</p>
      <div class="av-done-acts">
        <button type="button" class="btn btn--ghost btn--lg" data-act="regen">${I('refresh', { size: 17 })}重新生成</button>
        <button type="button" class="btn btn--ghost btn--lg" data-act="redo">${I('upload', { size: 17 })}更换素材</button>
      </div>`;
  }

  function cta(f) {
    const arrow = `<span class="btn-arrow">${I('arrow-right', { size: 22, stroke: 1.6 })}</span>`;
    if (f.step === 'method') return `<button type="button" class="btn btn--dark btn--xl av-go" data-act="method" data-m="photo">开始上传${arrow}</button>`;
    if (f.step === 'photo' || f.step === 'video') {
      const ready = f.step === 'photo' ? photosReady(f) : videoReady(f);
      const list = photoList(f);
      const hint = f.step === 'photo'
        ? (list.some((p) => p.status === 'checking') ? '正在检测照片…' : list.some((p) => p.status === 'fail') ? '请重新上传标记「需重拍」的照片' : list.length < 5 ? `还差 ${5 - list.length} 张照片` : '')
        : (!f.video ? '请上传或拍摄一段视频' : f.video.status === 'checking' ? '正在检测视频…' : f.video.status === 'fail' ? '请重新上传或拍摄视频' : '');
      return `${hint ? `<p class="av-hint" aria-live="polite">${hint}</p>` : ''}<button type="button" class="btn btn--dark btn--xl av-go" data-act="to-check" ${ready ? '' : 'disabled'}>下一步${arrow}</button>`;
    }
    if (f.step === 'check') {
      const blocked = fixes(f).length > 0;
      return `<div class="av-cta-2"><button type="button" class="btn btn--ghost btn--xl" data-act="reupload">重新上传</button><button type="button" class="btn btn--dark btn--xl" data-act="generate" ${blocked ? 'disabled' : ''}>开始生成建模${arrow}</button></div>`;
    }
    if (f.step === 'gen') {
      return f.job && f.job.state === 'failed'
        ? `<div class="av-cta-2"><button type="button" class="btn btn--ghost btn--xl" data-act="gen-back">返回检查</button><button type="button" class="btn btn--dark btn--xl" data-act="retry">${I('refresh', { size: 18 })}重试</button></div>`
        : '<button type="button" class="btn btn--dark btn--xl av-go" disabled>生成中…</button>';
    }
    if (f.ctx === 'profile') return `<div class="av-cta-2"><button type="button" class="btn btn--ghost btn--xl" data-act="try">去首页试穿</button><button type="button" class="btn btn--dark btn--xl" data-act="done">完成</button></div>`;
    return `<button type="button" class="btn btn--dark btn--xl av-go" data-act="enter">进入虚拟试衣间${arrow}</button>`;
  }

  VT.screens.avatar = {
    title: '上传照片 / 视频，创建数字分身',
    render(app, params) {
      const f = flowFor(params);
      const s = app.s;
      const body = { method: methodStep, photo: photoStep, video: videoStep, check: checkStep, gen: genStep, done: doneStep }[f.step](f, s);
      return `
        ${VT.ui.statusBar('dark')}
        ${bar(f)}
        <div class="scroll av-scroll av-scroll--${f.step}" data-keep-scroll="av-${f.step}">${body}</div>
        <div class="av-cta">${cta(f)}</div>
        <input class="sr-only" type="file" accept="video/*" capture="user" data-change="video" data-native="1" tabindex="-1" aria-hidden="true">`;
    },
    mount(app, el) {
      const f = flowFor(app.params);
      if (f.step === 'check') revealChecks(app, el, f);
      if (f.step === 'gen' && f.job && f.job.state === 'running') paintJob(el, f.job);
      if (f.focus) {
        const slot = el.querySelector(`.av-slot[data-slot="${f.focus}"]`);
        f.focus = null;
        if (slot) { slot.scrollIntoView({ block: 'center' }); slot.classList.add('is-flash'); const t = slot.querySelector('label, button'); if (t) t.focus({ preventScroll: true }); }
      }
    },
    actions: {
      back(app) {
        const f = flowFor(app.params);
        if (f.step === 'photo' || f.step === 'video') go(app, 'method');
        else if (f.step === 'check') go(app, f.method);
        else if (f.step === 'gen') stopGeneration(app, f);
        else app.back();
      },
      method(app, el) {
        const m = el.dataset.m;
        withConsent(app, () => { flowFor(app.params).method = m; go(app, m); });
      },
      async photo(app, el) {
        const file = el.files && el.files[0];
        el.value = '';
        if (!file) return;
        await takePhoto(app, el.dataset.slot, file);
      },
      'photo-del'(app, el) {
        const f = flowFor(app.params);
        const p = f.photos[el.dataset.slot];
        if (p && p.ref && p.ref.media) VT.media.remove([p.ref.media]);
        delete f.photos[el.dataset.slot];
        dedupe(f);
        app.refresh();
        app.toast(`已删除${slotById[el.dataset.slot].label}`);
      },
      samples(app) {
        const f = flowFor(app.params);
        if (f.step === 'photo') {
          dropDrafts({ photos: f.photos, video: null });
          f.photos = Object.fromEntries(PHOTO_SLOTS.map((s) => [s.id, { slot: s.id, status: 'ok', sample: true, problems: [], name: '示例照片' }]));
        } else {
          if (f.video && f.video.url) URL.revokeObjectURL(f.video.url);
          f.video = { status: 'ok', sample: true, problems: [], frames: [], name: '示例素材' };
        }
        replaced(f, f.step === 'photo' ? MOCK_BODY.photo.slot : 'video');
        app.refresh();
        app.toast('已填入示例素材（演示），不会用到你的照片');
      },
      async video(app, el) {
        const file = el.files && el.files[0];
        el.value = '';
        if (!file) return;
        await takeVideo(app, file, file.name);
      },
      record(app) {
        if (canRecord()) recorder(app);
        else if (coarse()) { const n = app.screenEl().querySelector('[data-native="1"]'); if (n) { n.value = ''; n.click(); } }
        else app.toast('当前浏览器不支持直接录制，请使用「上传视频」');
      },
      'video-del'(app) {
        const f = flowFor(app.params);
        if (f.video) { if (f.video.url) URL.revokeObjectURL(f.video.url); VT.media.remove(f.video.frames.map((fr) => fr.media)); }
        f.video = null;
        app.refresh();
      },
      'to-check'(app) {
        const f = flowFor(app.params);
        f.reveal = 0;
        if (failsOnPurpose('avatar.check') && f.mockBody !== 'cleared') f.mockBody = 'on';
        go(app, 'check');
      },
      reupload(app) { const f = flowFor(app.params); go(app, f.method); },
      edit(app, el) {
        const f = flowFor(app.params);
        f.focus = el.dataset.slot === 'video' ? null : el.dataset.slot;
        go(app, f.method);
      },
      play(app) {
        const f = flowFor(app.params);
        if (!f.video || !f.video.url) return;
        app.sheet({ title: '视频预览', html: `<video class="av-vprev" src="${f.video.url}" playsinline controls autoplay aria-label="已上传的视频"></video><p class="sheet-note">视频只保存在本机内存中，用于本次创建</p>` });
      },
      generate(app) { startGeneration(app, flowFor(app.params)); },
      retry(app) { startGeneration(app, flowFor(app.params)); },
      'gen-back'(app) { const f = flowFor(app.params); f.job = null; go(app, 'check'); },
      regen(app) { startGeneration(app, flowFor(app.params)); },
      redo(app) { const f = flowFor(app.params); go(app, f.method || 'method'); },
      rename(app) { renameSheet(app); },
      enter(app) { enter(app, flowFor(app.params)); },
      done(app) { app.back(); app.toast('数字分身已更新', { icon: 'check' }); },
      try(app) {
        const same = app.tab === 'fitting';
        app.drop('avatar');
        app.go('fitting', {}, { anim: same ? 'pop' : 'fade' });
      },
      /* first launch only: use the demo avatar and go straight to 首页 */
      skip(app) {
        VT.store.update((s) => { if (s.avatar.status !== 'ready') { s.avatar.status = 'ready'; s.avatar.demo = true; } });
        app.enterMain();
        app.later(() => app.toast('已使用示例数字分身，可在「我的 → 我的形象」中更换'), 300);
      },
    },
  };

  /** change step in place; the step's heading takes focus for screen readers */
  function go(app, step) {
    flowFor(app.params).step = step;
    app.refresh();
    const h = app.screenEl().querySelector('.av-bar-t, .av-title');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  /* ---------- consent (once, before the first photo or video) ---------- */
  function withConsent(app, then) {
    if (app.s.mediaConsent && app.s.mediaConsent.v === 1) { then(); return; }
    let ok = false;
    const ov = app.sheet({
      title: '上传前请确认',
      html: `<div class="av-consent">
          <p class="sheet-lead">人脸和身材照片属于敏感个人信息。上传前，请了解我们如何使用它们：</p>
          <ul>
            <li>${I('scan', { size: 18, stroke: 1.6 })}<span><b>用途</b>照片和视频仅用于生成你的数字分身和虚拟试衣效果</span></li>
            <li>${I('shield-check', { size: 18, stroke: 1.6 })}<span><b>存储</b>演示版只保存在本设备，不会上传到任何服务器；可随时在「我的形象」或「隐私与安全」中删除</span></li>
            <li>${I('info', { size: 18, stroke: 1.6 })}<span><b>第三方处理</b>正式版将由第三方 AI 建模服务处理（服务商以正式协议为准），传输前会再次征得你的同意</span></li>
          </ul>
          <label class="av-agree"><input type="checkbox" class="js-agree"><span class="av-box" aria-hidden="true">${I('check', { size: 13, stroke: 2.8 })}</span>我已阅读并同意《敏感个人信息处理规则》</label>
          <div class="sheet-actions"><button type="button" class="btn btn--ghost btn--lg" data-act="no">不同意</button><button type="button" class="btn btn--dark btn--lg" data-act="yes" disabled>同意并继续</button></div>
        </div>`,
      actions: {
        no: () => app.closeOverlay(ov),
        yes: () => {
          ok = true;
          VT.store.update((s) => { s.mediaConsent = { v: 1, at: Date.now() }; });
          app.closeOverlay(ov, true);
          then();
        },
      },
      onClose: () => { if (!ok) app.toast('需要你的同意才能上传照片或视频'); },
    });
    const box = ov.querySelector('.js-agree');
    box.addEventListener('change', () => { ov.querySelector('[data-act="yes"]').disabled = !box.checked; });
  }

  /* ---------- photos ---------- */
  async function takePhoto(app, slotId, file) {
    const f = flowFor(app.params);
    const slot = slotById[slotId];
    const prev = f.photos[slotId];
    if (!file.type || !file.type.startsWith('image/')) { app.toast('请选择图片文件（JPG / PNG / HEIC 等）'); return; }
    if (file.size > 25 * 1024 * 1024) { app.toast('图片超过 25MB，请换一张'); return; }
    f.photos[slotId] = { slot: slotId, status: 'checking', name: file.name, problems: [] };
    app.refresh();
    let d = null;
    try {
      d = await decode(file);
      const W = d.img.naturalWidth, H = d.img.naturalHeight;
      const m = measure(d.img, true);
      const out = await toBlob(d.img, 900, 0.82);
      const media = await VT.media.put(out.blob);
      if (prev && prev.ref && prev.ref.media) VT.media.remove([prev.ref.media]);
      if (flow !== f) { VT.media.remove([media]); return; } // the screen was left meanwhile
      f.photos[slotId] = { slot: slotId, status: 'ok', name: file.name, ref: { media, name: file.name, w: out.w, h: out.h }, m, problems: photoProblems(slot, W, H, m) };
      dedupe(f);
      replaced(f, slotId);
    } catch (e) {
      if (prev) f.photos[slotId] = prev; else delete f.photos[slotId];
      app.toast('无法读取这张图片，请换一张试试');
    } finally {
      if (d) URL.revokeObjectURL(d.url);
    }
    if (flow === f) app.refresh();
  }
  /** new material in the slot the demo's simulated AI check flagged clears that failure */
  function replaced(f, slot) {
    if (f.mockBody === 'on' && MOCK_BODY[f.method] && MOCK_BODY[f.method].slot === slot) f.mockBody = 'cleared';
  }
  /** the same photo in two slots: the later slot has to be replaced */
  function dedupe(f) {
    const seen = [];
    PHOTO_SLOTS.forEach((s) => {
      const p = f.photos[s.id];
      if (!p || !p.m || p.sample) return;
      p.problems = p.problems.filter((x) => x.key !== 'dup');
      const twin = seen.find((q) => likeness(q.m.print, p.m.print) >= LIMIT.twin);
      if (twin) p.problems.push({ key: 'dup', msg: `与「${slotById[twin.slot].label}」是同一张照片，请换一张` });
      seen.push(p);
    });
    PHOTO_SLOTS.forEach((s) => { const p = f.photos[s.id]; if (p && p.status !== 'checking' && !p.sample) p.status = p.problems.length ? 'fail' : 'ok'; });
  }

  /* ---------- video ---------- */
  async function takeVideo(app, blob, name, recordedSec) {
    const f = flowFor(app.params);
    if (!blob.type || !blob.type.startsWith('video/')) { app.toast('请选择视频文件（MP4 / MOV 等）'); return; }
    if (blob.size > LIMIT.videoBytes) { app.toast('视频超过 200MB，请缩短或压缩后再上传'); return; }
    const prev = f.video;
    f.video = { status: 'checking', name, frames: [], problems: [] };
    app.refresh();
    try {
      const v = await analyzeVideo(blob, name, recordedSec);
      const frames = [];
      for (const fr of v.frames) frames.push({ media: await VT.media.put(fr.blob), w: fr.w, h: fr.h });
      if (prev) { if (prev.url) URL.revokeObjectURL(prev.url); VT.media.remove(prev.frames.map((x) => x.media)); }
      if (flow !== f) { URL.revokeObjectURL(v.url); VT.media.remove(frames.map((x) => x.media)); return; }
      f.video = { status: v.problems.length ? 'fail' : 'ok', name, url: v.url, sec: v.sec, w: v.w, h: v.h, frames, m: v.m, problems: v.problems };
      replaced(f, 'video');
    } catch (e) {
      f.video = prev || null;
      app.toast(e.message === 'vdecode' ? '无法读取这段视频，请上传 MP4 或 MOV 格式' : '视频检测失败，请重试');
    }
    if (flow === f) app.refresh();
  }

  /** record about 10 s with the camera: 3-2-1, then the turn sequence with a timer */
  function recorder(app) {
    let stream = null, rec = null, chunks = [], closed = false, facing = 'user', timer = null, started = 0;
    const SECS = 10;
    const ov = app.layer({
      cls: 'cam av-rec', label: '拍摄展示视频',
      html: `
        <div class="cam-view" data-state="wait">
          <video class="cam-video is-mirror" playsinline muted autoplay aria-label="摄像头实时画面"></video>
          <i class="av-rec-frame" aria-hidden="true"></i>
          <div class="cam-top">
            <button type="button" class="cam-btn" data-act="close" aria-label="关闭拍摄">${I('close', { size: 22, stroke: 2 })}</button>
            <span class="cam-title"><i class="cam-rec" aria-hidden="true"></i><span class="js-time">00:00 / 00:${SECS}</span></span>
            <button type="button" class="cam-btn" data-act="flip" aria-label="切换前后摄像头">${I('switch-camera', { size: 22, stroke: 1.8 })}</button>
          </div>
          <div class="cam-panel" data-state="wait">
            <div class="cam-wait"><span class="spinner"></span><p>正在打开摄像头…</p></div>
            <div class="cam-err"><span class="cam-ic">${I('info', { size: 28, stroke: 1.6 })}</span><h2 class="cam-err-t"></h2><p class="cam-err-s"></p>
              <button type="button" class="btn btn--light btn--lg btn--block" data-act="start">重试</button>
              <button type="button" class="btn cam-cancel btn--lg btn--block" data-act="close">返回上传视频</button></div>
          </div>
          <b class="av-rec-count" aria-live="assertive"></b>
          <div class="av-rec-bar">
            <ol class="av-rec-steps">${TURN.map(([, t], i) => `<li data-i="${i}"><i>${i + 1}</i>${t}</li>`).join('')}</ol>
            <p class="av-rec-tip js-tip">站到能拍到全身的位置，点击开始后有 3 秒准备</p>
            <button type="button" class="av-rec-btn" data-act="shoot" aria-label="开始录制" disabled><i></i></button>
          </div>
        </div>`,
      actions: {
        close: () => app.closeOverlay(ov),
        start: () => open(),
        flip: () => { facing = facing === 'user' ? 'environment' : 'user'; open(); },
        shoot: () => (rec && rec.state === 'recording' ? stop() : countdown()),
      },
      onClose: () => { closed = true; clearInterval(timer); if (rec && rec.state === 'recording') { rec.onstop = null; rec.stop(); } release(); },
    });
    const video = ov.querySelector('.cam-video');
    const view = ov.querySelector('.cam-view');
    const panel = ov.querySelector('.cam-panel');
    const btn = ov.querySelector('.av-rec-btn');
    const setState = (st) => { view.dataset.state = st; panel.dataset.state = st; btn.disabled = st !== 'live'; };
    const release = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; video.srcObject = null; };
    async function open() {
      if (VT.camera.blockedByHost()) { fail({ name: 'NotAllowedError' }); return; }
      setState('wait');
      release();
      try {
        const got = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (closed) { got.getTracks().forEach((t) => t.stop()); return; }
        stream = got;
        video.srcObject = stream;
        const set = stream.getVideoTracks()[0].getSettings ? stream.getVideoTracks()[0].getSettings() : {};
        video.classList.toggle('is-mirror', (set.facingMode || facing) !== 'environment');
        await video.play().catch(() => {});
        if (closed) return;
        setState('live');
        btn.focus({ preventScroll: true });
      } catch (e) { if (!closed) fail(e); }
    }
    function fail(e) {
      const c = VT.camera.errorCopy(e);
      ov.querySelector('.cam-err-t').textContent = c.t;
      ov.querySelector('.cam-err-s').textContent = c.s;
      ov.querySelector('.cam-err [data-act="start"]').hidden = c.retry === false;
      setState('error');
    }
    function countdown() {
      btn.disabled = true;
      const out = ov.querySelector('.av-rec-count');
      let n = VT.reducedMotion() ? 1 : 3;
      const tickDown = () => {
        if (closed) return;
        if (n === 0) { out.textContent = ''; begin(); return; }
        out.textContent = n; n -= 1;
        app.later(tickDown, 1000);
      };
      tickDown();
    }
    function begin() {
      const type = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
      try { rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined); } catch (e) { fail({ name: 'Unsupported' }); return; }
      chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        const sec = (performance.now() - started) / 1000;
        const blob = new Blob(chunks, { type: (rec.mimeType || type || 'video/webm').split(';')[0] });
        app.closeOverlay(ov, true);
        takeVideo(app, blob, `录制视频.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`, sec);
      };
      rec.start(250);
      started = performance.now();
      btn.disabled = false;
      btn.setAttribute('aria-label', '停止录制');
      view.classList.add('is-rec');
      timer = setInterval(() => {
        const t = (performance.now() - started) / 1000;
        ov.querySelector('.js-time').textContent = `00:${String(Math.min(SECS, Math.floor(t))).padStart(2, '0')} / 00:${SECS}`;
        const k = Math.min(TURN.length - 1, Math.floor(t / (SECS / TURN.length)));
        ov.querySelectorAll('.av-rec-steps li').forEach((li, i) => { li.classList.toggle('is-on', i === k); li.classList.toggle('is-done', i < k); });
        ov.querySelector('.js-tip').textContent = TURN[k][2];
        if (t >= SECS) stop();
      }, 200);
    }
    function stop() {
      clearInterval(timer);
      if (rec && rec.state === 'recording') rec.stop();
    }
    open();
    return ov;
  }

  /* ---------- the check screen reveals its rows one by one ---------- */
  function revealChecks(app, el, f) {
    const rows = el.querySelectorAll('.av-crow');
    if (VT.reducedMotion()) { f.reveal = rows.length; rows.forEach((r) => r.classList.remove('is-pending')); return; }
    const next = () => {
      if (flow !== f || f.step !== 'check' || f.reveal >= rows.length) return;
      const r = app.screenEl().querySelector(`.av-crow[data-i="${f.reveal}"]`);
      if (r) r.classList.remove('is-pending');
      f.reveal += 1;
      app.later(next, 260);
    };
    app.later(next, 300);
  }

  /* ---------- simulated generation (no modeling service in this prototype) ---------- */
  /** demo failures, named like the API methods: ?mockFail=avatar.generate,avatar.check
      or localStorage['vto-mock-fail'] ('*' = all) */
  function failsOnPurpose(name) {
    let v = '';
    try { v = new URLSearchParams(window.location.search).get('mockFail') || window.localStorage.getItem('vto-mock-fail') || ''; } catch (e) { /* ignore */ }
    return v.split(',').map((x) => x.trim()).some((x) => x === '*' || x === name);
  }
  /** a simulated job: the stages advance on a timer (6.4 s), with no percentage (job.progress
      stays null, as with a service that only reports its status) */
  function simulate(job, onStage, onEnd) {
    const last = STAGES.length - 1;
    const tick = (now) => {
      if (job.cancelled) return;
      const p = Math.min(1, (now - job.t0) / job.total);
      if (job.failAt != null && p >= job.failAt) { onEnd(false); return; }
      const stage = p < 1 ? Math.min(last - 1, Math.floor(p * last)) : last;
      if (stage !== job.stage) { job.stage = stage; onStage(); }
      if (p < 1) requestAnimationFrame(tick);
      else onEnd(true);
    };
    requestAnimationFrame(tick);
  }
  function newJob(fail) {
    return { state: 'running', stage: 0, progress: null, t0: performance.now(), total: VT.reducedMotion() ? 1200 : 6400, failAt: fail ? 0.55 : null, cancelled: false };
  }
  function startGeneration(app, f) {
    if (f.job && f.job.state === 'running') return; // one job at a time, however often it's tapped
    const job = newJob(failsOnPurpose('avatar.generate'));
    f.job = job;
    go(app, 'gen');
    const paint = () => { const el = app.screenEl(); if (flow === f && el && el.dataset.screen === 'avatar' && f.step === 'gen') paintJob(el, job); };
    simulate(job, paint, (ok) => {
      if (flow !== f) return;
      if (!ok) {
        job.state = 'failed';
        if (f.step === 'gen') app.refresh();
        app.toast('生成失败，可以直接重试');
        return;
      }
      paint();
      app.later(() => finish(app, f), 450);
    });
  }
  function paintJob(el, job) {
    const last = STAGES.length - 1;
    const step = el.querySelector('.js-step');
    if (step) step.innerHTML = `${job.stage + 1}<em>/${STAGES.length}</em>`;
    const st = el.querySelector('.js-stage');
    if (st) st.textContent = STAGES[job.stage][0];
    const ringEl = el.querySelector('.av-ring');
    if (ringEl) {
      ringEl.classList.toggle('is-complete', job.stage === last);
      if (job.progress == null) ringEl.setAttribute('aria-valuetext', `第 ${job.stage + 1} 步，共 ${STAGES.length} 步：${STAGES[job.stage][0]}`);
    }
    el.querySelectorAll('.js-st').forEach((li, i) => { li.classList.toggle('is-done', i < job.stage || job.stage === last); li.classList.toggle('is-on', i === job.stage && job.stage < last); });
  }
  async function stopGeneration(app, f) {
    if (!f.job || f.job.state !== 'running') { f.job = null; go(app, 'check'); return; }
    const ok = await app.dialog({ title: '停止生成？', text: '已上传的素材会保留，之后可以重新开始生成。', ok: '停止', cancel: '继续生成' });
    if (!ok || !f.job || f.job.state !== 'running') return;
    f.job.cancelled = true;
    f.job = null;
    go(app, 'check');
    app.toast('已取消生成');
  }

  /** generation finished: the avatar gets the materials (the new one is created here) */
  function finish(app, f) {
    if (flow !== f || !f.job || f.job.cancelled) return;
    f.job.state = 'done';
    const sample = f.method === 'video' ? f.video.sample : photoList(f).some((p) => p.sample);
    const materials = f.method === 'video'
      ? { method: 'video', video: { name: f.video.name, sec: f.video.sec, sample: !!f.video.sample, frames: f.video.sample ? [] : f.video.frames.map((fr) => ({ media: fr.media, w: fr.w, h: fr.h })) } }
      : { method: 'photo', photos: Object.fromEntries(PHOTO_SLOTS.map((s) => { const p = f.photos[s.id]; return [s.id, p.sample ? { src: s.ref, name: '示例照片', sample: true } : Object.assign({}, p.ref)]; })) };
    const front = f.method === 'video' ? (materials.video.frames[0] || null) : materials.photos.front;
    const portrait = f.method === 'photo' ? materials.photos.face : null;
    const avatar = { status: 'ready', generatedAt: Date.now(), demo: true, materials, fullbody: front && Object.assign({}, front, { name: front.name || '视频截帧' }), portrait };
    if (f.ctx === 'new' && !f.avatarId) {
      f.avatarId = VT.store.avatars.create(f.name || '新的数字分身', avatar);
    } else {
      const keep = new Set(VT.media.keysOf(avatar));
      const old = VT.media.keysOf(VT.store.get().avatar).filter((k) => !keep.has(k));
      VT.store.update((s) => { Object.assign(s.avatar, avatar); });
      VT.media.remove(old);
      if (!f.avatarId) f.avatarId = VT.store.get().activeAvatar;
    }
    go(app, 'done');
    if (sample) app.toast('已使用示例素材生成演示分身');
  }

  function enter(app, f) {
    if (f.ctx === 'launch') { app.enterMain(); return; }
    const name = VT.store.avatars.nameOf(app.s, VT.store.avatars.active(app.s));
    const same = app.tab === 'fitting';
    app.drop('avatar'); // the finished flow leaves every stack
    app.go('fitting', {}, { anim: same ? 'pop' : 'fade' });
    if (f.ctx === 'new') app.later(() => app.toast(`已切换到「${name}」`, { icon: 'check' }), 300);
  }

  function renameSheet(app) {
    const s = app.s;
    const rec = VT.store.avatars.active(s);
    const max = rec.self ? 12 : 8;
    const ov = app.sheet({
      title: '修改名称',
      html: `<label class="field"><span class="field-label">${rec.self ? '昵称（本人的名称即你的昵称）' : '名称'}</span><span class="field-row"><input type="text" maxlength="${max}" class="js-name" value="${esc(VT.store.avatars.nameOf(s, rec))}" aria-label="数字分身名称" data-enter="save" data-autofocus></span></label>
        <button type="button" class="btn btn--dark btn--lg btn--block" data-act="save">保存</button>`,
      actions: {
        save: () => {
          const name = ov.querySelector('.js-name').value.trim();
          if (!name) { app.toast(rec.self ? '昵称不能为空' : '请填写名称'); return; }
          if (rec.self) VT.store.update((st) => { st.profile.name = name; });
          else VT.store.avatars.rename(rec.id, name);
          app.closeOverlay(ov);
          app.refresh();
          app.toast('名称已保存', { icon: 'check' });
        },
      },
    });
  }

  /* ---------- 我的形象 → 重新生成: the same simulated generation in a layer ---------- */
  function run(app) {
    const job = newJob(false);
    const ov = app.layer({
      cls: 'av-gen', label: '正在生成数字分身',
      html: `<div class="av-gen-in">
          ${VT.ui.statusBar('dark')}
          <div class="av-gen-head">${stepper(3)}</div>
          <div class="av-gen-body">
            <h2 class="av-h2">正在重新生成数字分身</h2>
            <div class="av-genbox">
              ${ring(job, false)}
              <div class="av-genfig">${img('assets/people/avatar-base.webp', '数字分身预览（示例形象）')}<i class="av-genscan" aria-hidden="true"></i></div>
            </div>
            <p class="av-sim">${I('info', { size: 14, stroke: 1.8 })}模拟进度 · 演示版未接入建模服务</p>
            ${stageList(job, false)}
          </div>
          <div class="av-gen-foot"><button type="button" class="btn btn--ghost btn--lg btn--block" data-act="cancel">取消</button></div>
        </div>`,
      actions: { cancel() { app.closeOverlay(ov); } },
      // 取消, Esc and back all cancel the job the same way (until the result is shown)
      onClose: () => { if (job.state === 'running') { job.cancelled = true; app.toast('已取消生成'); } },
    });
    paintJob(ov, job);
    simulate(job, () => paintJob(ov, job), () => {
      app.later(() => {
        if (job.cancelled) return;
        job.state = 'done';
        VT.store.update((s) => { s.avatar.status = 'ready'; s.avatar.generatedAt = Date.now(); s.avatar.demo = true; });
        ov.querySelector('.av-gen-head').innerHTML = stepper(4);
        ov.querySelector('.av-gen-body').innerHTML = `<h2 class="av-h2 av-done-t">数字分身已更新</h2>
          <div class="av-result"><div class="av-result-fig">${img('assets/people/avatar-base.webp', '数字分身：2D 形象预览')}</div><span class="av-result-tag">2D 形象预览 · 演示版</span></div>
          <p class="av-sub av-sub--c">演示原型使用预设的数字分身形象，并非三维模型</p>`;
        ov.querySelector('.av-gen-foot').innerHTML = `<button type="button" class="btn btn--dark btn--xl btn--block" data-act="done">完成</button><button type="button" class="btn btn--ghost btn--lg btn--block" data-act="try">去首页试穿</button>`;
        ov._actions.done = () => { app.closeOverlay(ov, true); app.refresh(); app.toast('数字分身已更新', { icon: 'check' }); };
        ov._actions.try = () => { app.go('fitting'); };
        const b = ov.querySelector('[data-act="done"]');
        if (b) b.focus({ preventScroll: true });
      }, 450);
    });
  }

  VT.avatarGen = { run, readImage };
})();
