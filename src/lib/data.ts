// RULE: pages read the sheet data only through this file | PREVENTS: URL and price formatting drifting between the listing, item pages, schema and sitemap.
import rentalsJson from '~/data/rentals.json';
import photographyJson from '~/data/photography.json';
import eventsJson from '~/data/events.json';
import { slugify } from '~/lib/slug';

export type Rental = (typeof rentalsJson.items)[number] & { slug: string };
export type Category = (typeof rentalsJson.categories)[number];
export type PhotoService = (typeof photographyJson)[number];
export type EventType = (typeof eventsJson)[number];

export const categories: Category[] = rentalsJson.categories;
export const rentals: Rental[] = rentalsJson.items as Rental[];
export const photography: PhotoService[] = photographyJson;
export const events: EventType[] = eventsJson;

export const categoryUrl = (name: string) => `/rentals/${slugify(name)}/`;
export const rentalUrl = (r: Rental) => `${categoryUrl(r.category)}${r.slug}/`;
export const photographyUrl = (p: PhotoService) => `/photography/${p.slug}/`;
export const eventUrl = (e: EventType) => `/events/${e.slug}/`;

export const inCategory = (c: string) => rentals.filter((r) => r.category === c || r.alsoIn.includes(c));

/** As the original formatted it: under $1 keeps cents, otherwise whole dollars. */
export function dayPrice(n: number | null | undefined): string {
  if (n == null) return '';
  return n < 1 ? `$${n.toFixed(2)} / day` : `$${Number.isInteger(n) ? n : n.toFixed(2)} / day`;
}
export const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** Photo keys as written by scripts/photos.mjs. */
export const photoKey = (dir: 'rentals' | 'events' | 'photography', name: string) => `${dir}/${slugify(name)}`;

/** The photo that leads each event (chosen by looking at every frame). */
const COVER: Record<string, number> = { 'romantic-proposal': 1, '80s-disco-party': 3, 'dreamy-bachelorette-party': 1, 'butterfly-birthday-party': 5 };
export const eventCover = (e: EventType) => photoKey('events', e.photos[(COVER[e.slug] ?? 1) - 1] ?? e.photos[0]);

/** First candidate that fits (titles 65, descriptions 160), else the shortest. Never cuts a sentence. */
export function fit(cands: string[], max: number): string {
  return cands.find((c) => c.length <= max) ?? [...cands].sort((a, b) => a.length - b.length)[0];
}
