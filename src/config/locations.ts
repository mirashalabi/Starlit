// RULE: a city page is composed from facts true of that city, never from the city name alone (seo-forge references/service-area-pages.md) | PREVENTS: doorway pages, the named Google spam policy for city pages that differ only by name.
//
// Facts used, each sourced:
//   - the city itself: the owner's service areas, "Ottawa • Montreal • Toronto" (original footer; Kal, Nov 23 2026)
//   - province: geography
//   - travel: "Travel within 50 km of Ottawa, Montreal, and Toronto is included" (owner FAQ via Kal)
//   - reviews: the original home page's testimonials, signed with each city
//
// Service-in-city pages (/service-areas/<city>/<service>/) are deliberately NOT generated: they need
// facts that differ per city AND per service (venues worked, events done there, local photos).
// Add them to `local` below when the owner supplies them; the page template can then grow per service.

export type Location = {
  slug: string;
  city: string;
  province: string;
  provinceCode: 'ON' | 'QC';
  /** Wikipedia and Wikidata, so search engines and AI tools know which city is meant. */
  wikipedia: string;
  wikidata: string;
  /** Hero photo key: a Starlit setup not tied to any one event, so no page implies an event happened in that city. */
  photo: string;
  photoAlt: string;
  /** Owner-supplied local facts (venues, events done here). Empty until the owner sends them. */
  local: string[];
};

export const locations: Location[] = [
  {
    slug: 'ottawa',
    city: 'Ottawa',
    province: 'Ontario',
    provinceCode: 'ON',
    wikipedia: 'https://en.wikipedia.org/wiki/Ottawa',
    wikidata: 'https://www.wikidata.org/wiki/Q1930',
    photo: 'site/title-bar',
    photoAlt: 'A gold arch with eucalyptus and white drapery under a pergola with hanging bulbs, styled by Starlit',
    local: [],
  },
  {
    slug: 'montreal',
    city: 'Montreal',
    province: 'Quebec',
    provinceCode: 'QC',
    wikipedia: 'https://en.wikipedia.org/wiki/Montreal',
    wikidata: 'https://www.wikidata.org/wiki/Q340',
    photo: 'rentals/gold-arch-frames-set',
    photoAlt: 'Three gold arch frames in different sizes from Starlit rentals',
    local: [],
  },
  {
    slug: 'toronto',
    city: 'Toronto',
    province: 'Ontario',
    provinceCode: 'ON',
    wikipedia: 'https://en.wikipedia.org/wiki/Toronto',
    wikidata: 'https://www.wikidata.org/wiki/Q172',
    photo: 'rentals/full-gold-set-with-eucalyptus-arrangement',
    photoAlt: 'A full gold display set with a eucalyptus arrangement from Starlit rentals',
    local: [],
  },
];

export const locationUrl = (l: Location) => `/service-areas/${l.slug}/`;
export const cityNode = (l: Location) => ({
  '@type': 'City',
  name: l.city,
  sameAs: [l.wikipedia, l.wikidata],
  containedInPlace: { '@type': 'AdministrativeArea', name: l.province, containedInPlace: { '@type': 'Country', name: 'Canada' } },
});
