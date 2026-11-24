// RULE: every lead says where the visitor came from on their FIRST page, not just the page before the form | PREVENTS: an email that only shows "/contact/" with the referrer "/events/", so nobody knows if a lead came from Google, Instagram or an ad.
//
// Stored in localStorage (first touch, kept 90 days) and sessionStorage (this visit). No cookies, no personal data:
// only the landing page, the outside site that sent them, UTM tags and ad click ids. Sent with the form as hidden fields.

const KEY = 'st_attr';
const TTL = 90 * 24 * 3600 * 1000;
const CLICK_IDS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid'];
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

type Touch = Record<string, string>;

const safe = <T>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };

function currentTouch(): Touch | null {
  const q = new URLSearchParams(location.search);
  const t: Touch = {};
  [...UTM, ...CLICK_IDS].forEach((k) => { const v = q.get(k); if (v) t[k] = v.slice(0, 200); });
  const ref = document.referrer;
  const external = ref && !ref.startsWith(location.origin) ? ref.slice(0, 300) : '';
  if (external) t.first_referrer = external;
  if (!Object.keys(t).length) return null;
  t.landing_page = location.href.split('#')[0].slice(0, 300);
  t.first_seen = new Date().toISOString();
  return t;
}

function read(store: Storage): Touch | null {
  const raw = safe(() => store.getItem(KEY), null);
  if (!raw) return null;
  const t = safe(() => JSON.parse(raw) as Touch, null);
  if (!t || (t.first_seen && Date.now() - Date.parse(t.first_seen) > TTL)) return null;
  return t;
}

// This visit: the first page of the session, tagged or not. First touch: the first tagged or referred visit (90 days).
const now = currentTouch();
let visit = read(sessionStorage);
if (!visit) {
  visit = now || { landing_page: location.href.split('#')[0].slice(0, 300), first_seen: new Date().toISOString() };
  safe(() => sessionStorage.setItem(KEY, JSON.stringify(visit)), undefined);
}
if (now && !read(localStorage)) safe(() => localStorage.setItem(KEY, JSON.stringify(now)), undefined);
const views = Number(safe(() => sessionStorage.getItem('st_views'), '0') || '0') + 1;
safe(() => sessionStorage.setItem('st_views', String(views)), undefined);

function device(): string {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'Tablet';
  if (/Mobi|iPhone|Android/i.test(ua)) return 'Phone';
  return 'Computer';
}

/** Fields added to every lead. A tagged visit this session wins; otherwise the 90-day first touch fills the gaps. */
export function attribution(): Record<string, string> {
  const first = read(localStorage) || {};
  const v = read(sessionStorage) || {};
  const out: Record<string, string> = {};
  [...UTM, ...CLICK_IDS, 'first_referrer'].forEach((k) => { const val = v[k] || first[k]; if (val) out[k] = val; });
  out.landing_page = v.landing_page || first.landing_page || '';
  if (first.landing_page && first.first_seen && first.first_seen !== v.first_seen) {
    out.first_visit = `${first.first_seen.slice(0, 10)} on ${first.landing_page}`;
  }
  out.device = device();
  out.pages_viewed = String(views);
  return out;
}
