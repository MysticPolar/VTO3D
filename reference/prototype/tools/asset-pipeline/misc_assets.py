"""Remaining crops: product hero + gallery (05), checkout image + payment marks (08),
order thumbnails (09), sample upload photos (02)."""
import sys, os
sys.path.insert(0, '/home/claude/tools')
import numpy as np
from PIL import Image, ImageDraw
from imgtools import load, save, lama_window, grow

SCR = '/home/claude/kit_raw/Virtual_TryOn_App_Asset_Kit_V1/01_screens/'
OUT = '/home/claude/assets_work/misc/'
os.makedirs(OUT, exist_ok=True)

# ---------- 05 product details hero: remove status bar, back / heart / share icons, white corners
d5 = load(SCR + '05_product_details.png')
hero = d5[0:776].copy()
L = hero.astype(int).mean(2)
m = np.zeros(hero.shape[:2], bool)
m[18:56, 60:150] = L[18:56, 60:150] < 150          # 9:41
m[18:56, 660:840] = L[18:56, 660:840] < 150        # status icons
m[95:155, 40:85] = L[95:155, 40:85] < 150          # back chevron
m[95:155, 680:840] = L[95:155, 680:840] < 150      # heart + share
m = grow(m, 6)
m[0:30, 0:40] = True; m[0:30, 823:] = True          # rounded white corners
m[0:6, :] = True
hero = lama_window(hero, m, (0, 0, 863, 520))
save(hero, OUT + 'pd_hero.png')
# gallery thumbs (thumb 1 has a selection border: crop inside it)
gal = [(43, 793, 211, 947), (233, 787, 378, 953), (391, 787, 536, 953), (549, 787, 694, 953), (707, 787, 841, 953)]
for i, (a, b, c, d) in enumerate(gal):
    save(d5[b:d, a:c].copy(), OUT + f'pd_gallery_{i+1}.png')

# ---------- 08 checkout product image + payment marks
d8 = load(SCR + '08_checkout.png')
save(d8[212:483, 48:330].copy(), OUT + 'co_product.png')
for name, (a, b, c, d) in {'alipay': (121, 1040, 183, 1099), 'wechat': (121, 1120, 183, 1180), 'unionpay': (121, 1200, 183, 1260)}.items():
    save(d8[b:d, a:c].copy(), OUT + f'pay_{name}.png')

# ---------- 09 orders: product image + 4 thumbnails
d9 = load(SCR + '09_orders_support.png')
save(d9[611:880, 66:353].copy(), OUT + 'or_product.png')
for i, (a, c) in enumerate([(66, 233), (255, 421), (443, 609), (631, 797)]):
    save(d9[925:1065, a:c].copy(), OUT + f'or_thumb_{i+1}.png')

# ---------- 02 upload samples: remove the "+" buttons
d2 = load(SCR + '02_avatar_upload.png')
for name, (a, b, c, d), (px, py) in [('upload_fullbody', (34, 683, 415, 1489), (223, 1424)),
                                       ('upload_portrait', (455, 684, 832, 1489), (642, 1424))]:
    crop = d2[b:d, a:c].copy()
    mm = Image.new('L', (c - a, d - b), 0)
    ImageDraw.Draw(mm).ellipse((px - a - 46, py - b - 46, px - a + 46, py - b + 46), fill=255)
    mk = np.asarray(mm) > 0
    h, w = crop.shape[:2]
    crop = lama_window(crop, mk, (0, max(0, h - w), w, h))
    save(crop, OUT + name + '.png')
print('misc done')
