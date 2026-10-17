"""Crop product imagery out of the reference screens and remove baked-in UI (hearts, borders)."""
import sys, os
sys.path.insert(0, '/home/claude/tools')
import numpy as np
from PIL import Image
from imgtools import load, save, lama_window, grow

SCR = '/home/claude/kit_raw/Virtual_TryOn_App_Asset_Kit_V1/01_screens/'
OUT = '/home/claude/assets_work/tiles/'
os.makedirs(OUT, exist_ok=True)


def dark_mask(img, box, thr=120):
    x0, y0, x1, y1 = box
    m = np.zeros(img.shape[:2], bool)
    L = img.astype(int).mean(2)
    m[y0:y1, x0:x1] = L[y0:y1, x0:x1] < thr
    return m


def clean_heart(img, tile, hbox, thr=120, grow_px=4):
    """Inpaint a heart icon located at hbox (relative to tile) inside a tile crop."""
    x0, y0, x1, y1 = tile
    crop = img[y0:y1, x0:x1].copy()
    hx0, hy0, hx1, hy1 = hbox
    m = dark_mask(crop, (hx0, hy0, hx1, hy1), thr)
    m = grow(m, grow_px)
    h, w = crop.shape[:2]
    # LaMa window: the whole tile (resized to 512) gives good context
    return lama_window(crop, m, (0, 0, w, h)), m


# ---------------- wardrobe tiles (06)
wr = load(SCR + '06_my_wardrobe.png')
cols = [(30, 291), (302, 562), (573, 833)]
rows = [(293, 567), (577, 851), (862, 1137), (1148, 1422)]
names = ['cream_cardigan', 'blue_striped_shirt', 'black_blazer', 'blue_jeans', 'brown_pleated_skirt', 'white_tee',
         'taupe_coat', 'white_sneakers', 'brown_leather_bag', 'black_cardigan', 'white_button_down', 'brown_sweater']
i = 0
for (ry0, ry1) in rows:
    for (cx0, cx1) in cols:
        tile = (cx0, ry0, cx1, ry1)
        out, m = clean_heart(wr, tile, (cx1 - cx0 - 58, 8, cx1 - cx0 - 10, 52))
        save(out, OUT + f'wr_{i+1:02d}_{names[i]}.png')
        i += 1

# row 5: visible part only; outpaint the hidden bottom
names5 = ['cream_ribbed_tank', 'beige_trousers', 'denim_jacket']
for j, (cx0, cx1) in enumerate(cols):
    vis = wr[1426:1636, cx0:cx1].copy()
    full = np.zeros((274, cx1 - cx0, 3), np.uint8)
    full[:210] = vis
    full[210:] = vis[-1:]
    m = np.zeros(full.shape[:2], bool)
    m[204:] = True
    hm = dark_mask(full, (cx1 - cx0 - 58, 8, cx1 - cx0 - 10, 52))
    m |= grow(hm, 4)
    out = lama_window(full, m, (0, 0, full.shape[1], full.shape[0]))
    save(out, OUT + f'wr_{13+j:02d}_{names5[j]}.png')

# ---------------- plaza images (04)
pz = load(SCR + '04_shopping_plaza.png')
pcols = [(44, 425), (442, 820)]
prows = [(397, 762), (917, 1232), (1381, 1567)]
pnames = ['knit_cardigan', 'straight_jeans', 'striped_shirt', 'brown_blazer', 'cami', 'pleated_skirt']
k = 0
for (ry0, ry1) in prows:
    for (cx0, cx1) in pcols:
        tile = (cx0, ry0, cx1, ry1)
        out, m = clean_heart(pz, tile, (cx1 - cx0 - 66, 10, cx1 - cx0 - 8, 66))
        save(out, OUT + f'pz_{k+1:02d}_{pnames[k]}.png')
        k += 1

# ---------------- fitting room thumbnails (03)
ft = load(SCR + '03_fitting_room.png')
fy = [(264, 401), (417, 552), (568, 706), (722, 859), (876, 1012), (1028, 1164), (1180, 1313), (1329, 1460), (1476, 1607), (1623, 1754)]
fnames = ['cream_cardigan', 'blue_striped_shirt', 'beige_blazer', 'black_blazer', 'white_cami', 'blue_shirt',
          'utility_jacket', 'grey_hoodie', 'black_sweater', 'bow_blouse']
for n, (y0, y1) in enumerate(fy):
    save(ft[y0:y1, 702:830].copy(), OUT + f'fit_{n+1:02d}_{fnames[n]}.png')
print('tiles done')
