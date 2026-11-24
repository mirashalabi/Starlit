// RULE: visible reveals below the fold only, once, never in the hero, off under reduced motion | PREVENTS: motion that never registers (22px), hero fade-ins that delay LCP, and content hidden when JS fails.
/**
 * THE MOTION MODULE: every piece of scroll and click motion on the site, in one
 * place. Import it once from the Base layout (`<script>import '~/scripts/motion';</script>`).
 * The numbers live ONLY in CSS tokens (templates/css/motion.css); this file
 * decides what moves, the CSS decides how far and how fast.
 *
 * No library, no scroll listener: IntersectionObserver and one delegated click
 * handler. Only transform and opacity move, so CLS stays 0.
 *
 *   1. Header shadow. An 8px `#top-sentinel` sits first in <body>. When it
 *      leaves the viewport the `[data-header]` element gets `data-scrolled`,
 *      and the CSS fades in a ::after shadow. The header never shrinks or hides.
 *   2. Links to the form. `a[href="#quote"]` and `[data-to-form]` scroll to
 *      `#quote` and focus its first field. Instant under reduced motion.
 *   3. Reveals. `data-reveal` values:
 *        ''        rise (--reveal-rise over --t-reveal)
 *        'stagger' the element's children come in --stagger apart, capped at 8
 *        'left'    slides in from the left  (desktop only, see motion.css)
 *        'right'   slides in from the right (desktop only, see motion.css)
 *      Rules:
 *        - once only (unobserve after the first intersection);
 *        - below the fold only: anything already on screen when this runs
 *          loses the attribute and is never hidden;
 *        - never inside SKIP (hero, header, footer, .prose, dialog);
 *        - nothing is hidden until `motion-ready` is on <html> (the CSS gates
 *          on it), so with JavaScript off or broken the page is complete;
 *        - off entirely under prefers-reduced-motion, and (v3.4) re-read live:
 *          if the visitor turns reduced motion on mid-visit, every pending
 *          reveal shows at once, so nothing is left hidden or mid-transform.
 *
 * Paid landing pages (/lp/) do not import this module: they stay still
 * (document.getAnimations().length === 0 after load).
 *
 * Gates (run them, do not assume): CLS 0 while scrolling; hero visible with JS
 * off; reduced motion honored; proof of motion is a scroll recording, not a still.
 */

// ---------------------------------------------------------------------------
// AUTO-TAG CONFIG. Fill these per site from the original's motion inventory and
// the reference teardown. Selectors are scoped to <main> automatically.
// Leave a list empty to tag nothing; hand-written `data-reveal` attributes in
// templates always work too.
// ---------------------------------------------------------------------------
/** Blocks that rise as one unit (section heads, split rows, quotes). */
const RISE: string[] = ['.section-head > :not(h2):not(:has(h2))', '.statement-row > :not(h2):not(:has(h2))', '.quotes__stage', '.cta', '.item__info', '.contact-aside', '.form-card', '.page-lead'];
/** Grids whose direct children come in one after another. */
const STAGGER: string[] = ['.area-cards', '.city-reviews', '.follow__strip', '.smap__grid', '.pillars', '.reasons', '.event-cards', '.gallery', '.rental-grid', '.options tbody'];
/** Two-column rows whose halves slide in from the edges on desktop. */
const LEFT: string[] = ['.split:not(.split--flip) > .split__media', '.split--flip > .split__text'];
const RIGHT: string[] = ['.split:not(.split--flip) > .split__text', '.split--flip > .split__media'];
/** Never animate anything inside these. */
const SKIP = '[data-hero], header, footer, .prose, dialog, [data-no-reveal]';
/** Stagger index cap: item 9 onward arrives with item 8. */
const STAGGER_CAP = 8;

// ---------------------------------------------------------------------------

const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduce = reduceQuery.matches;
// v3.4: listen for the setting changing during the visit (10k scrub-pipeline rule:
// the still/moving decision is re-evaluated live, not read once at load).
reduceQuery.addEventListener?.('change', (e) => {
  reduce = e.matches;
  if (reduce) document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
});
const hasIO = 'IntersectionObserver' in window;

// 1. Header shadow.
const sentinel = document.getElementById('top-sentinel');
const header = document.querySelector<HTMLElement>('[data-header]');
if (sentinel && header && hasIO) {
  new IntersectionObserver(([e]) => header.toggleAttribute('data-scrolled', !e.isIntersecting)).observe(sentinel);
}

// 1b. In-page links (for example "Explore Our Services" -> #services): our own scroll, so the jump always lands
// on the section, flush left, below the fixed header, whatever the browser's smooth-scroll does.
document.addEventListener('click', (e) => {
  const t = e.target instanceof Element ? e.target : null;
  if (!t || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = t.closest<HTMLAnchorElement>('a[href^="#"]:not([href="#quote"]):not([href="#"])');
  if (!link) return;
  const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (!target) return;
  e.preventDefault();
  const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const top = target.getBoundingClientRect().top + scrollY - offset;
  scrollTo({ top: Math.max(0, top), left: 0, behavior: reduce ? 'auto' : 'smooth' });
  history.replaceState(null, '', link.hash);
});

// 2. Links to the form.
document.addEventListener('click', (e) => {
  const t = e.target instanceof Element ? e.target : null;
  if (!t || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = t.closest('a[href="#quote"], [data-to-form]');
  const form = document.getElementById('quote');
  if (!link || !form) return;
  e.preventDefault();
  form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  form
    .querySelector<HTMLElement>('input:not([type="hidden"]):not([tabindex="-1"]), select, textarea')
    ?.focus({ preventScroll: true });
  history.replaceState(null, '', '#quote');
});

// 3. Reveals.
if (!reduce && hasIO) {
  const vh = innerHeight;
  const once = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        once.unobserve(e.target);
        e.target.classList.add('is-in');
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );

  const inMain = (list: string[]) =>
    list.length ? [...document.querySelectorAll<HTMLElement>(list.map((s) => `main ${s}`).join(', '))] : [];

  const tag = (el: HTMLElement, mode: string) => {
    if (el.closest(SKIP)) return;
    // A parent is already revealing, or a child grid staggers on its own.
    if (el.parentElement?.closest('[data-reveal]')) return;
    if (mode === '' && el.querySelector('[data-reveal]')) return;
    el.dataset.reveal = mode;
  };

  // Stagger first, so a rising parent can see its grid is already handled.
  inMain(STAGGER).forEach((el) => tag(el, 'stagger'));
  inMain(LEFT).forEach((el) => tag(el, 'left'));
  inMain(RIGHT).forEach((el) => tag(el, 'right'));
  inMain(RISE).forEach((el) => tag(el, ''));

  for (const el of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
    // Never in the hero/header/footer/prose/dialog, never above the fold.
    if (el.closest(SKIP) || el.getBoundingClientRect().top < vh) {
      el.removeAttribute('data-reveal');
      continue;
    }
    if (el.dataset.reveal === 'stagger') {
      [...el.children].forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(Math.min(i, STAGGER_CAP))));
    }
    once.observe(el);
  }

  // Only now may the CSS hide anything.
  document.documentElement.classList.add('motion-ready');
}

export {};
