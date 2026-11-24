// RULE: a build is staging (noindex, nofollow, Disallow: /) until PUBLIC_SITE_URL names a real domain | PREVENTS: an indexable preview copy (*.pages.dev, *.web.app) competing with the production domain as a near-perfect duplicate.
/**
 * Staging guard. Put this in src/config/staging.ts (or merge into site.ts) and
 * import it from the Base layout head, robots.txt.ts and the sitemap filter.
 *
 * - PUBLIC_SITE_URL unset             -> staging (falls back to the preview host)
 * - host is a preview host            -> staging (.pages.dev, .web.app, .firebaseapp.com, .workers.dev;
 *                                        the same list as seo_lib.PREVIEW_SUFFIXES)
 * - PUBLIC_SITE_URL=https://<domain>  -> production
 *
 * Set PUBLIC_SITE_URL in the Cloudflare Pages PRODUCTION environment only, at
 * launch. Preview builds never get it, so previews stay noindex forever.
 *
 * Audits must run on a production-mode build:
 *   PUBLIC_SITE_URL=https://<domain> npm run build
 * then rebuild without it and confirm robots.txt disallows everything.
 */

/** Fallback origin while no production domain is set. Replace per project. */
const FALLBACK = 'https://starlit-events.pages.dev';

const envUrl = (import.meta.env.PUBLIC_SITE_URL as string | undefined)?.trim();

/** Canonical origin, no trailing slash. */
export const siteUrl = (envUrl || FALLBACK).replace(/\/$/, '');

/**
 * The production pages.dev host may be indexed while starlit-events.com still runs the old site (Kal, Nov 23 2026).
 * Only this exact host, and only when a build names it in PUBLIC_SITE_URL (npm run deploy:production).
 * Branch and hash previews (<x>.starlit-events.pages.dev) are built without it and stay noindex.
 */
const INDEXABLE_PREVIEW_HOSTS = ['starlit-events.pages.dev'];

/** True while the site must not be indexed. */
export const isStaging = !envUrl || (/\.(pages\.dev|web\.app|firebaseapp\.com|workers\.dev)$/i.test(new URL(siteUrl).hostname) && !INDEXABLE_PREVIEW_HOSTS.includes(new URL(siteUrl).hostname));

/**
 * Paths that are noindex on every build, staging or not, and never in the
 * sitemap: paid landing pages, thank-you pages, the lead inbox, utility pages.
 * Keep this list and sitemap-filter.mjs in agreement.
 */
export const ALWAYS_NOINDEX: RegExp[] = [
  /^\/lp(\/|$)/,
  /^\/thank-you(\/|$)/,
  /^\/lp\/thank-you(\/|$)/,
  /^\/leads?(\/|$)/,
  /^\/api(\/|$)/,
  /\/page\/\d+\/?$/, // paginated archives: crawlable through links, not listed
];

export const isAlwaysNoindex = (pathname: string): boolean => ALWAYS_NOINDEX.some((re) => re.test(pathname));

/** One call for the head: should this page carry noindex, nofollow? */
export const blockIndex = (pathname: string, pageNoindex = false): boolean =>
  isStaging || pageNoindex || isAlwaysNoindex(pathname);
