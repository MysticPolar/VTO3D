/**
 * `pnpm fonts:check` (runs before every build): lists the characters in the app's source that the
 * self-hosted subset fonts don't have, so they would fall back to a system font (HANDOFF §5.2).
 *
 * The Noto Sans SC subsets in src/styles/fonts/ hold exactly the characters in charset.txt. When
 * that file is missing it is created from the prototype, collecting characters the way
 * reference/prototype/tools/subset_fonts.py did when it made these fonts; later `pnpm fonts`
 * rewrites it. Missing characters are a warning until Phase 6; `--strict` (from Phase 6) fails.
 *
 * `--prototype <dir>` collects from another copy of the prototype, e.g. a clean export of the last
 * commit while reference/prototype/ has uncommitted edits whose new copy the fonts don't have yet.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: { strict: { type: 'boolean', default: false }, prototype: { type: 'string' } },
});
const ROOT = join(import.meta.dirname, '..', '..');
const PROTOTYPE = resolve(args.prototype ?? join(ROOT, 'reference', 'prototype'));
const CHARSET = join(ROOT, 'src', 'styles', 'fonts', 'charset.txt');
const strict = args.strict;

const codePoint = (c: string) => c.codePointAt(0) ?? 0;

/** Printable ASCII and common CJK punctuation: always in the subset, as in subset_fonts.py */
const ALWAYS = [
  ...Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCodePoint(0x20 + i)),
  ...'，。、；：？！“”‘’（）《》【】…—·￥¥％＋－×÷～　「」『』〔〕',
];

/** Inter is subset to these fixed ranges whatever the copy uses (subset_fonts.py), and its
 * @font-face unicode-range covers them, so they never fall back */
const INTER = [
  [0x20, 0x7e],
  [0xa0, 0xff],
  [0x2010, 0x2027],
  [0x2030, 0x203a],
  [0x20ac, 0x20ac],
  [0x2190, 0x2193],
  [0x2212, 0x2212],
];
const inInter = (c: string) =>
  INTER.some(([lo = 0, hi = 0]) => codePoint(c) >= lo && codePoint(c) <= hi);

/** Every file below `dir`, as a /-separated path relative to it, that passes `keep` */
function files(dir: string, keep: (rel: string) => boolean): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .filter(keep);
}

/** subset_fonts.py: every character of the prototype's .html, .js and .css files outside
 * assets/, docs/ and tools/, plus ALWAYS, without control characters, sorted by code point */
function prototypeCharset(): string {
  const skipped = (rel: string) =>
    ['/assets', '/docs', '/tools'].some((d) => `/${dirname(rel)}`.includes(d));
  const chars = new Set(ALWAYS);
  for (const rel of files(PROTOTYPE, (r) => /\.(html|js|css)$/.test(r) && !skipped(r))) {
    for (const c of readFileSync(join(PROTOTYPE, rel), 'utf8')) chars.add(c);
  }
  return [...chars]
    .filter((c) => codePoint(c) >= 0x20)
    .sort((a, b) => codePoint(a) - codePoint(b))
    .join('');
}

/** Characters in index.html and src/**\/*.{ts,tsx,css} (tests excluded), with the first file
 * that uses each */
function appChars(): Map<string, string> {
  const sources = [
    'index.html',
    ...files(
      join(ROOT, 'src'),
      (r) => /\.(ts|tsx|css)$/.test(r) && !/\.test\.tsx?$/.test(r) && !r.startsWith('test/'),
    ).map((r) => `src/${r}`),
  ];
  const found = new Map<string, string>();
  for (const rel of sources) {
    for (const c of readFileSync(join(ROOT, rel), 'utf8')) {
      if (codePoint(c) >= 0x20 && !found.has(c)) found.set(c, rel);
    }
  }
  return found;
}

if (!existsSync(CHARSET)) {
  const text = prototypeCharset();
  writeFileSync(CHARSET, text);
  const all = [...text];
  const cjk = all.filter((c) => codePoint(c) > 0x2e80).length;
  console.log(
    `fonts:check: created ${relative(ROOT, CHARSET)} from the prototype: ${all.length} characters (${cjk} CJK)`,
  );
}

const charset = new Set(readFileSync(CHARSET, 'utf8'));
const missing = [...appChars()].filter(([c]) => !charset.has(c) && !inInter(c));

if (missing.length === 0) {
  console.log('fonts:check: every character in src/ and index.html is in the font subset');
} else {
  const hex = (c: string) => `U+${codePoint(c).toString(16).toUpperCase().padStart(4, '0')}`;
  const lines = missing.map(([c, file]) => `  ${c}  ${hex(c)}  ${file}`).join('\n');
  const message =
    `fonts:check: ${missing.length} character(s) are not in the font subset ` +
    `(src/styles/fonts/charset.txt), so they fall back to a system font until \`pnpm fonts\` ` +
    `re-subsets the fonts:\n${lines}`;
  if (strict) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
}
