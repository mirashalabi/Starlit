// RULE: every page carries a hash of the header config, so a header-only deploy changes the HTML | PREVENTS: a CSP fix that returning visitors never receive (the host answers 304 with no CSP and the browser keeps the old policy stored with its cached page)
/**
 * Version stamp for the HTTP header config. Put it in every page's <head>:
 *   <meta name="headers-version" content={headersVersion()} />
 * (head-snippet.astro already does.)
 *
 * WHY: HTML is served max-age=0, must-revalidate, so a returning browser sends
 * If-None-Match. When the page bytes are unchanged the host answers 304. On
 * Firebase Hosting that 304 carries no Content-Security-Policy, so the browser keeps
 * the policy stored with its cached copy, the OLD one. A deploy that changes only
 * public/_headers (or firebase.json) therefore never reaches anyone who has
 * visited. Stamping a hash of the header config into the page makes the HTML change
 * whenever the headers do, which changes the ETag, which forces a full 200.
 * Booths & Such changed its CSP seven times in a month (2026-10-19 to 2026-11-16); the five that changed no HTML never reached
 * a returning visitor.
 *
 * The definition must equal scripts/headers_lint.py headers_version(), which fails
 * the build when the stamp is missing or stale:
 *   _headers      sha256 of the file, CRLF -> LF, trimmed, trailing spaces removed per line
 *   firebase.json sha256 of the compact JSON of hosting.headers
 * First 12 hex characters.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function headersVersion(root = process.cwd()) {
  const headersFile = resolve(root, 'public/_headers');
  const firebaseFile = resolve(root, 'firebase.json');
  let blob;
  if (existsSync(firebaseFile)) {
    let h = JSON.parse(readFileSync(firebaseFile, 'utf8')).hosting || {};
    if (Array.isArray(h)) h = h[0] || {};
    blob = JSON.stringify(h.headers || []);
  } else if (existsSync(headersFile)) {
    blob = readFileSync(headersFile, 'utf8').replace(/\r\n/g, '\n').trim().split('\n').map((l) => l.trimEnd()).join('\n');
  } else {
    throw new Error('headersVersion: no firebase.json or public/_headers found under ' + root);
  }
  return createHash('sha256').update(blob, 'utf8').digest('hex').slice(0, 12);
}

export const HEADERS_VERSION = headersVersion();
