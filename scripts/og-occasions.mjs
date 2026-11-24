// RULE: every occasion page has its own share card from its own photo | PREVENTS: Base.astro failing the build on a missing og:image.
//   node scripts/og-occasions.mjs   (after editing src/config/occasions.ts; Node 23+ loads the .ts directly)
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// occasions.ts imports './site' without an extension, which plain Node cannot resolve, so read slug and photo from the text.
const src = readFileSync(join(ROOT, 'src/config/occasions.ts'), 'utf8');
const occasions = [...src.matchAll(/slug:\s*'([^']+)'[\s\S]*?photo:\s*'([^']+)'/g)].map(([, slug, photo]) => ({ slug, photo }));
const logo = await sharp(join(ROOT, 'public/img/logo-white.png')).resize(230).toBuffer();
const shade = Buffer.from(`<svg width="1200" height="630"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#15120e" stop-opacity="0"/><stop offset="1" stop-color="#15120e" stop-opacity=".78"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`);
for (const o of occasions) {
  await sharp(join(ROOT, 'src/assets/photos', `${o.photo}.jpg`)).resize(1200, 630, { fit: 'cover', position: 'attention' })
    .composite([{ input: shade }, { input: logo, left: 48, top: 630 - 48 - 124 }]).jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(ROOT, 'public/og', `occasion-${o.slug}.jpg`));
}
console.log(`og-occasions: ${occasions.length} cards`);
