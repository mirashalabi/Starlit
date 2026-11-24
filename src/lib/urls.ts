// RULE: the sitemap lists every indexable page once, from the same data the pages are built from | PREVENTS: sitemap URLs that 404 or miss pages.
import { locations, locationUrl } from '~/config/locations';
import { occasions } from '~/config/occasions';
import { events, eventUrl, photography, photographyUrl, categories, categoryUrl, rentals, rentalUrl } from '~/lib/data';

const BUILT = new Date().toISOString().slice(0, 10);
export const pages: { path: string; lastmod?: string }[] = [
  { path: '/' },
  { path: '/events/' },
  ...events.map((e) => ({ path: eventUrl(e) })),
  { path: '/occasions/' },
  ...occasions.map((o) => ({ path: `/occasions/${o.slug}/` })),
  { path: '/photography/' },
  ...photography.map((p) => ({ path: photographyUrl(p) })),
  { path: '/rentals/' },
  ...categories.map((c) => ({ path: categoryUrl(c.name) })),
  ...rentals.map((r) => ({ path: rentalUrl(r) })),
  { path: '/about/' },
  { path: '/service-areas/' },
  ...locations.map((l) => ({ path: locationUrl(l) })),
  { path: '/faq/' },
  { path: '/contact/' },
  { path: '/privacy/' },
  { path: '/sitemap/' },
];
void BUILT;
