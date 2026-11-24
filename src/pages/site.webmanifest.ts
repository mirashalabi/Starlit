import type { APIRoute } from 'astro';
import { site } from '~/config/site';
export const GET: APIRoute = () => new Response(JSON.stringify({
  name: site.name, short_name: site.shortName, start_url: '/', display: 'standalone', background_color: '#15120e', theme_color: '#15120e',
  icons: [{ src: '/img/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/img/icon-512.png', sizes: '512x512', type: 'image/png' }],
}), { headers: { 'Content-Type': 'application/manifest+json' } });
