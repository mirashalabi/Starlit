// Byte-range responses for /video/*. Cloudflare Pages answers a Range request with the whole file (200),
// and iPhone Safari will not play a <video> without 206 partial responses. This reads the static file
// from the project's own assets and returns the requested slice. Files here are a few MB, so slicing
// in memory is fine.
export async function onRequest({ request, env }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: 'GET' }));
  const range = request.headers.get('Range');
  const headers = new Headers(asset.headers);
  headers.set('Accept-Ranges', 'bytes');
  if (!asset.ok || !range) {
    return new Response(request.method === 'HEAD' ? null : asset.body, { status: asset.status, headers });
  }
  const buf = await asset.arrayBuffer();
  const size = buf.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start, end;
  if (m && m[1] !== '') { start = Number(m[1]); end = m[2] !== '' ? Math.min(Number(m[2]), size - 1) : size - 1; }
  else if (m && m[2] !== '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  if (start === undefined || start > end || start >= size) {
    headers.set('Content-Range', `bytes */${size}`);
    headers.delete('Content-Length');
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(request.method === 'HEAD' ? null : buf.slice(start, end + 1), { status: 206, headers });
}
