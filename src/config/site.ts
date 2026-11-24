// RULE: every business fact lives here, quoted from starlit-events.com (Nov 23 2026; see .forge/claims.json) | PREVENTS: a phone, city or claim drifting between pages.

export const site = {
  name: 'Starlit Events & Photography',
  shortName: 'Starlit',
  /** Hero, verbatim from the original home page. */
  heroEyebrow: 'Starlit Events & Photography',
  heroTitle: 'Creating Moments That Sparkle',
  heroLead: 'Elegant event planning, curated rentals, and timeless photography across Ottawa, Montreal, Toronto & beyond.',
  phone: '(613) 983-7827',
  phoneHref: 'tel:+16139837827',
  phoneE164: '+1-613-983-7827',
  email: 'info@starlit-events.com',
  /** Home base (Kal, Nov 23 2026). City level only: no street address is published. */
  base: { locality: 'Ottawa', region: 'ON', regionName: 'Ontario', country: 'CA' },
  /** Footer of the original: "Ottawa • Montreal • Toronto". Service areas, not offices: one phone line. */
  cities: ['Ottawa', 'Montreal', 'Toronto'],
  hours: [
    { label: 'Monday to Friday', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '20:00', text: '8am to 8pm' },
    { label: 'Saturday & Sunday', days: ['Saturday', 'Sunday'], opens: '08:00', closes: '16:00', text: '8am to 4pm' },
  ],
  social: [
    { label: 'Instagram', handle: '@starlit.event', href: 'https://www.instagram.com/starlit.event/' },
    { label: 'TikTok', handle: '@starlit.ep', href: 'https://www.tiktok.com/@starlit.ep' },
  ],
  /** Google Business Profile "Starlit | Events and Photography" (Maps CID, kgmid /g/11wr3jvk92). Kal, Nov 23 2026. */
  google: {
    reviews: 'https://maps.google.com/?cid=17467627425546643944',
    writeReview: 'https://www.google.com/search?kgmid=/g/11wr3jvk92#lrd=0x56f98068f55fa1:0xf2697a98989429e8,3',
  },
  /** Instagram posts for the Follow Starlit strip (workers/instagram-feed). */
  instagramFeed: 'https://starlit-instagram.renderanalytics.workers.dev',
  currency: 'CAD',
  /** Footer credit (Kal, Nov 23 2026). */
  credit: { label: 'Render Analytics', href: 'https://renderanalytics.net/' },
} as const;

export type NavItem = { label: string; href: string };

/** Header navigation, labels as on the original. */
export const nav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Events', href: '/events/' },
  { label: 'Photography', href: '/photography/' },
  { label: 'Rentals', href: '/rentals/' },
  { label: 'FAQ', href: '/faq/' },
  { label: 'Contact Us', href: '/contact/' },
];

/** Home "Grow Your Vision" cards, verbatim. */
export const pillars = [
  { title: 'Events', text: 'Creating unforgettable, personalised event experiences.', href: '/events/', photo: 'site/wwd-events' },
  { title: 'Photography', text: 'Warm, candid imagery that captures your story beautifully.', href: '/photography/', photo: 'site/wwd-photography' },
  { title: 'Rentals', text: 'Backdrops, décor, tableware and more to transform any space.', href: '/rentals/', photo: 'site/wwd-rentals' },
] as const;

/** Home testimonials, verbatim (name and city as written on the original). */
export const testimonials = [
  { quote: 'The entire experience was smooth and enjoyable. The photos exceeded our expectations!', name: 'Madison', place: 'Montreal, QC' },
  { quote: 'The birthday party was a hit! They took care of everything, from the theme to the smallest detail. Highly recommend!', name: 'Kathy', place: 'Montreal, QC' },
  { quote: 'We had a couples photoshoot, and the results were breathtaking. The photographer captured our love perfectly!', name: 'Erha', place: 'Dallas, TX' },
  { quote: 'Everything we rented was of the highest quality, from the vases to the elegant furniture. It made all the difference!', name: 'Suzan', place: 'Ottawa, ON' },
  { quote: 'Seamless, stress-free and stunning. Guests are still talking about how beautiful the space looked.', name: 'Yasmin', place: 'Toronto, ON' },
  { quote: 'Our proposal was absolutely magical, thanks to their impeccable planning and attention to detail.', name: 'Mustafa', place: 'Ottawa, ON' },
  { quote: 'The professional headshots I received were outstanding, exactly what I needed for my portfolio!', name: 'Taylor', place: 'Toronto, ON' },
] as const;

/**
 * Reviews from the Google Business Profile, copied word for word (Nov 23 2026). Only reviews that have text
 * (rating-only reviews are left out). Add new ones here.
 */
export const googleReviews = [
  { quote: 'Beautiful decor very professional', name: 'Nour D.', place: 'Google review', stars: 5 },
  { quote: "We had a couple's photo shoot, and the results were amazing. The photographer captured our day perfectly!", name: 'Kal H.', place: 'Google review', stars: 5 },
] as const;

/** "Why Choose Starlit": the three items the original shows (Unlimited Supplies and Quick Delivery are commented out in its HTML). */
export const reasons = [
  { label: 'Best Price Guarantee', icon: '/img/icon-best-price-guarantee.png' },
  { label: 'Trusted Quality Partners', icon: '/img/icon-trusted-quality-partners.png' },
  { label: 'Fast Customer Service', icon: '/img/icon-fast-customer-service.png' },
] as const;
