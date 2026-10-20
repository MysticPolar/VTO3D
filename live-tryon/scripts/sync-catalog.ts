/**
 * `pnpm catalog`: copies what the live try-on page needs from the VTO3D prototype, the app's
 * source of truth (reference/prototype/), into this folder:
 *
 *   src/catalog/catalog.json        try-on categories and garments (ids, names, slots, image sizes)
 *   public/catalog/<id>.webp        each garment's clean product photo, the try-on reference image
 *   public/catalog/thumbs/<id>.webp the thumbnail 首页's rail shows (img.thumb || img.tile)
 *   public/proto/…                  the subset fonts, the 首页 background plate and the base avatar
 *   src/web/proto/tokens.css        the design tokens (values unchanged)
 *
 * The copies are committed so the folder builds and deploys on its own. `--check` compares them
 * with the prototype instead and exits 1 on any difference (the catalog test runs it).
 * The JSON and the CSS are written Prettier-formatted (the app's settings), so this folder passes
 * both its own `pnpm lint` and the app's root `pnpm lint`; the token values stay unchanged.
 * `--prototype <dir>` reads another copy of the prototype.
 *
 * Self-contained on purpose: Node runs it directly (type stripping), with no local imports.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { createContext, runInContext } from 'node:vm';
import { format, resolveConfig } from 'prettier';

const ROOT = join(import.meta.dirname, '..');
const { values: args } = parseArgs({
  options: {
    check: { type: 'boolean', default: false },
    prototype: { type: 'string', default: join(ROOT, '..', 'reference', 'prototype') },
  },
});
const PROTO = args.prototype;

interface Product {
  id: string;
  name: string;
  cat: string;
  img: { thumb?: string; tile?: string; hd?: string; item?: string };
}
interface FitCategory {
  id: string;
  label: string;
  items: string[];
}
interface PrototypeData {
  byId: Record<string, Product>;
  fitCatsAll: FitCategory[];
  slotOf: (p: Product) => string;
}

/** data.js is a classic script that fills window.VT.data; run it in an empty sandbox */
function loadData(): PrototypeData {
  const source = readFileSync(join(PROTO, 'js', 'data.js'), 'utf8');
  const window: { VT?: { data?: PrototypeData } } = {};
  runInContext(source, createContext({ window }), { filename: 'data.js' });
  const data = window.VT?.data;
  if (!data?.byId || !data.fitCatsAll) throw new Error('data.js did not define VT.data');
  return data;
}

/** Width and height from a WebP header (lossy, lossless or extended) */
export function webpSize(buf: Buffer): { width: number; height: number } {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('not a WebP file');
  }
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ')
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X')
    return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  throw new Error(`unknown WebP chunk ${chunk}`);
}

/** Decart: "At least 512×512 pixels — the model reproduces what it sees" (Virtual Try-On docs) */
const MIN_REFERENCE_PX = 512;

const outputs = new Map<string, Buffer>();
const put = (path: string, data: Buffer | string) =>
  outputs.set(path, typeof data === 'string' ? Buffer.from(data) : data);

/** Text the repo's Prettier would leave as it is */
async function pretty(path: string, text: string): Promise<string> {
  const options = (await resolveConfig(join(ROOT, path))) ?? {};
  return format(text, { ...options, filepath: join(ROOT, path) });
}

const data = loadData();
const used = new Set(data.fitCatsAll.flatMap((c) => c.items));
const garments = [...used].map((id) => {
  const p = data.byId[id];
  if (!p) throw new Error(`fitCatsAll lists unknown product ${id}`);
  // the clean product photo: hd/<id>.webp where it exists (striped-shirt's img.hd is an on-model
  // hero shot), else the item cut-out, else whatever img.hd is
  const clean = `assets/clothing/hd/${id}.webp`;
  const reference = existsSync(join(PROTO, clean)) ? clean : (p.img.item ?? p.img.hd);
  const thumb = p.img.thumb ?? p.img.tile ?? reference;
  if (!reference || !thumb) throw new Error(`${id} has no image`);
  const image = readFileSync(join(PROTO, reference));
  const size = webpSize(image);
  put(`public/catalog/${id}.webp`, image);
  put(`public/catalog/thumbs/${id}.webp`, readFileSync(join(PROTO, thumb)));
  return {
    id,
    name: p.name,
    slot: data.slotOf(p),
    image: `/catalog/${id}.webp`,
    thumb: `/catalog/thumbs/${id}.webp`,
    width: size.width,
    height: size.height,
    lowRes: Math.min(size.width, size.height) < MIN_REFERENCE_PX,
    source: reference,
  };
});

const catalog = {
  note: 'Generated by `pnpm catalog` from reference/prototype/js/data.js. Do not edit by hand.',
  categories: data.fitCatsAll.map((c) => ({ id: c.id, label: c.label, items: c.items })),
  garments,
};
put('src/catalog/catalog.json', await pretty('src/catalog/catalog.json', JSON.stringify(catalog)));

for (const font of readdirSync(join(PROTO, 'assets', 'fonts')).filter((f) =>
  f.endsWith('.woff2'),
)) {
  put(`public/proto/fonts/${font}`, readFileSync(join(PROTO, 'assets', 'fonts', font)));
}
put(
  'public/proto/fitting-plate.webp',
  readFileSync(join(PROTO, 'assets', 'backgrounds', 'fitting-plate.webp')),
);
put(
  'public/proto/avatar-base.webp',
  readFileSync(join(PROTO, 'assets', 'people', 'avatar-base.webp')),
);
put(
  'src/web/proto/tokens.css',
  await pretty('src/web/proto/tokens.css', readFileSync(join(PROTO, 'css', 'tokens.css'), 'utf8')),
);

/** Folders this script owns completely, so files the prototype dropped are removed or reported */
const OWNED = ['public/catalog', 'public/proto', 'src/web/proto'];
const onDisk = (dir: string): string[] =>
  existsSync(join(ROOT, dir))
    ? readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => relative(ROOT, join(e.parentPath, e.name)))
    : [];
const stale = OWNED.flatMap(onDisk).filter((path) => !outputs.has(path));

const hash = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

if (args.check) {
  const problems: string[] = [];
  for (const [path, buf] of outputs) {
    const file = join(ROOT, path);
    if (!existsSync(file)) problems.push(`missing  ${path}`);
    else if (hash(readFileSync(file)) !== hash(buf)) problems.push(`differs  ${path}`);
  }
  for (const path of stale) problems.push(`extra    ${path}`);
  if (problems.length) {
    console.error(
      `The catalog is out of date with ${PROTO}. Run \`pnpm catalog\`.\n${problems.join('\n')}`,
    );
    process.exit(1);
  }
  console.log(`Catalog matches the prototype: ${garments.length} garments, ${outputs.size} files.`);
} else {
  for (const path of stale) rmSync(join(ROOT, path));
  for (const [path, buf] of outputs) {
    mkdirSync(dirname(join(ROOT, path)), { recursive: true });
    writeFileSync(join(ROOT, path), buf);
  }
  const low = garments.filter((g) => g.lowRes).map((g) => `${g.id} (${g.width}×${g.height})`);
  console.log(`Wrote ${garments.length} garments and ${outputs.size} files from ${PROTO}.`);
  if (low.length)
    console.log(`Below Decart's ${MIN_REFERENCE_PX} px for a reference image: ${low.join(', ')}`);
}
