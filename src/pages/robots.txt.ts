// RULE: robots.txt follows the staging guard: Disallow all on previews, the real sitemap on production | PREVENTS: previews being crawled.
import type { APIRoute } from 'astro';
import { siteUrl, isStaging } from '~/config/staging';

const text = (body: string) => new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

// AI search crawlers are allowed so assistants can cite and recommend Starlit.
export const GET: APIRoute = () => {
  if (isStaging) return text('# Staging preview, not for indexing.\nUser-agent: *\nDisallow: /\n');
  return text(`# Starlit Events & Photography
User-agent: *
Allow: /
Disallow: /thank-you/

User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: GPTBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: DuckAssistBot
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`);
};
