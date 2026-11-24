// RULE: one source for every site icon: the Starlit sparkle, gold on ink | PREVENTS: the full script logo squeezed into 16px, which reads as a smudge.
//   node scripts/favicon.mjs
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const GOLD = '#e6c068', INK = '#15120e';
const star = (cx, cy, r) => `M${cx} ${cy - r} C${cx + r * .1} ${cy - r * .3} ${cx + r * .3} ${cy - r * .1} ${cx + r} ${cy} C${cx + r * .3} ${cy + r * .1} ${cx + r * .1} ${cy + r * .3} ${cx} ${cy + r} C${cx - r * .1} ${cy + r * .3} ${cx - r * .3} ${cy + r * .1} ${cx - r} ${cy} C${cx - r * .3} ${cy - r * .1} ${cx - r * .1} ${cy - r * .3} ${cx} ${cy - r}Z`;
const svg = (rounded) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${rounded ? `<rect width="512" height="512" rx="112" fill="${INK}"/>` : `<rect width="512" height="512" fill="${INK}"/>`}<path d="${star(236, 276, 176)}" fill="${GOLD}"/><path d="${star(392, 128, 62)}" fill="${GOLD}"/></svg>`;

writeFileSync('public/favicon.svg', svg(true));
const png = (size, rounded = true) => sharp(Buffer.from(svg(rounded))).resize(size, size).png().toBuffer();
await sharp(await png(32)).toFile('public/img/icon-32.png');
await sharp(await png(192)).toFile('public/img/icon-192.png');
await sharp(await png(512)).toFile('public/img/icon-512.png');
await sharp(await png(180, false)).toFile('public/apple-touch-icon.png'); // iOS rounds the corners itself

// favicon.ico with 16, 32 and 48 px PNG images inside.
const sizes = [16, 32, 48];
const imgs = await Promise.all(sizes.map((s) => png(s)));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(imgs[i].length, e + 8); head.writeUInt32LE(offset, e + 12);
  offset += imgs[i].length;
});
writeFileSync('public/favicon.ico', Buffer.concat([head, ...imgs]));
console.log('favicon: svg, ico (16/32/48), 32, 180, 192, 512');
