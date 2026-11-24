// RULE: only Starlit's own photos, each the original upload, EXIF-rotated, never upscaled, capped at 2400px on the long side | PREVENTS: stand-in or stock images, sideways phone photos, and 5000px originals shipped to phones.
//
//   node scripts/photos.mjs   (after scripts/pull-sheet.mjs)
//
// Source: .forge/harvest/files/assets/images (harvested from starlit-events.com, Nov 23 2026).
// A photo named in the sheet but missing from the harvest is downloaded from the live site.
import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './pull-sheet-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '.forge/harvest/files/assets/images');
const OUT = join(ROOT, 'src/assets/photos');
const MAX = 2400;
const ORIGIN = 'https://starlit-events.com/assets/images';

const data = (f) => JSON.parse(readFileSync(join(ROOT, 'src/data', f), 'utf8'));
const jobs = [];
for (const r of data('rentals.json').items) for (const p of r.photos) jobs.push(['rentals', p]);
for (const e of data('events.json')) for (const p of e.photos) jobs.push(['events', p]);
for (const s of data('photography.json')) for (const p of s.photos) jobs.push(['photography', p]);
// Page photos the original used (home cards, page title bars, contact).
for (const p of ['Title_Bar', 'Contact_Us_Operating_Hours', 'Events_Title_Bar', 'Photography_Title_Bar', 'Rentals_Title_Bar', 'WWD_Events', 'WWD_Photography', 'WWD_Rentals']) jobs.push(['site', p]);

let made = 0, kept = 0, fetched = 0;
for (const [dir, name] of jobs) {
  // Descriptive names for page photos whose original file name says nothing about the image.
  const RENAME = { Contact_Us_Operating_Hours: 'gold-arch-eucalyptus-willow' };
  const out = join(OUT, dir, `${RENAME[name] ?? slugify(name)}.jpg`);
  if (existsSync(out)) { kept++; continue; }
  const rel = dir === 'site' ? `${name}.JPG` : `${dir}/${name}.JPG`;
  let src = join(SRC, rel);
  if (!existsSync(src)) {
    const res = await fetch(`${ORIGIN}/${rel.split('/').map(encodeURIComponent).join('/')}`);
    if (!res.ok) throw new Error(`photo ${rel} not in harvest and HTTP ${res.status} live`);
    mkdirSync(dirname(src), { recursive: true });
    writeFileSync(src, Buffer.from(await res.arrayBuffer()));
    fetched++;
  }
  mkdirSync(dirname(out), { recursive: true });
  await sharp(src).rotate().resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toFile(out);
  made++;
}
console.log(`photos: ${made} written, ${kept} already there, ${fetched} fetched from the live site`);
