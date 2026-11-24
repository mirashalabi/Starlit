import type { APIRoute } from 'astro';
import { siteUrl, isStaging } from '~/config/staging';
import { site } from '~/config/site';
import { faqGroups } from '~/config/faq';
import { locations, locationUrl } from '~/config/locations';
import { events, eventUrl, photography, photographyUrl, categories, categoryUrl, money } from '~/lib/data';

export const GET: APIRoute = ({ url }) => {
  const o = isStaging ? url.origin : siteUrl;
  const body = `# ${site.name}

> ${site.heroLead} Call ${site.phone} or email ${site.email}.

Starlit brings unforgettable events to life through thoughtful planning, curated décor, and storytelling photography. From intimate celebrations to full-scale events, Starlit handles the details so you can be fully present. Based in ${site.base.locality}, ${site.base.regionName}. Service areas: ${site.cities.join(', ')}.

## Service areas
${locations.map((l) => `- [${l.city}, ${l.province}](${o}${locationUrl(l)}): travel within 50 km included`).join('\n')}
- [About Starlit](${o}/about/)

## Events
${events.map((e) => `- [${e.name}](${o}${eventUrl(e)}): ${e.description}`).join('\n')}

## Photography
${photography.map((p) => `- [${p.name}](${o}${photographyUrl(p)}): ${p.tagline}${p.from != null ? `, starting at ${money(p.from)} CAD${p.hours ? ` for ${p.hours} hr` : ''}` : ''}`).join('\n')}

## Rentals (priced per day, CAD)
- [All rentals](${o}/rentals/)
${categories.map((c) => `- [${c.name}](${o}${categoryUrl(c.name)}): ${c.count} items`).join('\n')}

## Frequently asked questions ([all](${o}/faq/))
${faqGroups.map((g) => g.items.map((f) => `- ${f.q} ${f.a}`).join('\n')).join('\n')}

## Contact
- [Contact and free consultation](${o}/contact/): ${site.phone}, ${site.email}
- Hours: ${site.hours.map((h) => `${h.label} ${h.text}`).join('; ')}
- ${site.social.map((s) => `${s.label} ${s.handle}`).join(', ')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
