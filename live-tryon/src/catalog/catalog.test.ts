import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import catalog from './catalog.json';
import { CATEGORIES, DEFAULT_GARMENT, GARMENTS, garmentById } from './index.js';
import { PROMPTS } from './prompts.js';

const ROOT = join(import.meta.dirname, '..', '..');

/** The region each slot's prompt has to name first (Decart's VTON prompting guide) */
const OPENING: Record<string, RegExp> = {
  top: /^Substitute the upper body garment with /,
  outer: /^Substitute the upper body garment with /,
  bottom: /^Substitute the lower body garment with /,
  dress: /^Substitute the outfit with /,
  shoes: /^Substitute the footwear with /,
  bag: /^Add .+ to the outfit\.$/,
  acc: /^Add .+ to the outfit\.$/,
};

describe('catalog', () => {
  it('matches the prototype it was copied from', () => {
    const out = execFileSync(
      process.execPath,
      [join(ROOT, 'scripts', 'sync-catalog.ts'), '--check'],
      {
        encoding: 'utf8',
      },
    );
    expect(out).toContain('Catalog matches the prototype');
  });

  it('has every try-on garment of 首页, in the prototype’s categories', () => {
    expect(CATEGORIES.map((c) => c.label)).toEqual([
      '上装',
      '下装',
      '连衣裙',
      '外套',
      '鞋履',
      '包包',
      '配饰',
    ]);
    expect(GARMENTS).toHaveLength(28);
    for (const category of CATEGORIES) {
      for (const id of category.items) expect(garmentById(id), id).toBeDefined();
    }
    expect(garmentById(DEFAULT_GARMENT)?.lowRes).toBe(false);
  });

  it('flags the reference photos under Decart’s 512 px', () => {
    expect(GARMENTS.filter((g) => g.lowRes).map((g) => g.id)).toEqual([
      'satin-slip-dress',
      'black-pumps',
      'strappy-heels',
      'black-handbag',
      'gold-hoops',
    ]);
  });
});

describe('try-on prompts', () => {
  it('covers exactly the catalog', () => {
    expect(Object.keys(PROMPTS).sort()).toEqual(catalog.garments.map((g) => g.id).sort());
  });

  it.each(GARMENTS.map((g) => [g.id, g] as const))(
    '%s follows the prompting guide',
    (_id, garment) => {
      const { prompt, slot } = garment;
      expect(prompt).toMatch(OPENING[slot] ?? /^$/);
      // one action per prompt
      expect(prompt.match(/\b(Substitute|Add)\b/g)).toHaveLength(1);
      // Decart: "about 750 characters of English fit"
      expect(prompt.length).toBeLessThan(400);
      expect(prompt).toMatch(/\.$/);
      // only what the photo shows: no brand names from the catalog
      expect(prompt).not.toMatch(/ZARA|Reformation|Soft Archive|Linea|Mono Atelier|Forma/i);
    },
  );
});
