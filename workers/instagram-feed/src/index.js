/**
 * Starlit Instagram feed.
 *
 *   cron (every 6 h)  ->  Graph API /{IG_USER_ID}/media  ->  KV "feed" (latest 6 posts with a picture)
 *   GET /feed         ->  [{ url, img, caption }]  (img is /img/<id> on this Worker)
 *   GET /img/<id>     ->  the post's picture, fetched from Instagram's CDN and cached
 *   GET /status       ->  when the feed last updated and the last error (no secrets)
 *   GET /refresh?key= ->  update now (key = first 12 characters of IG_TOKEN's SHA-256, see docs/INSTAGRAM.md)
 *
 * Only photo and carousel posts are shown (no reels or videos). Posts without a picture are skipped. On any Meta error the last good feed keeps being served.
 */
const FIELDS = 'id,media_type,media_product_type,media_url,thumbnail_url,permalink,caption,timestamp';

async function update(env) {
  if (!env.IG_USER_ID) throw new Error('IG_USER_ID is not set');
  const res = await fetch(`${env.GRAPH}/${env.IG_USER_ID}/media?fields=${FIELDS}&limit=40&access_token=${encodeURIComponent(env.IG_TOKEN)}`);
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(`Meta ${res.status}: ${body.error?.message ?? 'no data'}`.slice(0, 300));
  const posts = (body.data || [])
    // Photos and carousels only: no reels or videos (Kal, Nov 23 2026).
    .filter((m) => (m.media_type === 'IMAGE' || m.media_type === 'CAROUSEL_ALBUM') && m.media_product_type !== 'REELS')
    .map((m) => ({ id: m.id, url: m.permalink, src: m.media_url, caption: (m.caption || '').replace(/\s+/g, ' ').slice(0, 140) }))
    .filter((p) => p.url && p.src)
    .slice(0, 6);
  if (!posts.length) throw new Error('Meta returned no posts with a picture');
  await env.FEED.put('feed', JSON.stringify({ at: new Date().toISOString(), posts }));
  await env.FEED.put('status', JSON.stringify({ ok: true, at: new Date().toISOString(), count: posts.length }));
  return posts.length;
}

async function safeUpdate(env) {
  try { return { ok: true, count: await update(env) }; }
  catch (err) {
    const prev = JSON.parse((await env.FEED.get('status')) || '{}');
    await env.FEED.put('status', JSON.stringify({ ...prev, ok: false, error: String(err.message || err), errorAt: new Date().toISOString() }));
    return { ok: false, error: String(err.message || err) };
  }
}

async function keyFor(env) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.IG_TOKEN || ''));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

export default {
  async scheduled(_event, env, ctx) { ctx.waitUntil(safeUpdate(env)); },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
    let ok = allowed.includes(origin);
    try { if (!ok && origin && new RegExp(env.PREVIEW_HOST_RE).test(new URL(origin).hostname)) ok = true; } catch {}
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : allowed[0], Vary: 'Origin' };
    const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } });

    if (url.pathname === '/feed') {
      const feed = JSON.parse((await env.FEED.get('feed')) || '{"posts":[]}');
      return json(feed.posts.map((p) => ({ url: p.url, img: `${url.origin}/img/${p.id}`, caption: p.caption })), 200, { 'Cache-Control': 'public, max-age=300' });
    }
    const m = url.pathname.match(/^\/img\/(\d+)$/);
    if (m) {
      const cache = caches.default;
      const hit = await cache.match(request);
      if (hit) return hit;
      const feed = JSON.parse((await env.FEED.get('feed')) || '{"posts":[]}');
      const p = feed.posts.find((x) => x.id === m[1]);
      if (!p) return new Response('not found', { status: 404 });
      const img = await fetch(p.src);
      if (!img.ok) return new Response('upstream', { status: 502 });
      const out = new Response(img.body, { headers: { 'Content-Type': img.headers.get('Content-Type') || 'image/jpeg', 'Cache-Control': 'public, max-age=21600', 'Access-Control-Allow-Origin': '*' } });
      ctx.waitUntil(cache.put(request, out.clone()));
      return out;
    }
    if (url.pathname === '/status') return json(JSON.parse((await env.FEED.get('status')) || '{"ok":false,"error":"never ran"}'));
    if (url.pathname === '/refresh') {
      if (url.searchParams.get('key') !== (await keyFor(env))) return json({ ok: false }, 403);
      return json(await safeUpdate(env));
    }
    return json({ ok: true, service: 'starlit-instagram' });
  },
};
