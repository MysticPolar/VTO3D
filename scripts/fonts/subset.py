"""pnpm fonts: re-subset the self-hosted fonts to the characters the app uses (HANDOFF §5.2).

A port of reference/prototype/tools/subset_fonts.py, with the same options. It collects the
characters in index.html and src/**/*.{ts,tsx,css} (tests excluded), plus printable ASCII and
common CJK punctuation; subsets the source fonts in fonts-src/ (git-ignored) into
src/styles/fonts/*.woff2; then writes the collected characters to src/styles/fonts/charset.txt,
which `pnpm fonts:check` reads.

Requires Python 3 with fonttools and brotli:  python3 -m pip install fonttools brotli
"""
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONTS_SRC = os.path.join(ROOT, 'fonts-src')
OUT = os.path.join(ROOT, 'src', 'styles', 'fonts')
CHARSET = os.path.join(OUT, 'charset.txt')

# weight -> style name of the prototype's source fonts: Noto Sans CJK (its SC face) and Inter
NOTO = [(400, 'Regular'), (500, 'Medium'), (700, 'Bold'), (900, 'Black')]
INTER = [(400, 'Regular'), (500, 'Medium'), (600, 'SemiBold'), (700, 'Bold'), (800, 'ExtraBold')]
INTER_UNICODES = 'U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-203A,U+20AC,U+2190-2193,U+2212'
COMMON = ['--flavor=woff2', '--layout-features=*', '--no-hinting', '--desubroutinize']
ALWAYS = set(chr(c) for c in range(0x20, 0x7F)) | set('，。、；：？！“”‘’（）《》【】…—·￥¥％＋－×÷～　「」『』〔〕')


def noto_source(name):
    """Noto Sans SC as a region-specific OTF, or the Noto Sans CJK collection (SC is face 2)."""
    for file, extra in ((f'NotoSansSC-{name}.otf', []), (f'NotoSansCJK-{name}.ttc', ['--font-number=2'])):
        path = os.path.join(FONTS_SRC, file)
        if os.path.exists(path):
            return [path] + extra
    return None


def inter_source(name):
    for file in (f'Inter-{name}.otf', f'Inter-{name}.ttf'):
        path = os.path.join(FONTS_SRC, file)
        if os.path.exists(path):
            return [path]
    return None


def collect():
    files = [os.path.join(ROOT, 'index.html')]
    src = os.path.join(ROOT, 'src')
    for d, _, names in os.walk(src):
        if os.path.relpath(d, src).split(os.sep)[0] == 'test':
            continue
        files += [os.path.join(d, n) for n in names
                  if n.endswith(('.ts', '.tsx', '.css')) and not re.search(r'\.test\.tsx?$', n)]
    chars = set(ALWAYS)
    for f in files:
        with open(f, encoding='utf-8') as fh:
            chars |= set(fh.read())
    return ''.join(sorted(c for c in chars if ord(c) >= 0x20))


def subset(args):
    subprocess.run([sys.executable, '-m', 'fontTools.subset'] + args, check=True)


def main():
    try:
        import brotli  # noqa: F401
        import fontTools  # noqa: F401
    except ImportError:
        sys.exit('pnpm fonts needs fonttools and brotli:  python3 -m pip install fonttools brotli')

    noto = {w: noto_source(n) for w, n in NOTO}
    inter = {w: inter_source(n) for w, n in INTER}
    missing = [f'NotoSansSC-{n}.otf (or NotoSansCJK-{n}.ttc)' for w, n in NOTO if not noto[w]]
    missing += [f'Inter-{n}.otf (or .ttf)' for w, n in INTER if not inter[w]]
    if missing:
        sys.exit('pnpm fonts: put the source fonts in fonts-src/ first. Missing:\n  ' + '\n  '.join(missing))

    text = collect()
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.txt', delete=False) as tmp:
        tmp.write(text)
    try:
        for w, _ in NOTO:
            out = os.path.join(OUT, f'vt-sans-sc-{w}.woff2')
            subset(noto[w] + [f'--output-file={out}', f'--text-file={tmp.name}'] + COMMON)
        for w, _ in INTER:
            out = os.path.join(OUT, f'vt-inter-{w}.woff2')
            subset(inter[w] + [f'--output-file={out}', f'--unicodes={INTER_UNICODES}'] + COMMON)
    finally:
        os.remove(tmp.name)

    with open(CHARSET, 'w', encoding='utf-8') as fh:
        fh.write(text)
    cjk = sum(1 for c in text if ord(c) > 0x2E80)
    print(f'{len(text)} glyphs ({cjk} CJK), written to {os.path.relpath(CHARSET, ROOT)}')
    for f in sorted(os.listdir(OUT)):
        print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, 'KB')


if __name__ == '__main__':
    main()
