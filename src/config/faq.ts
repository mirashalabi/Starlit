// RULE: FAQ answers are the owner's words as supplied by Kal (Nov 23 2026), verbatim except number ranges ("7 to 18", house style: no dashes) | PREVENTS: invented policies (deposits, travel, rental terms) on a live site.
// Held back: "Is there a rental minimum?" (the supplied answer still has blanks: "[no minimum / a $X minimum]", "$[Amount]").

export type Faq = { q: string; a: string };
export type FaqGroup = { id: string; title: string; items: Faq[] };

export const faqGroups: FaqGroup[] = [
  {
    id: 'general',
    title: 'General & Booking',
    items: [
      { q: 'Do we have to book all of your services together?', a: 'Nope! You can book event planning, photography, or decor rentals individually, or bundle them together for a seamless experience and package savings.' },
      { q: 'How far in advance should we book?', a: 'We recommend 7 to 18 months out for weddings and galas, and 2 to 6 months out for private parties and standalone rentals. Last-minute dates are always welcome if our calendar is open!' },
      { q: 'How do we lock in our date?', a: 'A signed contract and a 25% non-refundable retainer officially reserve your date. The remaining balance is due 20 days before your event.' },
      { q: 'Do you travel?', a: 'Yes! Travel within 50 km of Ottawa, Montreal, and Toronto is included. For events outside that radius, we’ll include a custom travel fee in your quote.' },
    ],
  },
  {
    id: 'planning',
    title: 'Event Planning',
    items: [
      { q: 'What planning packages do you offer?', a: 'We offer Full-Service Planning (start-to-finish design and logistics), Partial Planning (filling in the gaps), and Event Management (stepping in 6 weeks out to run the show).' },
      { q: 'Will you work with vendors we already hired?', a: 'Definitely. We love collaborating with new pros and are happy to work alongside any licensed, insured vendors you’ve already booked.' },
    ],
  },
  {
    id: 'photography',
    title: 'Photography',
    items: [
      { q: 'Do we get printing rights?', a: 'Yes! Every package includes a personal print release so you can download, share, and print your high-res photos anywhere.' },
      { q: 'Can we add a second shooter or engagement session?', a: 'Yes, both can be added to any photography package or booked as standalone sessions.' },
    ],
  },
  {
    id: 'rentals',
    title: 'Decor & Rentals',
    items: [
      { q: 'Do you deliver and set up the decor?', a: 'Yes, we offer full delivery, styling, and late-night teardown. For smaller tabletop orders, budget-friendly studio pickup is also available.' },
      { q: 'Can we change our rental order after booking?', a: 'You can add items or adjust quantities up to 14 days before your event, depending on availability.' },
      { q: 'What if something breaks during the event?', a: 'Normal wear and tear is on us. Missing, broken, or heavily damaged items will simply be billed at the replacement cost listed in your agreement.' },
    ],
  },
];

export const faqGroup = (id: string) => faqGroups.find((g) => g.id === id)!;
export const allFaqs = faqGroups.flatMap((g) => g.items);
