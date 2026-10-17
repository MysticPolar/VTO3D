"""AI-stylist assets: clean look images (item columns removed), item tiles, chat avatar,
plus fitting-room renders of each look (upscaled x4, matted, scaled to the base avatar)."""
import sys, os, json
sys.path.insert(0, '/home/claude/tools')
import numpy as np
from PIL import Image
from imgtools import load, save, lama_window, grow, esrgan_x4, matte, decontaminate

SCR = '/home/claude/kit_raw/Virtual_TryOn_App_Asset_Kit_V1/01_screens/'
OUT = '/home/claude/assets_work/stylist/'
os.makedirs(OUT, exist_ok=True)
img = load(SCR + '07_ai_stylist.png')
Y0, Y1 = 643, 1164
cards = [(29, 294), (307, 569), (583, 838)]
items = [
    [('cami', 218, 668, 284, 753), ('jeans', 218, 759, 284, 869), ('brown_bag', 218, 875, 285, 969), ('sneakers', 218, 975, 284, 1052)],
    [('black_blazer', 492, 668, 559, 745), ('cami', 492, 750, 559, 822), ('jeans', 492, 827, 559, 915), ('black_bag', 492, 920, 559, 994), ('pumps', 492, 999, 559, 1071)],
    [('slip_dress', 763, 668, 830, 791), ('black_bag', 763, 796, 830, 883), ('heels', 763, 888, 830, 974), ('hoops', 763, 979, 830, 1062)],
]
meta = {}
for ci, ((x0, x1), its) in enumerate(zip(cards, items)):
    card = img[Y0:Y1, x0:x1].copy()
    m = np.zeros(card.shape[:2], bool)
    for name, a, b, c, d in its:
        tile = img[b:d, a:c]
        save(tile, OUT + f'look{ci+1}_item_{name}.png')
        m[b - Y0 - 3:d - Y0 + 4, a - x0 - 3:c - x0 + 5] = True
    clean = lama_window(card, m, (0, 0, card.shape[1], card.shape[0]))
    save(clean, OUT + f'look{ci+1}_card.png')
    meta[f'look{ci+1}'] = {'items': [i[0] for i in its]}
print('cards done', flush=True)

# chat user avatar (top-right round photo)
save(img[245:335, 738:828].copy(), OUT + 'chat_user_avatar.png')

# fitting-room renders from the clean card images
for ci in range(3):
    clean = load(OUT + f'look{ci+1}_card.png')
    up = esrgan_x4(clean)
    save(up, OUT + f'look{ci+1}_x4.png')
    print('upscaled', ci + 1, up.shape, flush=True)
json.dump(meta, open(OUT + 'meta.json', 'w'), indent=1)
print('done')
