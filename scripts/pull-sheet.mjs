// RULE: every rental, event and photography service comes from the owner's Google Sheet, word for word, and is written into the HTML at build time | PREVENTS: the original's problem, where everything loaded in the browser after the page and search engines saw empty pages.
//
//   node scripts/pull-sheet.mjs            fetch the live sheet, write src/data/*.json
//   node scripts/pull-sheet.mjs --offline  rebuild src/data from the cached .gviz files
//
// The sheet is the owner's CMS. Columns (as on the original site's main.js):
//   rentals:     SKU | Item Name | Category | Description | Inventory | Price | Photo Name | Extra Inquiries | Options
//   photography: Service | Description | Tagline | Session Duration (hr) | Variations | Price | Photo Name | Extra Inquiries
//   events:      Event Name | Description | Photo Name | Extra Inquiries
// A row with an empty name continues the item above it (more photos, more options, a second category).
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './pull-sheet-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = '1rcfJdQcWe4X3pP4EH4-0OaGooQiFTMBoyglDH2H9UGU';
const TABS = { rentals: 0, photography: 1097452701, events: 1019661179 };
const CACHE = join(ROOT, 'scripts/sheet-cache');
const OUT = join(ROOT, 'src/data');
const offline = process.argv.includes('--offline');

const clean = (v) => (v == null ? null : typeof v === 'string' ? v.replace(/\s+\n/g, '\n').trim() || null : v);


async function rows(tab) {
  const file = join(CACHE, `${tab}.gviz`);
  let text;
  if (!offline) {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json&gid=${TABS[tab]}`);
    if (!res.ok) throw new Error(`sheet ${tab}: HTTP ${res.status}`);
    text = await res.text();
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, text);
  } else {
    if (!existsSync(file)) throw new Error(`no cached ${file}; run without --offline`);
    text = readFileSync(file, 'utf8');
  }
  const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  return json.table.rows.map((r) => (r.c || []).map((c) => clean(c?.v)));
}

const isQuestion = (s) => typeof s === 'string' && /\?\s*$/.test(s);

// ---------- rentals ----------
const rentals = [];
{
  let cur = null;
  for (const c of await rows('rentals')) {
    const [sku, name, category, description, inventory, price, photo, extra, option] = c;
    if (name) {
      cur = {
        sku: sku != null ? String(Math.round(sku)) : null,
        name: String(name).trim(),
        category: category ? String(category).replace(/&/g, 'and').trim() : 'Other',
        alsoIn: [],
        description: description || '',
        price: typeof price === 'number' ? price : null,
        photos: [],
        optionGroup: null,
        options: [],
        questions: [],
      };
      rentals.push(cur);
    }
    if (!cur) continue;
    if (!name && category) {
      const cat = String(category).replace(/&/g, 'and').trim();
      if (cat !== cur.category && !cur.alsoIn.includes(cat)) cur.alsoIn.push(cat);
    }
    if (photo) cur.photos.push(String(photo).trim());
    if (extra) {
      if (isQuestion(extra)) { if (!cur.questions.includes(extra)) cur.questions.push(extra); }
      else if (!cur.optionGroup) cur.optionGroup = String(extra).trim();
    }
    if (option) cur.options.push({ label: String(option).trim(), price: !name && typeof price === 'number' ? price : null });
  }
}
// The original listed only items with a photo; keep that rule.
const listed = rentals.filter((r) => r.photos.length);
const seen = new Map();
for (const r of listed) {
  let s = slugify(r.name);
  if (seen.has(s)) s = `${s}-${r.sku}`;
  seen.set(s, true);
  r.slug = s;
}
const CATEGORY_ORDER = ['Backdrops and Stands', 'Decor and Display', 'Dining Accessories', 'Bridal and Party Wear', 'Setup and Tools', 'Board Games'];
const categories = CATEGORY_ORDER.filter((c) => listed.some((r) => r.category === c || r.alsoIn.includes(c)))
  .concat([...new Set(listed.map((r) => r.category))].filter((c) => !CATEGORY_ORDER.includes(c)))
  .map((name) => ({ name, slug: slugify(name), count: listed.filter((r) => r.category === name || r.alsoIn.includes(name)).length }));

// ---------- photography ----------
const photography = [];
{
  let cur = null;
  for (const c of await rows('photography')) {
    const [service, description, tagline, duration, variation, price, photo, extra] = c;
    if (service) {
      cur = { name: String(service).trim(), slug: slugify(service), description: description || '', tagline: tagline || '', hours: typeof duration === 'number' ? duration : null, price: typeof price === 'number' ? price : null, variations: [], photos: [], questions: [] };
      photography.push(cur);
    }
    if (!cur) continue;
    if (variation) cur.variations.push({ label: String(variation).trim(), price: typeof price === 'number' ? price : null });
    if (photo) cur.photos.push(String(photo).trim());
    if (extra && !cur.questions.includes(extra)) cur.questions.push(extra);
  }
  // "Starting at" is the lowest published price, as on the original card.
  for (const p of photography) {
    const all = [p.price, ...p.variations.map((v) => v.price)].filter((n) => typeof n === 'number');
    p.from = all.length ? Math.min(...all) : null;
  }
}

// ---------- events ----------
const events = [];
{
  let cur = null;
  const all = await rows('events');
  for (const c of all) {
    const [name, description, photo, extra] = c;
    if (name === 'Event Name') continue; // header row typed into the sheet
    if (name) {
      cur = { name: String(name).trim(), slug: slugify(name), description: description || '', photos: [], questions: [] };
      events.push(cur);
    }
    if (!cur) continue;
    if (photo) cur.photos.push(String(photo).trim());
    if (extra && !cur.questions.includes(extra)) cur.questions.push(extra);
  }
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'rentals.json'), JSON.stringify({ categories, items: listed }, null, 2) + '\n');
writeFileSync(join(OUT, 'photography.json'), JSON.stringify(photography, null, 2) + '\n');
writeFileSync(join(OUT, 'events.json'), JSON.stringify(events, null, 2) + '\n');
console.log(`rentals ${listed.length} (of ${rentals.length} named; ${rentals.length - listed.length} have no photo and are not listed, as on the original)`);
console.log(`categories ${categories.map((c) => `${c.name} ${c.count}`).join(', ')}`);
console.log(`photography ${photography.map((p) => p.name).join(', ')}`);
console.log(`events ${events.map((e) => `${e.name} (${e.photos.length})`).join(', ')}`);
