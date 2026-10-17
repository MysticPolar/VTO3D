"""Export all prepared imagery into the prototype's /assets tree as WebP.
Upscaled (Real-ESRGAN x4) variants are cached in /home/claude/assets_work/x4cache."""
import sys, os, shutil
sys.path.insert(0, '/home/claude/tools')
import numpy as np
from PIL import Image
from imgtools import load, esrgan_x4

W = '/home/claude/assets_work/'
P = '/home/claude/vto-prototype/assets/'
CACHE = W + 'x4cache/'
os.makedirs(CACHE, exist_ok=True)
for d in ['people', 'clothing/cards', 'clothing/tiles', 'clothing/thumbs', 'clothing/hd', 'clothing/items', 'clothing/details', 'backgrounds', 'ui', 'icons']:
    os.makedirs(P + d, exist_ok=True)

only = set(sys.argv[1:])


def webp(im, path, q=84, maxw=None, maxh=None):
    if isinstance(im, np.ndarray):
        im = Image.fromarray(im)
    if maxw and im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    if maxh and im.height > maxh:
        im = im.resize((round(im.width * maxh / im.height), maxh), Image.LANCZOS)
    im.save(P + path, 'WEBP', quality=q, method=6)


def x4(src_path):
    key = CACHE + src_path.replace('/', '_')
    if os.path.exists(key):
        return Image.open(key)
    up = Image.fromarray(esrgan_x4(load(W + src_path)))
    up.save(key)
    print('  x4', src_path, up.size, flush=True)
    return up


def want(group):
    return not only or group in only


# ---------------- people / backgrounds / ui
if want('people'):
    webp(Image.open(W + 'onboarding_clean.png'), 'people/onboarding-scene.webp', q=82)
    for n in ['base', 'look1', 'look2', 'look3']:
        webp(Image.open(W + f'renders/avatar_{n}.png'), f'people/avatar-{n}.webp', q=86)
    for i in (1, 2, 3):
        up = Image.open(W + f'stylist/look{i}_x4.png')
        webp(up, f'people/look{i}-card.webp', q=84, maxw=530)
    webp(Image.open(W + 'misc/upload_fullbody.png'), 'people/upload-fullbody.webp', q=86)
    webp(Image.open(W + 'misc/upload_portrait.png'), 'people/upload-portrait.webp', q=86)
    webp(Image.open(W + 'stylist/chat_user_avatar.png'), 'people/chat-user.webp', q=88)
    webp(Image.open(W + 'fitting_plate.png'), 'backgrounds/fitting-plate.webp', q=88, maxw=432)
    for n in ['alipay', 'wechat', 'unionpay']:
        webp(Image.open(W + f'misc/pay_{n}.png'), f'ui/pay-{n}.webp', q=90)
    print('people/ui done', flush=True)

# ---------------- clothing crops at native resolution
T = W + 'tiles/'
cards = {'knit-cardigan': 'pz_01_knit_cardigan', 'straight-jeans': 'pz_02_straight_jeans', 'striped-shirt': 'pz_03_striped_shirt',
         'brown-blazer': 'pz_04_brown_blazer', 'basic-cami': 'pz_05_cami', 'pleated-skirt': 'pz_06_pleated_skirt'}
tiles = {'knit-cardigan': 'wr_01_cream_cardigan', 'striped-shirt': 'wr_02_blue_striped_shirt', 'black-blazer': 'wr_03_black_blazer',
         'straight-jeans': 'wr_04_blue_jeans', 'pleated-skirt': 'wr_05_brown_pleated_skirt', 'white-tee': 'wr_06_white_tee',
         'taupe-coat': 'wr_07_taupe_coat', 'white-sneakers': 'wr_08_white_sneakers', 'brown-tote': 'wr_09_brown_leather_bag',
         'black-cardigan': 'wr_10_black_cardigan', 'white-shirt': 'wr_11_white_button_down', 'brown-sweater': 'wr_12_brown_sweater',
         'ribbed-tank': 'wr_13_cream_ribbed_tank', 'beige-trousers': 'wr_14_beige_trousers', 'denim-jacket': 'wr_15_denim_jacket'}
thumbs = {'knit-cardigan': 'fit_01_cream_cardigan', 'striped-shirt': 'fit_02_blue_striped_shirt', 'beige-blazer': 'fit_03_beige_blazer',
          'black-blazer': 'fit_04_black_blazer', 'basic-cami': 'fit_05_white_cami', 'oxford-shirt': 'fit_06_blue_shirt',
          'utility-jacket': 'fit_07_utility_jacket', 'grey-hoodie': 'fit_08_grey_hoodie', 'black-sweater': 'fit_09_black_sweater',
          'bow-blouse': 'fit_10_bow_blouse'}
if want('crops'):
    for k, v in cards.items():
        webp(Image.open(T + v + '.png'), f'clothing/cards/{k}.webp', q=86)
    for k, v in tiles.items():
        webp(Image.open(T + v + '.png'), f'clothing/tiles/{k}.webp', q=86)
    for k, v in thumbs.items():
        webp(Image.open(T + v + '.png'), f'clothing/thumbs/{k}.webp', q=88)
    M = W + 'misc/'
    webp(Image.open(M + 'pd_hero.png'), 'clothing/details/striped-shirt-hero.webp', q=86)
    for i in range(1, 6):
        webp(Image.open(M + f'pd_gallery_{i}.png'), f'clothing/details/striped-shirt-g{i}.webp', q=88)
    webp(Image.open(M + 'co_product.png'), 'clothing/details/striped-shirt-checkout.webp', q=88)
    webp(Image.open(M + 'or_product.png'), 'clothing/details/striped-shirt-order.webp', q=88)
    for i in range(1, 5):
        webp(Image.open(M + f'or_thumb_{i}.png'), f'clothing/details/striped-shirt-o{i}.webp', q=88)
    print('crops done', flush=True)

# ---------------- upscaled (x4) imagery
if want('x4'):
    S = 'stylist/'
    items = {'basic-cami': 'look1_item_cami', 'basic-cami-2': 'look2_item_cami', 'straight-jeans': 'look1_item_jeans',
             'straight-jeans-2': 'look2_item_jeans', 'brown-tote': 'look1_item_brown_bag', 'white-sneakers': 'look1_item_sneakers',
             'black-blazer': 'look2_item_black_blazer', 'black-handbag': 'look2_item_black_bag', 'black-handbag-2': 'look3_item_black_bag',
             'black-pumps': 'look2_item_pumps', 'satin-slip-dress': 'look3_item_slip_dress', 'strappy-heels': 'look3_item_heels',
             'gold-hoops': 'look3_item_hoops'}
    for k, v in items.items():
        webp(x4(S + v + '.png'), f'clothing/items/{k}.webp', q=86)
    print('items done', flush=True)
    for i, name in [(2, 'model-1'), (3, 'model-2'), (4, 'model-3'), (5, 'fabric')]:
        webp(x4(f'misc/pd_gallery_{i}.png'), f'clothing/details/striped-shirt-{name}.webp', q=86, maxw=640)
    hd = {'knit-cardigan': 'tiles/pz_01_knit_cardigan.png', 'knit-cardigan-2': 'tiles/wr_01_cream_cardigan.png',
          'straight-jeans': 'tiles/pz_02_straight_jeans.png', 'straight-jeans-2': 'tiles/wr_04_blue_jeans.png',
          'brown-blazer': 'tiles/pz_04_brown_blazer.png', 'basic-cami': 'tiles/fit_05_white_cami.png', 'basic-cami-2': 'tiles/pz_05_cami.png',
          'pleated-skirt': 'tiles/wr_05_brown_pleated_skirt.png', 'pleated-skirt-2': 'tiles/pz_06_pleated_skirt.png',
          'black-blazer': 'tiles/wr_03_black_blazer.png', 'black-blazer-2': 'tiles/fit_04_black_blazer.png'}
    for k, v in tiles.items():
        hd.setdefault(k, 'tiles/' + v + '.png')
    for k, v in thumbs.items():
        hd.setdefault(k, 'tiles/' + v + '.png')
    for k, v in hd.items():
        webp(x4(v), f'clothing/hd/{k}.webp', q=84, maxw=840)
    print('hd done', flush=True)

# ---------------- kit icons (reference copies)
if want('icons'):
    src = '/home/claude/kit_raw/Virtual_TryOn_App_Asset_Kit_V1/04_icons/'
    for f in os.listdir(src):
        if f.endswith('.svg'):
            shutil.copy(src + f, P + 'icons/kit-' + f)
    print('icons copied', flush=True)
print('ALL DONE')
