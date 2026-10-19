/** Demo builds show the demo-only UI and tools; production builds will turn this off (HANDOFF §14). */
export function isDemo(): boolean {
  return import.meta.env.VITE_DEMO === 'true';
}
