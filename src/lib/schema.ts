// RULE: JSON-LD is built only from facts shown on the page, site.ts and the sheet, serialized with JSON.stringify | PREVENTS: schema that claims what the page does not show (ratings, review counts, addresses, prices).
import { site } from '~/config/site';
import { locations, cityNode } from '~/config/locations';
import { events, eventUrl, photography, photographyUrl, categories, categoryUrl } from '~/lib/data';

export type Crumb = { name: string; path: string };
type Node = Record<string, unknown>;

interface Args {
  origin: string;
  path: string;
  title: string;
  description: string;
  image?: string;
  crumbs?: Crumb[];
  pageType?: 'WebPage' | 'ContactPage' | 'CollectionPage' | 'ItemPage' | 'AboutPage';
  /** Fragment of the node this page is about, e.g. '#product', '#service', '#faq'. */
  mainEntity?: string;
  /** Extra nodes from the page (Product, Service, ItemList); ids are made absolute here. */
  nodes?: (abs: (p: string) => string, ids: { biz: string; page: string }) => Node[];
}

export function graph({ origin, path, title, description, image, crumbs, pageType = 'WebPage', mainEntity, nodes }: Args): string {
  const abs = (p: string) => new URL(p, origin).href;
  const biz = abs('/#business');
  const siteId = abs('/#website');
  const pageUrl = abs(path);
  const pageId = `${pageUrl}#webpage`;

  const business: Node = {
    '@type': 'LocalBusiness',
    '@id': biz,
    name: site.name,
    alternateName: site.shortName,
    description: 'Elegant event planning, curated rentals, and timeless photography across Ottawa, Montreal, Toronto & beyond.',
    url: abs('/'),
    telephone: site.phoneE164,
    email: site.email,
    logo: { '@type': 'ImageObject', url: abs('/img/logo-gold.png'), width: 480, height: 258 },
    image: abs('/og/home.jpg'),
    slogan: site.heroTitle,
    address: { '@type': 'PostalAddress', addressLocality: site.base.locality, addressRegion: site.base.region, addressCountry: site.base.country },
    currenciesAccepted: site.currency,
    knowsAbout: ['Event planning', 'Event decor rentals', 'Event photography', 'Romantic proposals', 'Birthday parties', 'Bachelorette parties', 'Professional headshots', 'Product photography'],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Events, photography and rentals',
      itemListElement: [
        { '@type': 'OfferCatalog', name: 'Events', url: abs('/events/'), itemListElement: events.map((e) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: e.name, url: abs(eventUrl(e)), provider: { '@id': biz } } })) },
        { '@type': 'OfferCatalog', name: 'Photography', url: abs('/photography/'), itemListElement: photography.map((p) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: p.name, url: abs(photographyUrl(p)), provider: { '@id': biz } } })) },
        { '@type': 'OfferCatalog', name: 'Rentals', url: abs('/rentals/'), itemListElement: categories.map((c) => ({ '@type': 'OfferCatalog', name: c.name, url: abs(categoryUrl(c.name)) })) },
      ],
    },
    areaServed: locations.map(cityNode),
    openingHoursSpecification: site.hours.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
    sameAs: site.social.map((s) => s.href),
    contactPoint: { '@type': 'ContactPoint', telephone: site.phoneE164, email: site.email, contactType: 'customer service', areaServed: 'CA', availableLanguage: 'English' },
  };

  const out: Node[] = [
    business,
    { '@type': 'WebSite', '@id': siteId, url: abs('/'), name: site.name, publisher: { '@id': biz }, inLanguage: 'en-CA' },
    {
      '@type': pageType,
      '@id': pageId,
      url: pageUrl,
      name: title,
      description,
      isPartOf: { '@id': siteId },
      about: { '@id': biz },
      inLanguage: 'en-CA',
      ...(image ? { primaryImageOfPage: { '@type': 'ImageObject', url: abs(image) } } : {}),
      ...(crumbs?.length ? { breadcrumb: { '@id': `${pageUrl}#breadcrumb` } } : {}),
      ...(mainEntity ? { mainEntity: { '@id': `${pageUrl}${mainEntity}` } } : {}),
    },
  ];
  if (crumbs?.length) {
    out.push({
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: [{ name: 'Home', path: '/' }, ...crumbs].map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
    });
  }
  if (nodes) out.push(...nodes(abs, { biz, page: pageId }));
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': out }).replace(/</g, '\\u003c');
}
