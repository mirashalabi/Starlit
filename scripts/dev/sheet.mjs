import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs'; import { join, basename } from 'node:path';
const [,, out, cols='6', ...files] = process.argv; const C=+cols, W=300, Hh=240, L=22;
const tiles=[]; for (const [i,f] of files.entries()) {
  const m = await sharp(f).rotate().metadata();
  const img = await sharp(f).rotate().resize(W, Hh-L, {fit:'contain', background:'#222'}).toBuffer();
  const label = Buffer.from(`<svg width="${W}" height="${L}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="15" font-size="12" fill="#fff" font-family="Arial">${i}: ${basename(f).slice(0,30).replace(/&/g,'&amp;')} ${m.autoOrient?.width??m.width}x${m.autoOrient?.height??m.height}</text></svg>`);
  tiles.push({input:img,left:(i%C)*W,top:Math.floor(i/C)*Hh+L},{input:label,left:(i%C)*W,top:Math.floor(i/C)*Hh});
}
await sharp({create:{width:C*W,height:Math.ceil(files.length/C)*Hh,channels:3,background:'#111'}}).composite(tiles).jpeg({quality:80}).toFile(out); console.log(out);
