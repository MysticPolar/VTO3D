"""Subset Noto Sans CJK SC + Inter to the glyphs used by the prototype (woff2).

Usage: python3 tools/subset_fonts.py   (run from the project root after editing any copy)
Requires: fonttools + brotli, and the system fonts Noto Sans CJK / Inter.
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'fonts')
NOTO = '/usr/share/fonts/opentype/noto/NotoSansCJK-{}.ttc'
INTER = '/usr/share/fonts/opentype/inter/Inter-{}.otf'

chars = set()
for d, _, files in os.walk(ROOT):
    if '/assets' in d or '/docs' in d or '/tools' in d:
        continue
    for f in files:
        if f.endswith(('.html', '.js', '.css')):
            chars |= set(open(os.path.join(d, f), encoding='utf-8').read())
# always include printable ASCII + common CJK punctuation + digits
chars |= set(chr(c) for c in range(0x20, 0x7F))
chars |= set('，。、；：？！“”‘’（）《》【】…—·￥¥％＋－×÷～　「」『』〔〕')
text = ''.join(sorted(c for c in chars if ord(c) >= 0x20))
tmp = os.path.join(OUT, '_chars.txt')
os.makedirs(OUT, exist_ok=True)
open(tmp, 'w', encoding='utf-8').write(text)
cjk = sum(1 for c in text if ord(c) > 0x2E80)
print(f'{len(text)} glyphs ({cjk} CJK)')

common = ['--flavor=woff2', '--layout-features=*', '--no-hinting', '--desubroutinize', f'--text-file={tmp}']
for w, name in [(400, 'Regular'), (500, 'Medium'), (700, 'Bold'), (900, 'Black')]:
    out = os.path.join(OUT, f'vt-sans-sc-{w}.woff2')
    subprocess.run(['pyftsubset', NOTO.format(name), '--font-number=2', f'--output-file={out}'] + common, check=True)
for w, name in [(400, 'Regular'), (500, 'Medium'), (600, 'SemiBold'), (700, 'Bold'), (800, 'ExtraBold')]:
    out = os.path.join(OUT, f'vt-inter-{w}.woff2')
    subprocess.run(['pyftsubset', INTER.format(name), f'--output-file={out}', '--unicodes=U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-203A,U+20AC,U+2190-2193,U+2212'] + [c for c in common if not c.startswith('--text-file')], check=True)
os.remove(tmp)
for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, 'KB')
