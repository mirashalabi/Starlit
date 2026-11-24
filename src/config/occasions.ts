// RULE: occasion pages are offers, not case studies; every fact matches src/config/site.ts | PREVENTS: invented claims on SEO pages.
//
// Sources: business facts from ./site (Ottawa base, Montreal and Toronto, phone). Services from src/data/events.json,
// photography.json (digital and film event photography, headshots, milestone photos, casual photoshoots) and
// rentals.json (every slug in `rentals` exists there). "Book separately or together", "deliver, set up and take down"
// and "work with vendors you already booked" are the owner's own FAQ answers in ./faq.
// No prices, years, client counts, awards, venues or university affiliation. Photos: real Starlit files, alts written from the frame.
import { site } from './site';

export type OccasionWhen =
  | { kind: 'fixed'; month: number; day: number; lead: number }            // the date every year; show `lead` days before it, until the day
  | { kind: 'table'; dates: Record<number, string>; lead: number; span?: number } // ISO dates per year 2026-2030; span = days the occasion lasts after the start
  | { kind: 'easter'; lead: number }
  | { kind: 'nth'; month: number; weekday: number; n: number; lead: number } // weekday 0=Sun; n-th weekday of month (Canadian Thanksgiving = 2nd Monday of October)
  | { kind: 'range'; from: string; to: string }                             // 'MM-DD' to 'MM-DD' every year (may wrap the year end)
  | { kind: 'always' };                                                     // evergreen filler shown when nothing seasonal is active
export type Occasion = {
  slug: string;          // kebab-case, ends in -ottawa, e.g. 'ramadan-eid-ottawa'
  name: string;          // short card title, e.g. 'Ramadan & Eid'
  title: string;         // <title>, 60 characters or fewer, includes Ottawa
  description: string;   // meta description, 140-158 characters
  h1: string;
  card: string;          // one homepage card sentence, 80-120 characters
  photo: string;         // photo key: '<dir>/<file name without .jpg>' from src/assets/photos/{events,rentals,site,photography}
  photoAlt: string;      // describes what the photo really shows
  when: OccasionWhen[];  // one or more windows
  intro: string[];       // 2 paragraphs, 60-110 words each, unique to this occasion
  services: { title: string; text: string }[]; // exactly 3: planning or styling, décor and rentals, photography. Each 30-60 words, tailored to the occasion
  ideas: string[];       // 5 or 6 concrete styling or party ideas, one sentence each
  rentals: string[];     // 3-6 real rental item slugs that fit (they must exist in rentals.json)
  faq: { q: string; a: string }[]; // 3 real questions people search, with honest answers. Answers point to the contact form or phone for quotes; never quote prices
  service: 'Event' | 'Photography' | 'Rental'; // preselects the contact form
};

const ask = `use the contact form or call ${site.phone}`;

export const occasions: Occasion[] = [
  {
    slug: 'easter-brunch-ottawa',
    name: 'Easter',
    title: 'Easter Brunch & Spring Table Décor in Ottawa | Starlit',
    description: 'Host Easter brunch in Ottawa with a spring table of bud vases and greenery, rental serving pieces and family photos from Starlit. Ask for ideas and a quote.',
    h1: 'Easter Brunch and Family Gatherings in Ottawa',
    card: 'Spring flowers, a light brunch table and family photos. Starlit can style your Easter gathering in Ottawa.',
    photo: 'rentals/assorted-glass-bud-vases',
    photoAlt: 'Small glass bud vases holding cream and white roses with green stems on a wooden table',
    when: [{ kind: 'easter', lead: 21 }],
    intro: [
      'Easter in Ottawa often lands just as the snow is finally leaving, and a bright table feels right after a long winter. Whether you are hosting brunch after church, a big family lunch or an egg hunt for the kids, Starlit can style the table, set out a dessert spread and photograph the day. We use soft whites, greenery and spring flowers that work with any colours you choose.',
      'Easter falls on a different Sunday each year, between late March and late April, so we suggest reaching out a few weeks before. You can rent décor on its own, add a photographer for family portraits, or have Starlit plan and set up the whole gathering. Tell us your guest count, whether children will be there, and the look you want, and we will send a quote.',
    ],
    services: [
      { title: 'Planning and styling', text: 'Starlit can plan an Easter brunch or lunch from the table plan to the egg hunt. We set up before guests arrive, keep the children\'s activities in mind, and make sure the table looks ready for photos when the food comes out.' },
      { title: 'Décor and rentals', text: 'Assorted glass bud vases, white artificial eucalyptus, cupcake trays and woven baskets create a light spring table. Use tiered trays for hot cross buns and sweets. Starlit can deliver, set up and take everything down afterward.' },
      { title: 'Photography', text: 'A photographer can cover the egg hunt, the family around the table and a few posed portraits in your Easter best. Spring light is soft and flattering, so we like to schedule outdoor photos when the weather allows.' },
    ],
    ideas: [
      'Run a line of glass bud vases with spring flowers down the middle of the table.',
      'Serve hot cross buns and mini eggs on a three-tier acrylic cupcake tray.',
      'Tuck a sprig of white artificial eucalyptus into each napkin.',
      'Give each child a woven basket for the egg hunt.',
      'Use tree wood label holders to name each dish on the brunch buffet.',
    ],
    rentals: ['assorted-glass-bud-vases', 'three-tier-acrylic-cupcake-tray', 'white-artificial-eucalyptus-leaf', 'wooden-circular-woven-basket', 'tree-wood-label-holders'],
    faq: [
      { q: 'When is Easter this year?', a: `Easter Sunday moves each year and falls between March 22 and April 25. Once you have your date and guest count, ${ask}.` },
      { q: 'Can you style a small family brunch?', a: `Yes. A brunch at home for close family is a good fit. Tell us how many people are coming and the space you have, then ${ask} for a quote.` },
      { q: 'Can you photograph an Easter egg hunt?', a: `Yes. Event photography can follow the children around the hunt and then move to family portraits. Share your date and location, then ${ask}.` },
    ],
    service: 'Event',
  },
  {
    slug: 'christmas-holiday-party-ottawa',
    name: 'Christmas & Holiday Parties',
    title: 'Christmas & Office Holiday Party Décor in Ottawa | Starlit',
    description: 'Family Christmas dinners and office parties in Ottawa, with gold and candlelit décor, party games, team photos and headshots from Starlit. Get a quote.',
    h1: 'Christmas and Holiday Parties in Ottawa',
    card: 'Family Christmas dinners and office holiday parties in Ottawa, styled, set up and photographed by Starlit.',
    photo: 'site/rentals-title-bar',
    photoAlt: 'Snow-covered trees and branches in a quiet winter orchard',
    when: [{ kind: 'range', from: '11-15', to: '12-25' }],
    intro: [
      "From mid November to Christmas Day, Ottawa is full of holiday parties: office parties, friends' dinners, family Christmas Eve and the big meal on the 25th. Starlit can style any of them. We set a warm table with gold chargers, candlelight and greenery, build a photo spot for teams and families, and bring games for the part of the evening when people settle in.",
      'For office and team parties, we can handle décor and photography so the organiser is not stuck doing it all. For family gatherings, we can set up the day before so the host is free on the day. December dates are popular, so reach out early with your date, guest count and venue. Starlit will reply with ideas and a quote.',
    ],
    services: [
      { title: 'Planning and styling', text: 'Starlit can plan an office holiday party or a family Christmas gathering, including the timeline, games, a gift exchange and the room layout. We work with your venue or home and set up before guests arrive.' },
      { title: 'Décor and rentals', text: "Gold charger plates, gold round candle holders, fairy lights and eucalyptus strings create a classic holiday table. Add the Bingo Set or Who's Most Likely To... for office parties. Starlit can deliver, set up and take everything down after the party." },
      { title: 'Photography', text: 'Book event photography for team photos, candid shots and the gift exchange, or a family photo session in your holiday outfits. Teams can add professional headshots on the same day, so everyone leaves with a fresh profile photo.' },
    ],
    ideas: [
      'Set the table with gold charger plates and gold round candle holders for a classic Christmas look.',
      'Wind fairy lights through artificial eucalyptus strings along the mantel or the bar.',
      'Run a holiday bingo round with the Bingo Set at the office party.',
      'Book a headshot corner at the office party so the team leaves with new profile photos.',
      'Serve Christmas cookies on a four-tier acrylic cupcake tray.',
      'Set up a family photo corner by the tree with a gold circular frame.',
    ],
    rentals: ['large-gold-charger-plate', 'gold-round-candle-holder', 'fairy-lights', 'artificial-eucalyptus-strings', 'bingo-set', 'four-tier-acrylic-cupcake-tray'],
    faq: [
      { q: 'Do you style office holiday parties?', a: `Yes. Starlit can style an office party at your workplace or a rented venue, with décor, games and photography. Share the date, team size and venue, then ${ask}.` },
      { q: 'Can you add headshots at our office party?', a: `Yes. Professional headshots can be booked alongside event photography, so the team can step aside for a portrait during the party. To plan it, ${ask}.` },
      { q: 'How early should we book a December party?', a: `December is the busiest party month, so the earlier the better. Send your date as soon as you have it: ${ask}.` },
    ],
    service: 'Event',
  },
];
