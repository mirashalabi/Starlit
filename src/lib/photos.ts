// RULE: every photo is Starlit's own upload from the original site, shown at its own aspect ratio | PREVENTS: stand-in, stock or AI images and crops that cut people.
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*/*.jpg', { eager: true });
const byKey = new Map<string, ImageMetadata>();
for (const [p, m] of Object.entries(files)) {
  const k = p.replace('../assets/photos/', '').replace(/\.jpg$/, '');
  byKey.set(k, m.default);
}

/** The srcset widths Photo.astro uses; the layout's hero preload must use the same list. */
export const HERO_QUALITY = 46;
export function photoWidths(src: ImageMetadata, maxWidth = 2400): number[] {
  const cap = Math.min(src.width, maxWidth);
  const w = [320, 480, 640, 720, 840, 960, 1280, 1600, 2000, 2400].filter((x) => x <= cap);
  if (!w.includes(cap)) w.push(cap);
  return w;
}

export function photo(key: string): ImageMetadata {
  const m = byKey.get(key);
  if (!m) throw new Error(`photo ${key} missing from src/assets/photos (run npm run photos)`);
  return m;
}

/** Focal points for the frames that must crop (heroes, square cards), from looking at each photo. */
export const focus: Record<string, string> = {
  'site/title-bar': '30% 60%',
  'site/wwd-events': '50% 50%',
  'site/wwd-photography': '50% 30%',
  'site/wwd-rentals': '50% 55%',
  'events/romantic-proposal-1': '50% 50%',
  'events/romantic-proposal-2': '50% 55%',
  'events/80s-disco-party-3': '45% 50%',
  'events/80s-disco-party-5': '50% 55%',
  'events/dreamy-bachelorette-party-6': '45% 50%',
  'events/butterfly-birthday-party-5': '45% 50%',
  'events/dreamy-bachelorette-party-1': '50% 55%',
  'photography/event-photography': '50% 25%',
  'photography/professional-headshots': '50% 35%',
  'photography/milestone-photos': '50% 30%',
  'photography/casual-photoshoot': '65% 40%',
  'photography/product-photography': '50% 50%',
};
