// RULE: every page has its own 1200x630 share card made from its own real photo | PREVENTS: one generic card for every page, and og:image tags that point at files that do not exist.
//   node scripts/og.mjs   (after pull-sheet and photos)
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './pull-sheet-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = (k) => join(ROOT, 'src/assets/photos', `${k}.jpg`);
const OUT = join(ROOT, 'public/og');
mkdirSync(OUT, { recursive: true });
const data = (f) => JSON.parse(readFileSync(join(ROOT, 'src/data', f), 'utf8'));
const logo = await sharp(join(ROOT, 'public/img/logo-white.png')).resize(230).toBuffer();
const logoGold = await sharp(join(ROOT, 'public/img/logo-gold.png')).resize(200).toBuffer();
const shade = Buffer.from(`<svg width="1200" height="630"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#15120e" stop-opacity="0"/><stop offset="1" stop-color="#15120e" stop-opacity=".78"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`);

async function photoCard(name, key, position = 'attention') {
  await sharp(P(key)).resize(1200, 630, { fit: 'cover', position }).composite([{ input: shade }, { input: logo, left: 48, top: 630 - 48 - 124 }]).jpeg({ quality: 82, mozjpeg: true }).toFile(join(OUT, `${name}.jpg`));
}
async function productCard(name, key) {
  const img = await sharp(P(key)).resize(760, 560, { fit: 'inside' }).toBuffer();
  const m = await sharp(img).metadata();
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#f8f3ea' } })
    .composite([{ input: img, left: Math.round(1200 - 60 - m.width), top: Math.round((630 - m.height) / 2) }, { input: logoGold, left: 64, top: 630 - 64 - 108 }])
    .jpeg({ quality: 82, mozjpeg: true }).toFile(join(OUT, `${name}.jpg`));
}

const COVER = { 'romantic-proposal': 1, '80s-disco-party': 3, 'dreamy-bachelorette-party': 1, 'butterfly-birthday-party': 5 };
const events = data('events.json');
const photography = data('photography.json');
const { categories, items } = data('rentals.json');

await photoCard('home', 'site/gold-arch-eucalyptus-willow', 'centre');
await photoCard('events', 'events/romantic-proposal-1');
await productCard('photography', 'site/wwd-photography');
await photoCard('rentals', 'site/wwd-rentals');
await photoCard('contact', 'site/title-bar');
for (const [slug, key] of [['ottawa', 'site/title-bar'], ['montreal', 'events/butterfly-birthday-party-5'], ['toronto', 'events/80s-disco-party-3']]) await photoCard(`areas-${slug}`, key);
for (const e of events) await photoCard(`events-${e.slug}`, `events/${slugify(e.photos[(COVER[e.slug] ?? 1) - 1] ?? e.photos[0])}`);
for (const p of photography) await productCard(`photography-${p.slug}`, `photography/${slugify(p.photos[0])}`);
for (const c of categories) {
  const first = items.find((r) => r.category === c.name || r.alsoIn.includes(c.name));
  await productCard(`rentals-${c.slug}`, `rentals/${slugify(first.photos[0])}`);
}
let n = 0;
for (const r of items) { await productCard(`rental-${r.slug}`, `rentals/${slugify(r.photos[0])}`); n++; }
console.log(`og: ${5 + events.length + photography.length + categories.length + n} cards`);
