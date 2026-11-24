// The whole catalogue in plain text for AI agents: every event, session and rental with its price and URL,
// from the same sheet data the pages use. (Google ignores llms files; this is for other AI tools.)
import type { APIRoute } from 'astro';
import { siteUrl, isStaging } from '~/config/staging';
import { site } from '~/config/site';
import { faqGroups } from '~/config/faq';
import { locations, locationUrl } from '~/config/locations';
import { events, eventUrl, photography, photographyUrl, categories, categoryUrl, inCategory, rentalUrl, dayPrice, money } from '~/lib/data';

export const GET: APIRoute = ({ url }) => {
  const o = isStaging ? url.origin : siteUrl;
  const out: string[] = [
    `# ${site.name}: full catalogue`,
    '',
    `> ${site.heroLead} Phone ${site.phone}, email ${site.email}. Hours: ${site.hours.map((h) => `${h.label} ${h.text}`).join('; ')}. Prices in CAD. Based in ${site.base.locality}, ${site.base.regionName}.`,
    '',
    '## Service areas',
    ...locations.map((l) => `- [${l.city}, ${l.province}](${o}${locationUrl(l)}): travel within 50 km included${(() => { const cp = photography.flatMap((p) => p.variations.filter((v) => v.label === l.city && v.price != null).map((v) => `${p.name} ${money(v.price as number)}`)); return cp.length ? `; ${cp.join(', ')}` : ''; })()}`),
    `- [About Starlit](${o}/about/) · [FAQ](${o}/faq/) · [Contact](${o}/contact/)`,
    '',
    '## Events',
    ...events.map((e) => `- [${e.name}](${o}${eventUrl(e)}): ${e.description}`),
    '',
    '## Photography',
    ...photography.map((p) => `- [${p.name}](${o}${photographyUrl(p)}): ${p.tagline}. ${p.description}${p.from != null ? ` Starting at ${money(p.from)}${p.hours ? ` / ${p.hours} hr` : ''}.` : ''}${p.variations.length ? ` Options: ${p.variations.map((v) => `${v.label}${v.price != null ? ` ${money(v.price)}` : ''}`).join('; ')}.` : ''}`),
    '',
    '## Rentals (price per day)',
  ];
  for (const c of categories) {
    out.push('', `### [${c.name}](${o}${categoryUrl(c.name)})`);
    for (const r of inCategory(c.name)) out.push(`- [${r.name}](${o}${rentalUrl(r)})${r.price != null ? `, ${dayPrice(r.price)}` : ''}: ${r.description.replace(/\s+/g, ' ').trim()}`);
  }
  out.push('', '## FAQ');
  for (const g of faqGroups) for (const f of g.items) out.push(`- ${f.q} ${f.a}`);
  return new Response(out.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
