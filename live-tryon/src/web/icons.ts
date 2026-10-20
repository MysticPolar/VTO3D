/**
 * The icons the camera layer and the rail use, copied from reference/prototype/js/icons.js
 * (same paths, same renderer). `s` = stroke paths, `f` = filled paths.
 */
const P: Record<string, { s?: string; f?: string }> = {
  close: { s: '<path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8"/>' },
  check: { s: '<path d="m5 12.6 4.5 4.4L19 7.4"/>' },
  'video-filled': {
    f: '<path d="M2.6 8.2a2.2 2.2 0 0 1 2.2-2.2h9.4a2.2 2.2 0 0 1 2.2 2.2v7.6a2.2 2.2 0 0 1-2.2 2.2H4.8a2.2 2.2 0 0 1-2.2-2.2z"/><path d="m17.4 10.4 3.4-2.3c.5-.3 1 0 1 .6v6.6c0 .6-.5.9-1 .6l-3.4-2.3z"/>',
  },
  'switch-camera': {
    s: '<path d="M4 8.6A1.6 1.6 0 0 1 5.6 7h2.2l1.5-2.1h5.4L16.2 7h2.2A1.6 1.6 0 0 1 20 8.6v9a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.6z"/><path d="M15 12a3 3 0 0 0-5.2-2M9 13.6a3 3 0 0 0 5.2 2M9.6 8.6v1.6h1.6M14.4 17v-1.6h-1.6"/>',
  },
  info: {
    s: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4"/>',
    f: '<circle cx="12" cy="7.9" r="1.05"/>',
  },
};

/** icon('close', { size: 22, stroke: 2 }) → SVG markup, as VT.icon renders it */
export function icon(
  name: keyof typeof P & string,
  opts: { size?: number; stroke?: number } = {},
): string {
  const def = P[name];
  if (!def) return '';
  const size = opts.size ?? 24;
  const sw = opts.stroke ?? 1.7;
  const stroke = def.s
    ? `<g fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${def.s}</g>`
    : '';
  const fill = def.f ? `<g fill="currentColor" stroke="none">${def.f}</g>` : '';
  return `<svg class="i i-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${fill}${stroke}</svg>`;
}
