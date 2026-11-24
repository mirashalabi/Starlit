import type { APIRoute } from 'astro';
import { siteUrl, isStaging } from '~/config/staging';
import { pages } from '~/lib/urls';

// Styled for people with plain CSS (/sitemap.css): an XSLT stylesheet now draws a removal warning in Chrome.
export const GET: APIRoute = ({ url }) => {
  const origin = isStaging ? url.origin : siteUrl;
  const rows = pages.map((u) => `  <url><loc>${new URL(u.path, origin).href}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/css" href="/sitemap.css"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
