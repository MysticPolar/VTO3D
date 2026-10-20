/** The try-on catalog: generated garment data (catalog.json) joined with the model prompts */
import type { GarmentCategory, LiveGarment, Slot } from '../core/types.js';
import catalog from './catalog.json';
import { PROMPTS } from './prompts.js';

export const CATEGORIES: readonly GarmentCategory[] = catalog.categories;

export const GARMENTS: readonly LiveGarment[] = catalog.garments.map((g) => {
  const prompt = PROMPTS[g.id];
  if (!prompt) throw new Error(`No try-on prompt for ${g.id} (src/catalog/prompts.ts)`);
  return {
    id: g.id,
    name: g.name,
    slot: g.slot as Slot,
    image: g.image,
    thumb: g.thumb,
    prompt,
    lowRes: g.lowRes,
  };
});

export const garmentById = (id: string): LiveGarment | undefined =>
  GARMENTS.find((g) => g.id === id);

/** black-blazer: the garment 首页's first rail shows, with a clean 840 px photo */
export const DEFAULT_GARMENT = 'black-blazer';
