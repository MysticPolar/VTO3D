"""Acceptance test used to verify the HTML prototype (167 checks, all passing on v2).

Port these CHECKS (not the selectors) to the web app's Playwright suite.
Run against the prototype:
  cd ../prototype && python3 -m http.server 8765
  pip install playwright && playwright install chromium
  python3 flow_test_v2.py            # or PROTOTYPE_URL=http://127.0.0.1:8765/index.html
Runs Chromium with a fake camera so the getUserMedia path is exercised."""
import asyncio, os
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, 'fixtures') + '/'
BASE = os.environ.get('PROTOTYPE_URL', 'http://127.0.0.1:8765/index.html')
ORIGIN = BASE.split('/index.html')[0].rstrip('/')
OUT = os.path.join(HERE, 'out') + '/'
log, errors = [], []
TABS = ['fitting', 'plaza', 'wardrobe', 'stylist', 'profile']
LABELS = ['首页', '购物广场', '个人衣橱', 'AI造型师', '我的']


def check(name, cond, info=''):
    log.append(('PASS ' if cond else 'FAIL ') + name + (f'  [{info}]' if info else ''))


async def snap(pg, name):
    await pg.wait_for_timeout(300)
    await pg.locator('.phone-screen').screenshot(path=OUT + name + '.png')


async def cur(pg):
    return await pg.evaluate('VT.liveApp.cur.id')


async def avatar_render(pg, want=None, scope='.sim-app', timeout=10000):
    """首页's body image once the swap has settled (images can take seconds on a real network):
    waits for exactly one current image (showing `want`, if given) and returns the current
    renders joined by '+', so a stacked image fails the check instead of crashing the run."""
    sel = f'{scope} .screen.is-active .fit-avatar-img.is-cur'
    cond = 'c.length === 1' + (f" && c[0].dataset.render === '{want}'" if want else '')
    try:
        await pg.wait_for_function(f"() => {{ const c = document.querySelectorAll('{sel}'); return {cond}; }}", timeout=timeout)
    except Exception:
        pass
    return await pg.evaluate(f"[...document.querySelectorAll('{sel}')].map(i => i.dataset.render).join('+')")


# ---- 创建数字分身 (screen 'avatar'): five photos, the checks the browser really runs, generation
PHOTOS = [('front', 'me_full.jpg'), ('back', 'body_back.webp'), ('left', 'body_left.webp'), ('right', 'body_right.webp'), ('face', 'me_face.jpg')]
SLOTS = """(root) => [...document.querySelectorAll(root + ' .screen.is-active .av-slot')].map((s) => {
  const m = s.querySelector('.av-slot-msg');
  return s.dataset.slot + ':' + (s.className.match(/is-(empty|checking|ok|fail)\\b/) || [])[1] + (m ? ':' + m.textContent : '');
})"""
ROWS = "(root) => [...document.querySelectorAll(root + ' .screen.is-active .av-crow')].map((r) => r.querySelector('b').textContent + ':' + r.querySelector('.av-chip:last-child').textContent)"
IDB_COUNT = """new Promise((ok) => {
  const r = indexedDB.open('vt-prototype-media');
  r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('blobs')) { ok(0); return; } const c = db.transaction('blobs').objectStore('blobs').count(); c.onsuccess = () => ok(c.result); };
  r.onerror = () => ok(-1);
})"""


async def consent(pg, root):
    """上传前请确认: tick the box and agree (the sheet only comes before the first photo or video)"""
    agree = pg.locator(f'{root} .ov .av-agree'.strip())
    if await agree.count():
        await agree.click()
        await pg.locator(f'{root} .ov [data-act="yes"]'.strip()).click()
        await pg.wait_for_timeout(400)


async def put_photo(pg, root, slot, name):
    """choose a file for one photo slot and wait until the browser has checked it"""
    sel = f'{root} .screen.is-active'.strip()
    await pg.locator(f'{sel} input[data-change="photo"][data-slot="{slot}"]').set_input_files(FIX + name)
    await pg.wait_for_timeout(150)
    await pg.wait_for_selector(f'{sel} .av-slot[data-slot="{slot}"]:is(.is-ok, .is-fail)', timeout=8000)


async def checked(pg, root):
    """the 智能检测 rows once they have all been revealed"""
    await pg.wait_for_function(f"() => document.querySelectorAll('{root} .screen.is-active .av-crow').length > 0 && !document.querySelector('{root} .screen.is-active .av-crow.is-pending')")
    return await pg.evaluate(ROWS, root)


async def make_avatar(pg, root, samples=False, tap='click'):
    """on the open avatar screen: 照片上传 (the five fixtures, or the labelled demo samples) → 下一步
    → 智能检测 → 开始生成建模 → 创建完成. Returns the 智能检测 rows."""
    a = pg.locator(f'{root} .screen.is-active'.strip())
    await a.locator('.av-method[data-m="photo"]').click()
    await pg.wait_for_timeout(400)
    await consent(pg, root)
    if samples:
        await a.locator('[data-act="samples"]').click()
    else:
        for slot, name in PHOTOS:
            await put_photo(pg, root, slot, name)
    await a.locator('[data-act="to-check"]').click()
    rows = await checked(pg, root)
    await getattr(a.locator('[data-act="generate"]'), tap)()
    await a.locator('.av-result').wait_for(timeout=15000)
    return rows


async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
        await ctx.grant_permissions(['camera'], origin=ORIGIN)
        pg = await ctx.new_page()
        pg.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
        pg.on('requestfailed', lambda r: errors.append('requestfailed: ' + r.url))
        await pg.goto(BASE)
        await pg.evaluate('localStorage.clear()')
        await pg.goto(BASE)
        await pg.evaluate('document.fonts.ready')
        await pg.wait_for_timeout(900)
        app = pg.locator('.sim-app')

        # ---- AC8: showcase shows exactly five primary screens, in order
        ids = await pg.eval_on_selector_all('.board-phone', 'els => els.map(e => e.dataset.screen)')
        check('showcase has 5 primary phones in order', ids == TABS, ','.join(ids))
        caps = await pg.eval_on_selector_all('.board-cap h2', 'els => els.map(e => e.textContent.trim())')
        check('captions numbered 1–5', [c[:2] for c in caps] == ['1.', '2.', '3.', '4.', '5.'], ' | '.join(caps))
        sub = await pg.locator('.board-sub').inner_text()
        check('subtitle per spec', sub.replace('\n', '') .replace(' ', '') == '虚拟试衣·个人衣橱·智能购物', sub)

        # ---- first launch from the simulator's 启动页 entry → onboarding → avatar → 首页
        await pg.click('.board-phone[data-screen="fitting"]')
        await pg.wait_for_timeout(500)
        check('board phone opens simulator on 首页', await cur(pg) == 'fitting')
        await pg.click('.sim-list button[data-screen="onboarding"]')
        await pg.wait_for_timeout(400)
        check('启动页 reachable as a flow screen', await cur(pg) == 'onboarding')
        await snap(pg, '01_onboarding')
        await app.locator('[data-act="start"]').click()
        await pg.wait_for_timeout(600)
        check('开始体验 → avatar creation', await cur(pg) == 'avatar')
        av = app.locator('.screen.is-active')
        check('选择上传方式: 照片上传 or 视频上传, 跳过 kept, 4-step progress', await av.locator('.av-method').count() == 2 and await av.locator('.av-skip').count() == 1 and await av.locator('.av-steps .av-step').count() == 4)
        await av.locator('.av-method[data-m="photo"]').click()
        await pg.wait_for_timeout(400)
        terms = await app.locator('.ov .av-consent').inner_text()
        locked = await app.locator('.ov [data-act="yes"]').is_disabled()
        await app.locator('.ov [data-act="no"]').click()
        await pg.wait_for_timeout(400)
        t = await app.locator('.toast').inner_text()
        check('consent before any upload (purpose, on-device, deletion, third-party AI); 不同意 uploads nothing', locked and '第三方' in terms and '删除' in terms and await av.locator('.av-method').count() == 2 and '同意' in t, t)
        await av.locator('.av-method[data-m="photo"]').click()
        await pg.wait_for_timeout(400)
        await consent(pg, '.sim-app')
        check('consent stored', await pg.evaluate('VT.store.get().mediaConsent.v') == 1)
        labels = [x.replace('\n', '').strip() for x in await av.locator('.av-slot-h').all_inner_texts()]
        refs = await av.locator('.av-slot.is-empty .av-slot-img img[src*="avatar-onboarding/ref/"]').count()
        check('照片上传: 4 full-body angles + 面部生活照, each with an example; tips; 正确 / 错误示范', labels == ['1正面全身', '2背面全身', '3左侧全身', '4右侧全身', '5面部生活照'] and refs == 5 and await av.locator('.av-tips-card li').count() == 6 and await av.locator('.av-ex').count() == 2, ','.join(labels))
        check('下一步 disabled until the photos pass', await av.locator('[data-act="to-check"]').is_disabled())
        await av.locator('input[data-slot="front"]').set_input_files(FIX + 'not_image.txt')
        await pg.wait_for_timeout(500)
        t = await app.locator('.toast').inner_text()
        check('non-image rejected', '图片' in t, t)
        for slot, name in [('front', 'me_full.jpg'), ('back', 'body_back.webp'), ('left', 'too_dark.webp'), ('right', 'body_back.webp'), ('face', 'too_blurry.webp')]:
            await put_photo(pg, '.sim-app', slot, name)
        st = await pg.evaluate(SLOTS, '.sim-app')
        check('real checks: too dark, blurry and the same photo twice → 需重拍 with the fix', st[0] == 'front:ok' and st[1] == 'back:ok' and '光线过暗' in st[2] and '同一张照片' in st[3] and '模糊' in st[4] and await av.locator('[data-act="to-check"]').is_disabled(), ' | '.join(st))
        await av.locator('.av-slot[data-slot="face"] [data-act="photo-del"]').click()
        await pg.wait_for_timeout(300)
        check('delete a photo → its slot shows the example again', (await pg.evaluate(SLOTS, '.sim-app'))[4] == 'face:empty')
        for slot, name in PHOTOS[2:]:
            await put_photo(pg, '.sim-app', slot, name)
        st = await pg.evaluate(SLOTS, '.sim-app')
        check('replacing them: 5 × 通过, 下一步 enabled', all(s.endswith(':ok') for s in st) and not await av.locator('[data-act="to-check"]').is_disabled(), ' | '.join(st))
        await pg.wait_for_timeout(300)
        n_idb = await pg.evaluate(IDB_COUNT)
        raw = await pg.evaluate("Object.keys(localStorage).some((k) => String(localStorage.getItem(k)).includes('data:image'))")
        check('photos stay on this device in IndexedDB, never in localStorage', n_idb == 5 and not raw, f'{n_idb} blobs, data URLs in localStorage: {raw}')
        await av.locator('[data-act="to-check"]').click()
        rows = await checked(pg, '.sim-app')
        check('智能检测: what the browser measured 通过, AI-only checks 无法检测', rows == ['基础检测:通过', '身体完整度:无法检测', '面部清晰度:通过', '背景简洁度:无法检测', '光线质量:通过', '角度完整性:无法检测'], ' | '.join(rows))
        check('the materials are previewed before generating, each replaceable', await av.locator('.av-mstrip li').count() == 5 and await av.locator('.av-mstrip .av-medit').count() == 5)
        await av.locator('[data-act="generate"]').click()
        await pg.wait_for_timeout(1500)
        stage = await av.locator('.av-ring').get_attribute('aria-valuetext')
        ring = await av.locator('.av-ring').inner_text()
        sim = await av.locator('.av-sim').inner_text()
        check('生成建模: 5 stages, labelled as simulated, no percentage or time estimate', await av.locator('.av-stages li').count() == 5 and stage.startswith('第 1 步') and '%' not in ring and '模拟进度' in sim, f'{stage} · {sim}')
        await av.locator('.av-result').wait_for(timeout=15000)
        tag = await av.locator('.av-result-tag').inner_text()
        check('创建完成: a 2D preview (not called 3D), name, 修改名称 / 重新生成 / 更换素材', tag == '2D 形象预览 · 演示版' and await av.locator('[data-act="rename"]').count() == 1 and await av.locator('[data-act="regen"]').count() == 1 and await av.locator('[data-act="redo"]').count() == 1, tag)
        await snap(pg, '02_generated')
        await av.locator('[data-act="enter"]').click()
        await pg.wait_for_timeout(700)
        check('AC1: setup complete → 首页 (virtual fitting room)', await cur(pg) == 'fitting')
        check('setupDone stored', await pg.evaluate('VT.store.get().setupDone') is True)
        mats = await pg.evaluate("(() => { const m = VT.store.get().avatar.materials; return m.method + ':' + Object.values(m.photos).filter((p) => p.media).length; })()")
        check('the avatar keeps its 5 photos as IndexedDB references', mats == 'photo:5', mats)

        # ---- AC2/AC4: exactly five tabs, same bar on every primary screen
        for t_id in TABS:
            await app.locator(f'.tabbar .tab[data-to="{t_id}"]').click()
            await pg.wait_for_timeout(120)
            leaving = await app.locator('.screen.is-leaving').count()
            labels = await app.locator('.screen.is-active .tabbar .tab span').all_inner_texts()
            on = await app.locator('.screen.is-active .tabbar .tab.is-on').get_attribute('data-to')
            n_bars = await app.locator('.screen.is-active .tabbar').count()
            check(f'AC3: tab → {t_id}', await cur(pg) == t_id and on == t_id)
            check(f'AC2/4: {t_id} has one bar with the 5 tabs', n_bars == 1 and labels == LABELS, ','.join(labels))
            check(f'tab switch to {t_id} is instant', leaving == 0)
            back_btns = await app.locator('.screen.is-active .back-btn').count()
            check(f'{t_id} has no back button (primary)', back_btns == 0)
            await snap(pg, f'10_tab_{t_id}')

        # ---- 首页 interactions
        await app.locator('.tabbar .tab[data-to="fitting"]').click()
        await app.locator('.fit-cat[data-cat="outer"]').click()
        await app.locator('.fit-thumb[data-pid="black-blazer"]').click()
        r = await avatar_render(pg, 'look2')
        check('outfit change: blazer → look2 render', r == 'look2', r)
        await app.locator('.fit-cat[data-cat="dress"]').click()
        await app.locator('.fit-thumb[data-pid="satin-slip-dress"]').click()
        r = await avatar_render(pg, 'look3')
        check('outfit change: dress → look3 render', r == 'look3', r)
        await app.locator('.fit-cat[data-cat="upper"]').click()
        # 推荐 lists every try-on garment of the category, the ones some render wears first
        in_order, shown = True, set()
        for c in await pg.evaluate('VT.data.fitCatsAll.map(c => ({ id: c.id, all: c.items, ready: VT.data.fitCats.find(f => f.id === c.id).items }))'):
            await app.locator(f'.fit-cat[data-cat="{c["id"]}"]').click()
            got = await app.locator('.fit-thumb[data-pid]').evaluate_all('els => els.map(e => e.dataset.pid)')
            in_order = in_order and got == c['ready'] + [x for x in c['all'] if x not in c['ready']]
            shown |= set(got)
        check('首页 rail lists image-ready garments first', in_order and len(shown) == 28, f'{len(shown)} shown')
        await app.locator('.fit-cat[data-cat="upper"]').click()
        # garments without imagery can still arrive from elsewhere (商品详情 试穿), with the honest toast
        await pg.evaluate("VT.tryOn(VT.liveApp, ['grey-hoodie'])")
        await pg.wait_for_timeout(700)
        t = await app.locator('.toast').inner_text()
        check('honest toast for garments without imagery', '暂无' in t, t)
        on = await app.locator('.fit-thumb.is-on[data-pid="grey-hoodie"]').count()
        await app.locator('.fit-thumb[data-pid="grey-hoodie"]').click()
        await pg.wait_for_timeout(300)
        off = await app.locator('.fit-thumb.is-on[data-pid="grey-hoodie"]').count()
        top = await pg.evaluate('VT.store.get().fit.outfit.top || null')
        check('garment without a render can be tapped off', on == 1 and off == 0 and top is None, f'on={on} after={off}')
        await app.locator('.fit-cam').click()
        await pg.wait_for_timeout(400)
        await app.locator('.cam [data-act="start"]').first.click()
        await pg.wait_for_timeout(1800)
        st = await app.locator('.cam-panel').get_attribute('data-state')
        check('camera preview live (getUserMedia)', st == 'live', st)
        await snap(pg, '03_camera')
        await app.locator('.cam [data-act="close"]').first.click()
        await pg.wait_for_timeout(500)
        check('camera stops on close', await pg.evaluate('document.querySelectorAll(".cam-video").length') == 0)

        # ---- 购物广场 + state preservation across tabs
        await app.locator('.tabbar .tab[data-to="plaza"]').click()
        await app.locator('.pz-search-box input').fill('衬衫')
        await pg.wait_for_timeout(300)
        n = await app.locator('.pz-card').count()
        check('plaza search', 1 <= n <= 6, str(n))
        await app.locator('.pz-search-box input').fill('')
        await app.locator('.pz-chips .chip[data-cat="all"]').click()
        await pg.evaluate("document.querySelector('.screen.is-active .pz-scroll').scrollTop = 420")
        await app.locator('.tabbar .tab[data-to="wardrobe"]').click()
        await pg.wait_for_timeout(200)
        await app.locator('.tabbar .tab[data-to="plaza"]').click()
        await pg.wait_for_timeout(200)
        sc = await pg.evaluate("document.querySelector('.screen.is-active .pz-scroll').scrollTop")
        check('plaza scroll kept after switching tabs', abs(sc - 420) < 2, str(sc))
        await pg.evaluate("document.querySelector('.screen.is-active .pz-scroll').scrollTop = 0")
        await app.locator('.pz-card .heart-btn').first.click()
        check('plaza heart toggles', await app.locator('.pz-card .heart-btn').first.get_attribute('aria-pressed') == 'true')
        await app.locator('.pz-card .pz-open').nth(2).click()
        await pg.wait_for_timeout(500)
        check('plaza → product details', await cur(pg) == 'product' and await pg.evaluate('VT.liveApp.params.pid') == 'striped-shirt')
        check('secondary screen hides tab bar', await app.locator('.screen.is-active .tabbar').count() == 0)
        await app.locator('.screen.is-active .back-btn').click()
        await pg.wait_for_timeout(500)
        check('AC6: back from product → plaza', await cur(pg) == 'plaza')
        await app.locator('.pz-card .pz-open').nth(3).click()   # brown blazer (not owned)
        await pg.wait_for_timeout(500)
        await app.locator('[data-act="add"]').click()
        await pg.wait_for_timeout(400)
        await app.locator('.sheet [data-act="to-wardrobe"]').click()
        await pg.wait_for_timeout(600)
        check('加入衣橱 → 个人衣橱 tab', await cur(pg) == 'wardrobe')
        src = await app.locator('.wr-tile .wr-src').first.inner_text()
        check('collected item at top of wardrobe', src == '已收藏', src)
        await app.locator('.tabbar .tab[data-to="plaza"]').click()
        await pg.wait_for_timeout(300)
        check('plaza tab returns to its own history (product page)', await cur(pg) == 'product')
        await app.locator('[data-act="add"]').click()
        await pg.wait_for_timeout(400)
        await app.locator('.sheet [data-act="buy"]').click()
        await pg.wait_for_timeout(500)
        check('立即购买 → checkout', await cur(pg) == 'checkout')
        await app.locator('[data-act="address"]').click()
        await pg.wait_for_timeout(300)
        check('checkout address sheet lists address book', await app.locator('.sheet .opt').count() >= 2)
        await app.locator('.sheet .sheet-x').click()
        await pg.wait_for_timeout(300)
        await app.locator('[data-act="submit"]').click()
        await pg.wait_for_timeout(1300)
        await app.locator('.co-paylayer [data-act="confirm"]').click()
        await pg.wait_for_timeout(1300)
        await snap(pg, '08_paid')
        await app.locator('.co-paylayer [data-act="view"]').click()
        await pg.wait_for_timeout(700)
        check('pay → 订单详情 (in 我的 → 我的订单)', await cur(pg) == 'orders')
        st = await app.locator('.or-status h2').inner_text()
        check('new order 待发货', st == '待发货', st)
        await app.locator('.screen.is-active .back-btn').click()
        await pg.wait_for_timeout(500)
        check('order details → back → 我的订单', await cur(pg) == 'orderlist')
        await app.locator('.screen.is-active .back-btn').click()
        await pg.wait_for_timeout(500)
        check('我的订单 → back → 我的', await cur(pg) == 'profile')
        stack_plaza = await pg.evaluate("VT.liveApp.stacks.plaza.map(e => e.id).join('>')")
        check('finished checkout removed from plaza history', 'checkout' not in stack_plaza, stack_plaza)

        # ---- AC5: 我的 gives access to orders, avatar, settings
        await app.locator('.me-oicons [data-f="toreceive"]').click()
        await pg.wait_for_timeout(500)
        check('我的 → 待收货 filter', await cur(pg) == 'orderlist' and await pg.evaluate('VT.liveApp.params.filter') == 'toreceive')
        n = await app.locator('.ol-card').count()
        check('待收货 shows the delivered order', n == 1, str(n))
        await app.locator('.ol-tab[data-f="all"]').click()
        await pg.wait_for_timeout(300)
        check('全部 shows all orders', await app.locator('.ol-card').count() == 5)
        await snap(pg, '11_orderlist')
        await app.locator('.ol-card .ol-item').nth(1).click()   # seed shirt (运输中)
        await pg.wait_for_timeout(500)
        st = await app.locator('.or-status h2').inner_text()
        check('order details 运输中', st == '运输中', st)
        await app.locator('.or-row[data-act="logistics"]').click()
        await pg.wait_for_timeout(500)
        check('订单详情 → 物流跟踪', await cur(pg) == 'tracking')
        check('tracking timeline', await app.locator('.tr-tl .timeline li').count() == 4)
        await snap(pg, '12_tracking')
        await app.locator('.screen.is-active .back-btn').click()
        await pg.wait_for_timeout(500)
        check('物流跟踪 → back → 订单详情', await cur(pg) == 'orders')
        await app.locator('.or-row[data-act="return"]').click()
        await pg.wait_for_timeout(500)
        check('订单详情 → 申请退换货', await cur(pg) == 'returns')
        await app.locator('.or-reason').first.click()
        await app.locator('.rt-scroll textarea').fill('袖子偏长')
        await app.locator('input[data-change="photo"]').set_input_files(FIX + 'my_jacket.jpg')
        await pg.wait_for_timeout(700)
        check('return evidence photo added', await app.locator('.rt-photos--edit img').count() == 1)
        await app.locator('[data-act="submit"]').click()
        await pg.wait_for_timeout(600)
        sub = await app.locator('.or-row[data-act="return"] em').inner_text()
        check('return submitted → back on details', await cur(pg) == 'orders' and '已提交' in sub, sub)
        await app.locator('.or-row[data-act="merchant"]').click()
        await pg.wait_for_timeout(350)
        await app.locator('.sheet .chip').first.click()
        await pg.wait_for_timeout(1000)
        check('merchant chat replies', await app.locator('.sheet .mchat .b').count() >= 3)
        await app.locator('.sheet .sheet-x').click()
        await pg.wait_for_timeout(300)
        await app.locator('.or-row[data-act="info"]').click()
        await pg.wait_for_timeout(300)
        check('order info sheet', await app.locator('.sheet .kv').count() == 1)
        await app.locator('.sheet .sheet-x').click()
        await pg.wait_for_timeout(300)
        # unpaid order: pay from the list
        await app.locator('.screen.is-active .back-btn').click()
        await pg.wait_for_timeout(400)
        await app.locator('.ol-tab[data-f="unpaid"]').click()
        await pg.wait_for_timeout(300)
        await app.locator('.ol-card [data-act="paynow"]').click()
        await pg.wait_for_timeout(1300)
        await app.locator('.co-paylayer [data-act="confirm"]').click()
        await pg.wait_for_timeout(1300)
        await app.locator('.co-paylayer [data-act="view"]').click()
        await pg.wait_for_timeout(500)
        check('去支付 moves order out of 待付款', await app.locator('.ol-card').count() == 0)
        # profile rows
        await pg.click('.sim-list button[data-screen="fitting"]')       # leave via another tab
        await pg.wait_for_timeout(300)
        await app.locator('.tabbar .tab[data-to="profile"]').click()   # tab keeps its stack: still on 我的订单
        await pg.wait_for_timeout(300)
        check('我的 tab remembers its own history', await cur(pg) == 'orderlist')
        await app.locator('.screen.is-active .back-btn').click()
        await pg.wait_for_timeout(400)
        for to, title in [('avatarhub', '我的形象'), ('settings', '设置'), ('editprofile', '我的资料'), ('addresses', '收货地址'), ('payments', '支付方式'), ('notifications', '消息通知'), ('help', '帮助与客服')]:
            await app.locator(f'.me-row[data-to="{to}"]').click()
            await pg.wait_for_timeout(450)
            h = await app.locator('.screen.is-active h1').first.inner_text()
            check(f'我的 → {title}', await cur(pg) == to and h == title, h)
            await snap(pg, f'13_{to}')
            await app.locator('.screen.is-active .back-btn').click()
            await pg.wait_for_timeout(450)
            check(f'{title} → back → 我的', await cur(pg) == 'profile')
        # edit profile
        await app.locator('.me-id').click()
        await pg.wait_for_timeout(400)
        await app.locator('input[data-k="name"]').fill('小橙子Walker')
        await app.locator('.seg [data-v="保密"]').click()
        await app.locator('[data-act="save"]').click()
        await pg.wait_for_timeout(500)
        check('edit profile saved', await app.locator('.me-name').inner_text() == '小橙子Walker')
        await app.locator('.me-photo input').set_input_files(FIX + 'me_face.jpg')
        await pg.wait_for_timeout(700)
        src = await app.locator('.me-photo > img').get_attribute('src')
        check('change profile picture', src.startswith('blob:'), src[:40])  # an object URL: the photo itself is in IndexedDB
        # avatar management → upload new photos → generate → back to 我的形象
        await app.locator('.me-row[data-to="avatarhub"]').click()
        await pg.wait_for_timeout(450)
        await app.locator('[data-act="photos"]').click()
        await pg.wait_for_timeout(450)
        check('我的形象 → 上传照片', await cur(pg) == 'avatar' and await app.locator('.av-skip').count() == 0)
        rows = await make_avatar(pg, '.sim-app', samples=True)
        check('demo samples: no check is claimed as passed', len(rows) == 6 and all(r.endswith(':无法检测') for r in rows), ' | '.join(rows))
        await app.locator('.screen.is-active [data-act="done"]').click()
        await pg.wait_for_timeout(600)
        check('generate → back to 我的形象', await cur(pg) == 'avatarhub')
        await app.locator('[data-act="regen"]').click()
        await pg.wait_for_timeout(5800)
        await app.locator('.av-gen [data-act="done"]').click()
        await pg.wait_for_timeout(500)
        check('重新生成 stays on 我的形象', await cur(pg) == 'avatarhub')
        await app.locator('.switch[data-key="avatarPrefs.sizeTips"]').click()
        check('avatar preference toggle', await pg.evaluate('VT.store.get().avatarPrefs.sizeTips') is False)
        await app.locator('.screen.is-active .back-btn').click()
        await pg.wait_for_timeout(400)
        # addresses: add one, it becomes selectable at checkout
        await app.locator('.me-row[data-to="addresses"]').click()
        await pg.wait_for_timeout(400)
        await app.locator('[data-act="add"]').click()
        await pg.wait_for_timeout(300)
        await app.locator('.sheet .js-name').fill('王先生')
        await app.locator('.sheet .js-phone').fill('13912345678')
        await app.locator('.sheet .js-addr').fill('上海市静安区 南京西路 1266 号')
        await app.locator('.sheet [data-act="save"]').click()
        await pg.wait_for_timeout(500)
        check('address added', await app.locator('.ad-card').count() == 3)
        await app.locator('.screen.is-active .back-btn').click()
        await pg.wait_for_timeout(400)
        # stats
        await app.locator('.me-stats [data-to="favorites"]').click()
        await pg.wait_for_timeout(400)
        check('我的收藏 lists favourites', await app.locator('.fv-card').count() >= 8)
        await app.locator('.screen.is-active .back-btn').click()
        await pg.wait_for_timeout(400)
        await app.locator('.me-stats [data-to="history"]').click()
        await pg.wait_for_timeout(400)
        check('浏览记录 includes viewed products', await app.locator('.hs-row').count() >= 6)
        await app.locator('.screen.is-active .back-btn').click()
        await pg.wait_for_timeout(400)

        # ---- 个人衣橱 + AI 造型师
        await app.locator('.tabbar .tab[data-to="wardrobe"]').click()
        await app.locator('.wr-tab[data-cat="bottom"]').click()
        check('wardrobe filter 下装', await app.locator('.wr-tile').count() >= 3)
        await app.locator('.wr-tab[data-cat="all"]').click()
        await app.locator('.wr-open').nth(4).click()
        await pg.wait_for_timeout(300)
        await app.locator('.sheet [data-act="queue"]').click()
        await pg.wait_for_timeout(400)
        check('wardrobe queue bar', await app.locator('.wr-queue').count() == 1)
        await app.locator('[data-act="add-open"]').first.click()
        await pg.wait_for_timeout(300)
        await app.locator('.sheet input[type=file]').set_input_files(FIX + 'my_jacket.jpg')
        await pg.wait_for_timeout(800)
        await app.locator('.sheet .js-name').fill('我的牛仔夹克')
        await app.locator('.sheet [data-act="save"]').click()
        await pg.wait_for_timeout(500)
        check('uploaded garment saved', await app.locator('.wr-tile .wr-src').first.inner_text() == '我上传的')
        await app.locator('.tabbar .tab[data-to="stylist"]').click()
        await pg.wait_for_timeout(300)
        await app.locator('.st-field').fill('还没发送的草稿')
        await app.locator('.tabbar .tab[data-to="plaza"]').click()
        await pg.wait_for_timeout(200)
        await app.locator('.screen.is-active .back-btn').click()   # plaza stack still has the product page
        await pg.wait_for_timeout(400)
        await app.locator('.tabbar .tab[data-to="stylist"]').click()
        await pg.wait_for_timeout(200)
        check('stylist draft kept across tabs', await app.locator('.st-field').input_value() == '还没发送的草稿')
        await app.locator('.st-field').fill('')
        await app.locator('.st-chip').nth(1).click()
        await pg.wait_for_timeout(1600)
        check('AI stylist reply with looks', await app.locator('.st-looks').count() >= 2)
        await app.locator('.look-save').first.click()
        await app.locator('.look-open').first.click()
        await pg.wait_for_timeout(400)
        await app.locator('.sheet [data-act="try"]').click()
        await pg.wait_for_timeout(900)
        r = await avatar_render(pg)
        check('look → 首页 with outfit', await cur(pg) == 'fitting' and r in ('look1', 'look2', 'look3'), r)

        # ---- AC1 again: reload → straight to 首页
        await pg.goto(BASE + '?app=launch')
        await pg.wait_for_timeout(900)
        check('AC1: relaunch after setup opens 首页', await pg.evaluate('VT.liveApp.cur.id') == 'fitting')
        await pg.evaluate('localStorage.clear()')
        await pg.goto(BASE + '?app=launch')
        await pg.wait_for_timeout(900)
        check('first launch (no setup) opens 启动页', await pg.evaluate('VT.liveApp.cur.id') == 'onboarding')
        await b.close()

        # ---- AC10: mobile
        b = await p.chromium.launch()
        m = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        mp = await m.new_page()
        mp.on('pageerror', lambda e: errors.append('mobile pageerror: ' + str(e)))
        await mp.goto(BASE); await mp.wait_for_timeout(1200)
        check('mobile: full-screen app, first launch', await mp.evaluate('document.body.dataset.mode') == 'solo' and await mp.evaluate('VT.liveApp.cur.id') == 'onboarding')
        await mp.evaluate("VT.store.update(s => { s.setupDone = true; })")
        await mp.wait_for_timeout(300)
        await mp.goto(BASE); await mp.wait_for_timeout(1200)
        check('mobile: relaunch opens 首页', await mp.evaluate('VT.liveApp.cur.id') == 'fitting')
        for t_id in TABS:
            await mp.locator(f'.sim-app .tabbar .tab[data-to="{t_id}"]').tap()
            await mp.wait_for_timeout(150)
        check('mobile: tabs work', await mp.evaluate('VT.liveApp.cur.id') == 'profile')
        check('mobile: no horizontal overflow', await mp.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        await mp.screenshot(path=OUT + 'mobile_profile.png')

        # ---- 购物广场: favourite-stores bar, store + category filter, search, 商家消息
        await mp.goto(BASE); await mp.wait_for_timeout(1200)
        ap = mp.locator('.sim-app')
        await ap.locator('.tabbar .tab[data-to="plaza"]').tap(); await mp.wait_for_timeout(500)
        stores = lambda: ap.locator('.pz-st-tabs .pz-st').evaluate_all('els => els.map(e => e.dataset.store)')
        pids = lambda: ap.locator('.pz-card').evaluate_all('els => els.map(e => e.dataset.pid)')
        favs = await mp.evaluate('VT.store.get().storeFavs')
        bar = await stores()
        check('plaza: store bar = 全部 + favourite stores only', bar == ['all'] + favs and 'reformation' not in bar, ','.join(bar))
        n_all = len(await pids())
        check('plaza: 全部 shows every store, with the platform banner', n_all == len(await mp.evaluate('VT.data.plazaOrder')) and await ap.locator('.pz-banners').count() == 1, str(n_all))
        await ap.locator('.pz-st[data-store="zara"]').tap(); await mp.wait_for_timeout(300)
        got = await pids()
        zara = await mp.evaluate("VT.data.plazaOrder.filter(id => VT.data.storeOf(VT.data.byId[id]).id === 'zara')")
        check('plaza: a favourite store shows only its products', got == zara and len(got) == 4 and await ap.locator('.pz-shop-ban').count() == 1, ','.join(got))
        await ap.locator('.pz-chips .chip[data-cat="outer"]').tap(); await mp.wait_for_timeout(300)
        got = await pids()
        check('plaza: category narrows the chosen store', got == ['knit-cardigan', 'brown-blazer'], ','.join(got))
        await ap.locator('.pz-chips .chip[data-cat="all"]').tap()
        await ap.locator('.pz-search-box input').fill('Reformation'); await mp.wait_for_timeout(300)
        rows = await ap.locator('.pz-srow .pz-sfav').evaluate_all('els => els.map(e => e.dataset.store)')
        got = await pids()
        on = await ap.locator('.pz-st.is-on').get_attribute('data-store')
        check('plaza: search covers every store and product', rows == ['reformation'] and got == ['striped-shirt'] and on == 'all', f'{rows} {got} {on}')
        await ap.locator('.pz-srow .pz-sfav[data-store="reformation"]').tap(); await mp.wait_for_timeout(300)
        await ap.locator('.pz-search-box input').fill(''); await mp.wait_for_timeout(300)
        bar = await stores()
        check('plaza: favouriting a store from search adds it to the bar', bar[:2] == ['all', 'reformation'], ','.join(bar))
        await ap.locator('.pz-st--manage').tap(); await mp.wait_for_timeout(500)
        await ap.locator('.sheet .pz-sfav[data-store="reformation"]').tap(); await mp.wait_for_timeout(300)
        await mp.keyboard.press('Escape'); await mp.wait_for_timeout(400)
        bar = await stores()
        check('plaza: 管理 removes a store from the bar', 'reformation' not in bar and bar == ['all'] + favs, ','.join(bar))
        await ap.locator('.pz-msg').tap(); await mp.wait_for_timeout(500)
        rows = await ap.locator('.msg-row[data-store]').evaluate_all('els => els.map(e => e.dataset.store)')
        check('plaza: chat icon opens 商家消息', await mp.evaluate('VT.liveApp.cur.id') == 'messages' and rows == ['zara', 'mono-atelier', 'forma'] and await ap.locator('.msg-dot').count() == 1, ','.join(rows))
        await ap.locator('.msg-row[data-store="zara"]').tap(); await mp.wait_for_timeout(500)
        before = await ap.locator('.sheet .mchat .b.them').count()
        await ap.locator('.sheet .chip[data-q="什么时候发货？"]').tap(); await mp.wait_for_timeout(1400)
        after = await ap.locator('.sheet .mchat .b.them').count()
        check('plaza: store chat replies and clears unread', after == before + 1 and await mp.evaluate('VT.storeChat.unread(VT.store.get())') == 0, f'{before}->{after}')
        await mp.keyboard.press('Escape'); await mp.wait_for_timeout(400)
        await ap.locator('.screen.is-active .back-btn').tap(); await mp.wait_for_timeout(500)
        check('plaza: back from 商家消息 → 购物广场', await mp.evaluate('VT.liveApp.cur.id') == 'plaza')
        await ap.locator('.pz-card .pz-open').first.tap(); await mp.wait_for_timeout(600)
        await ap.locator('.pd-brand').tap(); await mp.wait_for_timeout(500)
        title = await ap.locator('.sheet-head h3').inner_text()
        check('product brand opens its store sheet', title == 'ZARA 官方旗舰店', title)
        await b.close()

        # ---- 首页: header, 拍照 → 我的上传 (temporary) → 加入衣橱, 切换场景, 切换角色 (avatars with their own wardrobes)
        b = await p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        await c.grant_permissions(['camera'], origin=ORIGIN)
        fp = await c.new_page()
        fp.on('console', lambda m: errors.append(f'fitting {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        fp.on('pageerror', lambda e: errors.append('fitting pageerror: ' + str(e)))
        await fp.goto(BASE + '?app=fitting'); await fp.evaluate('localStorage.clear(); sessionStorage.clear()')
        await fp.goto(BASE + '?app=fitting'); await fp.wait_for_timeout(900)
        fa = fp.locator('.screen.is-active')
        S = lambda js: fp.evaluate(f'(() => {{ const s = VT.store.get(); return {js}; }})()')
        heads = [(await fa.locator(sel).inner_text()).strip() for sel in ('[data-act="role"]', '[data-act="scene"]', '.fit-cam')]
        tabs = await fa.locator('.fit-src-tab').all_inner_texts()
        check('首页 header: 切换角色 · 切换场景 · 开启视频试衣', heads == ['切换角色', '切换场景', '开启视频试衣'] and tabs == ['推荐', '我的上传'], ' | '.join(heads + tabs))
        await fa.locator('.fit-shoot').click(); await fp.wait_for_timeout(400)
        items = [i.strip() for i in await fp.locator('.fit-pop [role="menuitem"]').all_inner_texts()]
        check('拍照 opens 拍摄衣服 / 从相册上传', items == ['拍摄衣服', '从相册上传'], ','.join(items))
        n0 = await S('s.wardrobe.length')
        async with fp.expect_file_chooser() as fc:
            await fp.locator('.fit-pop [data-act="pop-gallery"]').click()
        await (await fc.value).set_files(FIX + 'my_jacket.jpg')
        await fp.wait_for_selector('.ov--fitup .fu-img'); await fp.wait_for_timeout(300)
        await fp.locator('.fu-cats .chip[data-cat="outer"]').click()
        await fp.locator('.ov--fitup [data-act="fu-ok"]').click(); await fp.wait_for_timeout(600)
        src = await fa.locator('.fit-src-tab.is-on').get_attribute('data-src')
        worn = await S("Object.values(s.fit.outfit).filter(v => String(v).startsWith('up:')).length")
        check('upload → 我的上传, tried on, not in the wardrobe', src == 'mine' and worn == 1 and await fa.locator('.fit-thumb.is-on[data-up]').count() == 1 and await S('s.fit.cat') == 'outer' and await S('s.wardrobe.length') == n0 and await fa.locator('.fit-temp').count() == 1, f'src={src} worn={worn}')
        await fa.locator('.fit-temp-btn[data-act="keep"]').click(); await fp.wait_for_timeout(300)
        n1 = await S('s.wardrobe.length')
        check('加入衣橱 saves the upload once', n1 == n0 + 1 and await S('s.wardrobe[0].source') == 'uploaded' and await fa.locator('.fit-temp-btn[data-act="keep"]').count() == 0 and await fa.locator('.fit-temp-btn').is_disabled(), f'{n0}->{n1}')
        await fp.reload(); await fp.wait_for_timeout(900)
        await fa.locator('.fit-src-tab[data-src="mine"]').click(); await fp.wait_for_timeout(200)
        kept = await fa.locator('.fit-thumb[data-up]').count()
        check('我的上传 lasts for the browser session', kept == 1, str(kept))
        await fa.locator('.fit-shoot').click(); await fp.wait_for_timeout(400)
        await fp.locator('.fit-pop [data-act="pop-camera"]').click()
        await fp.wait_for_function("document.querySelector('.cam--shot .cam-view') && document.querySelector('.cam--shot .cam-view').dataset.state === 'live'", timeout=8000)
        await fp.locator('.cam--shot .cam-shutter').click(); await fp.wait_for_timeout(500)
        check('拍摄衣服 captures a photo (getUserMedia)', await fp.locator('.ov--fitup .fu-img').count() == 1 and await fp.evaluate('document.querySelectorAll(".cam-video").length') == 0)
        await fp.keyboard.press('Escape'); await fp.wait_for_timeout(400)
        await fa.locator('[data-act="scene"]').click(); await fp.wait_for_timeout(400)
        await fp.locator('.fs-opt[data-scene="cocoa"]').click(); await fp.wait_for_timeout(200)
        await fp.keyboard.press('Escape'); await fp.wait_for_timeout(400)
        check('切换场景 changes the backdrop', await fa.locator('.fit-plate').get_attribute('data-scene') == 'cocoa' and await S('s.fitScene') == 'cocoa')
        await fa.locator('[data-act="role"]').click(); await fp.wait_for_timeout(400)
        await fp.locator('.as-new').click(); await fp.wait_for_timeout(400)
        await fp.locator('.ov .js-name').fill('朋友')
        await fp.locator('.ov [data-act="as-next"]').click(); await fp.wait_for_timeout(700)
        is_new = await fp.evaluate('VT.liveApp.cur.id') == 'avatar' and await fa.locator('.av-skip').count() == 0
        await make_avatar(fp, '', samples=True, tap='dblclick')  # a double tap starts one job
        await fa.locator('[data-act="enter"]').click(); await fp.wait_for_timeout(900)
        names = await S("s.avatars.map(a => a.name || '本人')")
        check('新建数字分身: one new avatar, its own empty wardrobe, now active', is_new and await fp.evaluate('VT.liveApp.cur.id') == 'fitting' and names == ['本人', '伴侣', '爸爸', '妈妈', '朋友'] and await S('s.wardrobe.length') == 0, ','.join(names))
        await fa.locator('[data-act="role"]').click(); await fp.wait_for_timeout(400)
        opts = await fp.locator('.as-opt').count()
        check('the new avatar is listed in 切换角色', opts == 5 and await fp.locator('.as-opt.is-on').inner_text() != '' and '朋友' in await fp.locator('.as-opt.is-on').inner_text(), str(opts))
        await fp.locator('.as-opt[data-id="me"]').click(); await fp.wait_for_timeout(500)
        check('切换角色 back to 本人 restores her wardrobe', await S('s.activeAvatar') == 'me' and await S('s.wardrobe.length') == n1, str(await S('s.wardrobe.length')))
        await b.close()

        # ---- 创建数字分身: 视频上传 and in-app recording, a failed check, a failed generation, deleting the media, 360 px
        b = await p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        await c.grant_permissions(['camera'], origin=ORIGIN)
        vp = await c.new_page()
        vp.on('console', lambda m: errors.append(f'avatar {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        vp.on('pageerror', lambda e: errors.append('avatar pageerror: ' + str(e)))
        await vp.goto(BASE + '?app=avatar'); await vp.evaluate('localStorage.clear(); sessionStorage.clear()')
        await vp.goto(BASE + '?app=avatar'); await vp.wait_for_timeout(900)
        va = vp.locator('.screen.is-active')
        await va.locator('.av-method[data-m="video"]').click(); await vp.wait_for_timeout(400)
        await consent(vp, '')
        check('视频上传: the turn shown in 4 steps, 8 capture conditions, 上传视频 + 开始拍摄', await va.locator('.av-turn li').count() == 4 and await va.locator('.av-req li').count() == 8 and await va.locator('.av-vbox input[data-change="video"]').count() == 1 and await va.locator('[data-act="record"]').count() == 1)
        await va.locator('.av-vbox input[data-change="video"]').set_input_files(FIX + 'turn_3s.webm')
        await va.locator('.av-vcard').wait_for(timeout=15000)
        msg = await va.locator('.av-vmsg').inner_text()
        check('a 3-second video fails its length check; 下一步 stays disabled', '3.0 秒' in msg and await va.locator('[data-act="to-check"]').is_disabled(), msg)
        await va.locator('.av-vacts input[data-change="video"]').set_input_files(FIX + 'turn_10s.webm')
        await vp.wait_for_selector('.screen.is-active .av-vcard.is-ok', timeout=15000)
        meta = await va.locator('.av-vmeta span').first.inner_text()
        check('a 10-second video passes (length read from the file)', '时长 10.' in meta and not await va.locator('[data-act="to-check"]').is_disabled(), meta)
        await va.locator('.av-vplay').click(); await vp.wait_for_timeout(500)
        check('the video plays back before it is submitted', await vp.locator('.ov video.av-vprev').count() == 1)
        await vp.keyboard.press('Escape'); await vp.wait_for_timeout(400)
        await va.locator('[data-act="record"]').click()
        await vp.wait_for_function("document.querySelector('.av-rec .cam-view') && document.querySelector('.av-rec .cam-view').dataset.state === 'live'", timeout=8000)
        await vp.locator('.av-rec .av-rec-btn').click()
        await vp.wait_for_timeout(5500)  # 3-2-1, then about 2 s into the recording
        timer = await vp.locator('.av-rec .js-time').inner_text()
        steps = await vp.locator('.av-rec-steps li.is-on').count()
        await vp.wait_for_function("document.querySelector('.screen.is-active .av-vcard.is-ok') && !document.querySelector('.av-rec')", timeout=20000)
        name = await va.locator('.av-vmeta b').inner_text()
        check('开始拍摄 (MediaRecorder): 3-2-1, a 10 s timer with the turn steps, then checked like an upload', timer.startswith('00:0') and timer.endswith('/ 00:10') and steps == 1 and name.startswith('录制视频'), f'{timer} · {name}')
        await va.locator('[data-act="to-check"]').click()
        rows = await checked(vp, '')
        check('智能检测 (video): 4 frames + play; format/length and light measured, the rest 无法检测', await va.locator('.av-mstrip--video img').count() == 4 and await va.locator('.av-mplay').count() == 1 and rows[0] == '基础检测:通过' and rows[4] == '光线质量:通过' and rows[-1] == '视频稳定性:无法检测' and sum(r.endswith(':无法检测') for r in rows) == 5, ' | '.join(rows))
        await vp.evaluate("localStorage.setItem('vto-mock-fail', 'avatar.generate')")
        await va.locator('[data-act="generate"]').click()
        await va.locator('[data-act="retry"]').wait_for(timeout=12000)
        stopped, done = await va.locator('.av-stages li.is-fail').count(), await va.locator('.av-stages li.is-done').count()
        await vp.evaluate("localStorage.removeItem('vto-mock-fail')")
        await va.locator('[data-act="retry"]').click()
        await va.locator('.av-result').wait_for(timeout=15000)
        check('failed generation shows where it stopped; 重试 (same materials) → 创建完成', stopped == 1 and done >= 1, f'{done} done, {stopped} failed')
        await va.locator('[data-act="enter"]').click(); await vp.wait_for_timeout(800)
        kept = await vp.evaluate("(() => { const m = VT.store.get().avatar.materials; return m.method + ':' + m.video.frames.length + ':' + ('url' in m.video); })()")
        check('a video avatar keeps 4 frames on the device, not the video', kept == 'video:4:false' and await cur(vp) == 'fitting', kept)
        await vp.goto(BASE + '?app=avatar&mockFail=avatar.check'); await vp.wait_for_timeout(900)
        await va.locator('.av-method[data-m="photo"]').click(); await vp.wait_for_timeout(400)
        await va.locator('[data-act="samples"]').click()
        await va.locator('[data-act="to-check"]').click()
        rows = await checked(vp, '')
        fix = await va.locator('.av-fix li > span').first.inner_text()
        blocked = await va.locator('[data-act="generate"]').is_disabled()
        await va.locator('.av-fix [data-act="edit"]').click(); await vp.wait_for_timeout(500)
        back_to = await va.locator('.av-bar-t').inner_text()
        await put_photo(vp, '', 'front', 'me_full.jpg')
        await va.locator('[data-act="to-check"]').click()
        await checked(vp, '')
        check('a failed check (simulated AI result, labelled 演示) names the fix; replacing the photo clears it', '身体完整度:需要重新上传' in rows and '正面全身照缺少脚部' in fix and '演示' in fix and blocked and back_to == '照片上传' and await va.locator('.av-fix').count() == 0 and not await va.locator('[data-act="generate"]').is_disabled(), fix)
        await vp.goto(BASE + '?app=privacy'); await vp.wait_for_timeout(900)
        n0 = await vp.evaluate(IDB_COUNT)
        await va.locator('[data-act="clearphotos"]').click(); await vp.wait_for_timeout(400)
        await vp.locator('.ov [data-act="yes"]').click(); await vp.wait_for_timeout(700)
        n1 = await vp.evaluate(IDB_COUNT)
        check('隐私与安全 → 清除已上传的照片 deletes the avatar media from the device', n0 >= 4 and n1 == 0 and await vp.evaluate('VT.store.get().avatar.materials') is None, f'{n0} → {n1} blobs')
        n = await b.new_context(viewport={'width': 360, 'height': 740}, device_scale_factor=2, reduced_motion='reduce')
        np = await n.new_page()
        np.on('pageerror', lambda e: errors.append('avatar 360 pageerror: ' + str(e)))
        await np.goto(BASE + '?app=avatar'); await np.evaluate('localStorage.clear()')
        await np.goto(BASE + '?app=avatar'); await np.wait_for_timeout(900)
        na = np.locator('.screen.is-active')
        fits = "(() => { const s = document.querySelector('.screen.is-active .av-scroll'); return document.documentElement.scrollWidth <= innerWidth && s.scrollWidth <= s.clientWidth; })()"
        wide = []
        for step, act in [('method', None), ('photo', '.av-method[data-m="photo"]'), ('samples', '[data-act="samples"]'), ('check', '[data-act="to-check"]'), ('gen', '[data-act="generate"]'), ('done', None), ('video', None)]:
            if step == 'done':
                await na.locator('.av-result').wait_for(timeout=8000)
            elif step == 'video':
                await np.goto(BASE + '?app=avatar'); await np.wait_for_timeout(700)
                await na.locator('.av-method[data-m="video"]').click(); await np.wait_for_timeout(400)
            elif act:
                await na.locator(act).click(); await np.wait_for_timeout(400)
                if step == 'photo':
                    await consent(np, '')
            if not await np.evaluate(fits):
                wide.append(step)
        check('360 px: every step of 创建数字分身 fits the width', not wide, ','.join(wide))
        await b.close()

        # ---- 个人衣橱 V2: portrait row (切换角色, shared with 首页), 衣服 / 搭配集 / 穿搭瞬间, long-press, 保存造型
        b = await p.chromium.launch()
        c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        wp = await c.new_page()
        wp.on('console', lambda m: errors.append(f'wardrobe {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        wp.on('pageerror', lambda e: errors.append('wardrobe pageerror: ' + str(e)))
        wp.on('requestfailed', lambda r: errors.append('wardrobe requestfailed: ' + r.url))
        await wp.goto(BASE + '?app=wardrobe'); await wp.evaluate('localStorage.clear(); sessionStorage.clear()')
        await wp.goto(BASE + '?app=wardrobe'); await wp.wait_for_timeout(900)
        wa = wp.locator('.screen.is-active')
        W = lambda js: wp.evaluate(f'(() => {{ const s = VT.store.get(); return {js}; }})()')
        faces = await wa.locator('.wr-people-list .wr-face').count()
        row_text = (await wa.locator('.wr-people').inner_text()).strip()
        ringed = await wa.locator('.wr-face[aria-checked="true"]').get_attribute('data-id')
        check('portrait row: 4 people + 新建数字分身, no names, 本人 ringed', faces == 4 and await wa.locator('.wr-face--add').count() == 1 and row_text == '' and ringed == 'me', f'{faces} faces, text="{row_text}", on={ringed}')
        segs = [t.strip() for t in await wa.locator('.wr-seg').all_inner_texts()]
        cols = await wp.evaluate("getComputedStyle(document.querySelector('.screen.is-active .wr-grid')).gridTemplateColumns.split(' ').length")
        check('衣服 | 搭配集 | 穿搭瞬间 over a 3-column grid', segs == ['衣服', '搭配集', '穿搭瞬间'] and cols == 3 and await wa.locator('.wr-tile').count() == 15, ','.join(segs) + f' cols={cols}')
        await wa.locator('.wr-face[data-id="partner"]').click(); await wp.wait_for_timeout(400)
        pids = await W("s.wardrobe.map(w => w.p).join(',')")
        check("tapping a portrait shows that person's wardrobe", await W('s.activeAvatar') == 'partner' and await wa.locator('.wr-tile').count() == 7 and 'grey-hoodie' in pids and 'knit-cardigan' not in pids, pids)
        await wa.locator('.tabbar .tab[data-to="fitting"]').click(); await wp.wait_for_timeout(400)
        role = await wa.locator('[data-act="role"]').get_attribute('aria-label')
        await wa.locator('[data-act="role"]').click(); await wp.wait_for_timeout(400)
        await wp.locator('.as-opt[data-id="mother"]').click(); await wp.wait_for_timeout(500)
        await wa.locator('.tabbar .tab[data-to="wardrobe"]').click(); await wp.wait_for_timeout(400)
        ringed = await wa.locator('.wr-face[aria-checked="true"]').get_attribute('data-id')
        check('one active person across 首页 切换角色 and the portrait row', role.endswith('伴侣') and ringed == 'mother', f'{role} / {ringed}')
        await wa.locator('.wr-tab[data-cat="dress"]').click(); await wp.wait_for_timeout(300)
        dresses = await wa.locator('.wr-tile').count()
        await wa.locator('.wr-tab[data-cat="all"]').click()
        await wa.locator('.wr-face[data-id="me"]').click(); await wp.wait_for_timeout(400)
        check('category filters follow the person (妈妈 连衣裙 1, 本人 全部 15)', dresses == 1 and await wa.locator('.wr-tile').count() == 15, str(dresses))
        box = await wa.locator('.wr-open').first.bounding_box()
        await wp.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        await wp.mouse.down(); await wp.wait_for_timeout(700); await wp.mouse.up(); await wp.wait_for_timeout(400)
        menu = [t.strip() for t in await wp.locator('.ov--wr-ctx [role="menuitem"]').all_inner_texts()]
        check('long-press: 立即试穿 · 加入搭配集 · 分享 · 删除 (not the item sheet)', menu == ['立即试穿', '加入搭配集', '分享', '删除'] and await wp.locator('.ov--wr-item').count() == 0, ','.join(menu))
        await wp.locator('.ov--wr-ctx [data-act="ctx-set"]').click(); await wp.wait_for_timeout(400)
        await wp.locator('.ov--wr-sets [data-act="new"]').click(); await wp.wait_for_timeout(400)
        await wp.locator('.ov .js-set-name').fill('春日出游')
        await wp.locator('.ov [data-act="ok"]').click(); await wp.wait_for_timeout(400)
        sets = await W("s.collections.map(c => c.name + ':' + c.items.length).join(',')")
        check('加入搭配集 → 新建搭配集 holding that garment', sets.startswith('春日出游:1,') and await W('s.collections.length') == 5, sets)
        await wa.locator('.wr-seg[data-view="sets"]').click(); await wp.wait_for_timeout(400)
        cards = await wa.locator('.wr-set').count()
        await wa.locator('.wr-set-open').nth(1).click(); await wp.wait_for_timeout(600)
        title = (await wa.locator('.wr-od-name').inner_text()).strip()
        thumbs = await wa.locator('.wr-od-item[data-uid]').count()
        check('搭配集 → 搭配集详情 with its garments', cards == 5 and await cur(wp) == 'outfit' and title == '周末最爱' and thumbs == 4, f'{cards} cards, {title}, {thumbs}')
        await wa.locator('[data-act="od-try"]').click(); await wp.wait_for_timeout(700)
        outfit = await W('JSON.stringify(s.fit.outfit)')
        check('一键试穿这套 → 首页 wears the set', await cur(wp) == 'fitting' and 'knit-cardigan' in outfit and 'straight-jeans' in outfit, outfit)
        m0 = await W('s.moments.length')
        await wa.locator('[data-act="save-look"]').click(); await wp.wait_for_timeout(400)
        m1 = await W('s.moments.length')
        await wp.locator('.toast-act').click(); await wp.wait_for_timeout(700)
        first = await wa.locator('.wr-moment img').first.get_attribute('src')
        check("首页 保存造型 → 本人's 穿搭瞬间, newest first", m1 == m0 + 1 and await cur(wp) == 'wardrobe' and await wa.locator('.wr-moment').count() == m1 and 'avatar-' in first, f'{m0}->{m1} {first}')
        await wa.locator('.wr-moment-open').nth(1).click(); await wp.wait_for_timeout(600)
        related = await wa.locator('.wr-mo-item').count()
        check('穿搭瞬间 detail: photo, date, 仅自己可见, related garments, 再次试穿', await cur(wp) == 'moment' and related >= 1 and await wa.locator('.wr-private').count() == 1 and await wa.locator('[data-act="mo-again"]').count() == 1, str(related))
        await b.close()

        # ---- 首页 on a slow network: body images arrive 1.2 s late; quick picks must end on the newest outfit
        b = await p.chromium.launch()

        async def slow_fitting():
            c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)  # empty image cache
            sp = await c.new_page()
            sp.on('pageerror', lambda e: errors.append('slow-network pageerror: ' + str(e)))

            async def late(route):
                await asyncio.sleep(1.2)
                await route.continue_()
            await sp.route('**/assets/people/avatar-look*.webp', late)
            await sp.goto(BASE + '?app=fitting'); await sp.evaluate('localStorage.clear(); sessionStorage.clear()')
            await sp.goto(BASE + '?app=fitting'); await sp.wait_for_timeout(900)
            return sp

        async def picks(sp, steps):
            sa = sp.locator('.screen.is-active')
            for cat, pid in steps:
                await sa.locator(f'.fit-cat[data-cat="{cat}"]').click()
                await sa.locator(f'.fit-thumb[data-pid="{pid}"]').click()

        sp = await slow_fitting()
        await picks(sp, [('outer', 'black-blazer'), ('dress', 'satin-slip-dress')])
        r1 = await avatar_render(sp, 'look3', scope='')
        await sp.wait_for_timeout(2500)  # the dropped blazer image arrives meanwhile
        r1, n1 = await avatar_render(sp, scope=''), await sp.locator('.screen.is-active .fit-avatar-img').count()
        sp = await slow_fitting()
        await picks(sp, [('outer', 'black-blazer'), ('outer', 'black-blazer')])  # on, then off before it loads
        await sp.wait_for_timeout(2500)
        r2, n2 = await avatar_render(sp, scope=''), await sp.locator('.screen.is-active .fit-avatar-img').count()
        check('slow network: quick picks end on the newest outfit, one image', r1 == 'look3' and n1 == 1 and r2 == 'base' and n2 == 1, f'{r1}×{n1} · {r2}×{n2}')
        await b.close()

        # ---- 首页 loading: the body renders are fetched after the page has loaded; rail tiles below the fold load lazily
        b = await p.chromium.launch()
        c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)  # empty image cache
        pp = await c.new_page()
        pp.on('pageerror', lambda e: errors.append('preload pageerror: ' + str(e)))
        await pp.goto(BASE + '?app=fitting'); await pp.evaluate('localStorage.clear(); sessionStorage.clear()')
        await pp.goto(BASE + '?app=fitting', wait_until='load')
        looks = "performance.getEntriesByType('resource').filter(e => /\\/avatar-look[123]\\.webp$/.test(e.name))"
        try:
            await pp.wait_for_function(f'{looks}.length === 3', timeout=10000)
        except Exception:
            pass
        got = await pp.evaluate(f"(() => {{ const nav = performance.getEntriesByType('navigation')[0]; const l = {looks}; return {{ n: l.length, afterLoad: l.every(e => e.startTime >= nav.loadEventEnd) }}; }})()")
        check('首页 preloads the body renders after the page loads', got['n'] == 3 and got['afterLoad'], f"{got['n']} of 3, after load: {got['afterLoad']}")
        eager = await pp.locator('.screen.is-active .fit-thumb-img:not([loading="lazy"])').count()
        lazy = await pp.locator('.screen.is-active .fit-thumb-img[loading="lazy"]').count()
        check('首页 rail loads off-screen thumbnails lazily', eager == 8 and lazy == 6, f'{eager} eager · {lazy} lazy')
        await b.close()

        # ---- 头像, 售后凭证 and AI 造型师 photos: Blobs in IndexedDB like the avatar media, never data URLs in localStorage
        b = await p.chromium.launch()
        c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        hp = await c.new_page()
        hp.on('console', lambda m: errors.append(f'photos {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        hp.on('pageerror', lambda e: errors.append('photos pageerror: ' + str(e)))
        hp.on('requestfailed', lambda r: errors.append('photos requestfailed: ' + r.url))
        ha = hp.locator('.screen.is-active')
        OID, OID2 = 'VT20260715092418', 'VT20260710151207'  # 运输中 and 待收货: both can file a return
        idb = lambda: hp.evaluate(IDB_COUNT)
        saved = lambda: hp.evaluate("localStorage.getItem('vt-prototype-state-v1') || ''")
        refs = f"(() => {{ const s = VT.store.get(); return [s.profile.photo, ...(s.returns['{OID}'] || {{ photos: [] }}).photos, ...s.chat.filter((m) => m.img).map((m) => m.img)].map((r) => (r && r.media ? 'media' : String(r).slice(0, 11))).join(','); }})()"

        async def visit(screen, oid=None):
            await hp.goto(BASE + f'?app={screen}' + (f'&oid={oid}' if oid else '')); await hp.wait_for_timeout(700)

        async def shown(sel):
            """the srcs of the active screen's `sel` images, once they are object URLs (they load after the first render)"""
            try:
                await hp.wait_for_function(f"() => {{ const i = [...document.querySelectorAll('.screen.is-active {sel}')]; return i.length && i.every((e) => e.src.startsWith('blob:')); }}", timeout=5000)
            except Exception:
                pass
            return await ha.locator(sel).evaluate_all('els => els.map((e) => e.getAttribute("src"))')

        await visit('profile'); await hp.evaluate('localStorage.clear(); sessionStorage.clear()')
        await visit('profile')
        for name in ('me_face.jpg', 'me_full.jpg'):  # the second replaces the first
            await ha.locator('.me-photo input').set_input_files(FIX + name); await hp.wait_for_timeout(500)
        head = await shown('.me-photo > img')
        await visit('returns', OID)
        await ha.locator('.or-reason').first.click()
        for name in ('my_jacket.jpg', 'me_full.jpg'):
            await ha.locator('input[data-change="photo"]').set_input_files(FIX + name); await hp.wait_for_timeout(500)
        await ha.locator('.rt-del').nth(1).click(); await hp.wait_for_timeout(300)  # ✕ deletes the second
        await ha.locator('[data-act="submit"]').click(); await hp.wait_for_timeout(600)
        await visit('stylist')
        await ha.locator('[data-act="plus"]').click(); await hp.wait_for_timeout(400)
        await hp.locator('.ov .st-up input').set_input_files(FIX + 'my_jacket.jpg')
        await hp.wait_for_selector('.screen.is-active .st-bubble--img img'); await hp.wait_for_timeout(400)
        bubble = await shown('.st-bubble--img img')
        n, kept, raw = await idb(), await hp.evaluate(refs), await saved()
        check('头像, 售后凭证 and AI 造型师 photos stay on this device in IndexedDB, never in localStorage', head[0].startswith('blob:') and bubble[0].startswith('blob:') and n == 3 and kept == 'media,media,media' and 'data:image' not in raw, f'{n} blobs, refs {kept}, data URLs in localStorage: {"data:image" in raw}')
        await visit('profile')
        head = await shown('.me-photo > img')
        await visit('returns', OID)
        shot = await shown('.rt-photos img')
        await visit('stylist')
        bubble = await shown('.st-bubble--img img')
        got = [x[:5] for x in head + shot + bubble]
        check('头像, 售后凭证 and AI 造型师 photos load from IndexedDB after a reload', got == ['blob:'] * 3 and await idb() == 3, ','.join(got))
        # the state an earlier version saved: avatar photos as { src }, the other photos as bare data URLs
        await hp.evaluate("""(oid) => {
          const cv = document.createElement('canvas'); cv.width = cv.height = 16;
          const g = cv.getContext('2d'); g.fillStyle = '#b7865b'; g.fillRect(0, 0, 16, 16);
          const d = cv.toDataURL('image/jpeg', 0.8);
          const s = JSON.parse(localStorage.getItem(VT.store.KEY));
          Object.assign(s.avatar, { status: 'ready', fullbody: { src: d, name: '全身照', w: 16, h: 16 }, portrait: { src: d, name: '生活照', w: 16, h: 16 } });
          s.profile.photo = d;
          s.returns[oid].photos = [d];
          s.chat.forEach((m) => { if (m.img) m.img = d; });
          localStorage.setItem(VT.store.KEY, JSON.stringify(s));
        }""", OID)
        await visit('profile')
        head, thumb = await shown('.me-photo > img'), await shown('.me-ava-thumb img')
        await hp.wait_for_timeout(300)
        n, kept, raw = await idb(), await hp.evaluate(refs), await saved()
        av = await hp.evaluate("[VT.store.get().avatar.fullbody, VT.store.get().avatar.portrait].map((r) => (r.media ? 'media' : 'src')).join(',')")
        check('data URLs saved by an earlier version move to IndexedDB at start-up (avatar photos too)', n == 5 and kept == 'media,media,media' and av == 'media,media' and 'data:image' not in raw and head[0].startswith('blob:') and thumb[0].startswith('blob:'), f'{n} blobs, refs {kept} + {av}, data URLs in localStorage: {"data:image" in raw}')
        await visit('returns', OID2)  # an unsent draft with a photo
        await ha.locator('input[data-change="photo"]').set_input_files(FIX + 'my_jacket.jpg'); await hp.wait_for_timeout(500)
        n0 = await idb()
        await hp.evaluate("VT.liveApp.go('privacy')"); await hp.wait_for_timeout(500)
        await ha.locator('[data-act="clearphotos"]').click(); await hp.wait_for_timeout(400)
        await hp.locator('.ov [data-act="yes"]').click(); await hp.wait_for_timeout(700)
        n1, kept = await idb(), await hp.evaluate(refs)
        await hp.evaluate('VT.liveApp.back()'); await hp.wait_for_timeout(500)
        draft = await ha.locator('.rt-photos--edit img').count()
        await visit('profile')
        head = await ha.locator('.me-photo > img').get_attribute('src')
        check('清除已上传的照片 also deletes the 头像, 售后凭证 (sent or not) and AI 造型师 photos', n0 == 6 and n1 == 0 and kept == 'null' and draft == 0 and head.endswith('chat-user.webp'), f'{n0} → {n1} blobs, left {kept}, draft photos {draft}, 头像 {head}')
        await visit('returns', OID2)
        await ha.locator('.or-reason').first.click()
        await ha.locator('input[data-change="photo"]').set_input_files(FIX + 'my_jacket.jpg'); await hp.wait_for_timeout(500)
        await ha.locator('[data-act="submit"]').click(); await hp.wait_for_timeout(600)
        n0 = await idb()
        await ha.locator('.or-row[data-act="return"]').click(); await hp.wait_for_timeout(500)
        await ha.locator('[data-act="withdraw"]').click(); await hp.wait_for_timeout(400)
        await hp.locator('.ov [data-act="yes"]').click(); await hp.wait_for_timeout(600)
        n1 = await idb()
        check('撤销申请 deletes its evidence photos', n0 == 1 and n1 == 0 and await cur(hp) == 'returns', f'{n0} → {n1} blobs')
        await b.close()
    print('\n'.join(log))
    print('passed', sum(1 for l in log if l.startswith('PASS')), 'of', len(log))
    print('--- console/page errors:', len(errors))
    for e in errors[:30]: print('  ', e)

try:
    asyncio.run(main())
finally:
    print('\n'.join(log[-12:]))
