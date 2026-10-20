"""Subset Noto Sans CJK SC + Inter to the glyphs used by the prototype (woff2).

Usage: python3 tools/subset_fonts.py   (after editing any copy; the working folder doesn't matter)
Requires: fonttools + brotli, and the source fonts, read from the first folder below that has
every weight ($VT_FONTS_SRC, the repo's fonts-src/, ~/.cache/vto3d/fonts/noto-cjk-2.004,
then the Debian/Ubuntu font folders):
  Noto Sans CJK 2.004 collections NotoSansCJK-{Regular,Medium,Bold,Black}.ttc
    (https://github.com/notofonts/noto-cjk/tree/Sans2.004/Sans/OTC, or apt fonts-noto-cjk)
  Inter 4.000 Inter-{Regular,Medium,SemiBold,Bold,ExtraBold}.otf (apt fonts-inter). Optional:
    Inter is cut to a fixed Latin range that new copy never changes, so without it the
    vt-inter-*.woff2 files are kept.
"""
import os, subprocess, sys, tempfile
from fontTools.ttLib import TTCollection, TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'fonts')
DIRS = [os.environ.get('VT_FONTS_SRC'), os.path.normpath(os.path.join(ROOT, '..', '..', 'fonts-src')),
        os.path.expanduser('~/.cache/vto3d/fonts/noto-cjk-2.004'),
        '/usr/share/fonts/opentype/noto', '/usr/share/fonts/opentype/inter']
NOTO = ('NotoSansCJK-{}.ttc', [(400, 'Regular'), (500, 'Medium'), (700, 'Bold'), (900, 'Black')])
INTER = ('Inter-{}.otf', [(400, 'Regular'), (500, 'Medium'), (600, 'SemiBold'), (700, 'Bold'), (800, 'ExtraBold')])
COMMON = ['--flavor=woff2', '--layout-features=*', '--no-hinting', '--desubroutinize']


def sources(pattern, weights):
    """{weight: path} from the first folder that has every weight, so versions never mix."""
    for d in filter(None, DIRS):
        paths = {w: os.path.join(d, pattern.format(name)) for w, name in weights}
        if all(map(os.path.exists, paths.values())):
            return paths
    return None


def sc_face(path):
    """Index of the Noto Sans CJK SC face in the collection (2 in the 2.004 release)."""
    with TTCollection(path, lazy=True) as c:
        for i, f in enumerate(c):
            if f['name'].getDebugName(1).startswith('Noto Sans CJK SC'):
                return i
    sys.exit(f'no Noto Sans CJK SC face in {path}')


def subset(src, out, args, face=0):
    """Subset src into out; warn when the source version differs from the file it replaces."""
    rev = TTFont(src, fontNumber=face, lazy=True)['head'].fontRevision
    old = TTFont(out, lazy=True)['head'].fontRevision if os.path.exists(out) else rev
    print(f'{os.path.basename(out)} <- {src} (face {face}, version {rev:.3f})')
    if abs(old - rev) > 1e-6:
        print(f'  WARNING: replaces version {old:.3f}; existing glyphs and metrics may change')
    subprocess.run([sys.executable, '-m', 'fontTools.subset', src, f'--font-number={face}',
                    f'--output-file={out}'] + COMMON + args, check=True)


chars = set()
for d, _, files in os.walk(ROOT):
    if os.path.relpath(d, ROOT).split(os.sep)[0] in ('assets', 'docs', 'tools'):
        continue
    for f in files:
        if f.endswith(('.html', '.js', '.css')):
            chars |= set(open(os.path.join(d, f), encoding='utf-8').read())
# always include printable ASCII + common CJK punctuation + digits
chars |= set(chr(c) for c in range(0x20, 0x7F))
chars |= set('，。、；：？！“”‘’（）《》【】…—·￥¥％＋－×÷～　「」『』〔〕')
text = ''.join(sorted(c for c in chars if ord(c) >= 0x20))
cjk = sum(1 for c in text if ord(c) > 0x2E80)
print(f'{len(text)} glyphs ({cjk} CJK)')

noto, inter = sources(*NOTO), sources(*INTER)
if not noto:
    sys.exit('Noto Sans CJK 2.004 (NotoSansCJK-{Regular,Medium,Bold,Black}.ttc) not found in:\n  '
             + '\n  '.join(filter(None, DIRS)))
os.makedirs(OUT, exist_ok=True)
with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.txt', delete=False) as tmp:
    tmp.write(text)
try:
    for w, src in noto.items():
        out, face = os.path.join(OUT, f'vt-sans-sc-{w}.woff2'), sc_face(src)
        subset(src, out, [f'--text-file={tmp.name}'], face)
        # every collected character the source has must now be in the subset
        have, got = TTFont(src, fontNumber=face, lazy=True).getBestCmap(), TTFont(out).getBestCmap()
        lost = ''.join(c for c in text if ord(c) in have and ord(c) not in got)
        if lost:
            sys.exit(f'{out} lacks {lost}')
    absent = ''.join(c for c in text if ord(c) not in have)
    if absent:
        print(f'not in Noto Sans CJK SC (left to the system font): {absent}')
    for w, src in (inter or {}).items():
        out = os.path.join(OUT, f'vt-inter-{w}.woff2')
        subset(src, out, ['--unicodes=U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-203A,U+20AC,U+2190-2193,U+2212'])
    if not inter:
        print('Inter 4.000 sources not found: vt-inter-*.woff2 kept as they are')
finally:
    os.remove(tmp.name)
for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, 'KB')
