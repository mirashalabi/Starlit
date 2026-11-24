// RULE: scroll-linked motion moves only transform, opacity and clip-path, never layout; it is off under reduced motion and the page is complete without it | PREVENTS: layout shift, motion for people who opted out, and content hidden when JavaScript fails.
//
// A small, dependency-free version of the GSAP ScrollTrigger effects on the Hang Free build:
//   [data-grow]        a band that starts at 84% scale with deep rounded corners and grows to full size as it
//                      rises up the screen (Hang Free's video band: 0.84 -> 1, radius 40 -> 18).
//   [data-parallax]    the hero photo moves slower than the page; [data-parallax-content] lifts and fades out.
//   [data-settle]      a card photo zooms from 1.15 to 1 while the card crosses the screen.
//   [data-drift]       a background drifts a little against the scroll (testimonial photos).
//   [data-unveil]      a photo is revealed from the bottom edge once, with a slow zoom-out.
//   h2 word reveal     section headings rise word by word once, as they arrive.

const rm = matchMedia('(prefers-reduced-motion: reduce)');
type Fx = { el: HTMLElement; update: (vh: number) => void };
const active = new Set<Fx>();
const all: Fx[] = [];
let ticking = false;

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 when the element's top is at `startFrac` of the viewport, 1 when it reaches `endFrac`. */
const progress = (el: Element, vh: number, startFrac: number, endFrac: number) => {
  const top = el.getBoundingClientRect().top;
  return clamp((vh * startFrac - top) / (vh * (startFrac - endFrac)));
};
/** 0 when the element enters at the bottom, 1 when it leaves at the top. */
const through = (el: Element, vh: number) => {
  const r = el.getBoundingClientRect();
  return clamp((vh - r.top) / (vh + r.height));
};

function frame() {
  ticking = false;
  const vh = innerHeight;
  for (const fx of active) fx.update(vh);
}
function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

function register(el: HTMLElement, update: (vh: number) => void) {
  const fx = { el, update };
  all.push(fx);
  io.observe(el);
  update(innerHeight);
}

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const fx = all.find((f) => f.el === e.target);
    if (!fx) continue;
    if (e.isIntersecting) active.add(fx); else active.delete(fx);
  }
  request();
}, { rootMargin: '20% 0px 20% 0px' });

function start() {
  // Grow band
  document.querySelectorAll<HTMLElement>('[data-grow]').forEach((band) => {
    const frameEl = band.querySelector<HTMLElement>('[data-grow-frame]') ?? band;
    register(band, (vh) => {
      const p = progress(band, vh, 0.95, 0.25);
      frameEl.style.transform = `scale(${lerp(0.84, 1, p).toFixed(4)})`;
      frameEl.style.borderRadius = `${lerp(40, 18, p).toFixed(1)}px`;
    });
  });

  // Hero parallax
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((media) => {
    const hero = media.closest<HTMLElement>('section') ?? media;
    const content = hero.querySelector<HTMLElement>('[data-parallax-content]');
    register(hero, () => {
      const r = hero.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height));
      media.style.transform = `translate3d(0, ${(p * 18).toFixed(2)}%, 0)`;
      if (content) {
        content.style.transform = `translate3d(0, ${(-p * 12).toFixed(2)}%, 0)`;
        content.style.opacity = String(lerp(1, 0.15, p).toFixed(3));
      }
    });
  });

  // Card photos settle (wrapper scales so the hover zoom on the <img> still works)
  document.querySelectorAll<HTMLElement>('[data-settle], .event-card__img, .pillar__img').forEach((wrap) => {
    register(wrap, (vh) => {
      const p = through(wrap, vh);
      wrap.style.transform = `scale(${lerp(1.15, 1, clamp(p * 1.6)).toFixed(4)})`;
    });
  });

  // Background drift
  document.querySelectorAll<HTMLElement>('[data-drift], .reviews__bg').forEach((bg) => {
    register(bg, (vh) => {
      const p = through(bg.parentElement ?? bg, vh);
      bg.style.transform = `translate3d(0, ${lerp(-8, 8, p).toFixed(2)}%, 0) scale(1.18)`;
    });
  });

  // One-time unveil (clip from the bottom, slow zoom-out)
  const unveil = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      unveil.unobserve(e.target);
      e.target.classList.add('is-unveiled');
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll<HTMLElement>('[data-unveil], main .split__media').forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight) return; // above the fold: shown as is
    el.classList.add('unveil-ready');
    unveil.observe(el);
  });

  // Headings rise word by word (once). Text content and accessible name are unchanged.
  const words = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      words.unobserve(e.target);
      e.target.classList.add('is-in');
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll<HTMLElement>('main h2.display-l, main h2.display-m').forEach((h) => {
    if (h.closest('[data-hero], .hero, .page-hero, .cta') || h.getBoundingClientRect().top < innerHeight) return;
    split(h);
    h.classList.add('words-ready');
    words.observe(h);
  });


  // Pinned horizontal gallery (desktop): the section holds still while its track moves sideways.
  const wide = matchMedia('(min-width: 900px)');
  document.querySelectorAll<HTMLElement>('[data-hscroll]').forEach((sec) => {
    const track = sec.querySelector<HTMLElement>('[data-hscroll-track]');
    const viewport = track?.parentElement as HTMLElement | null;
    if (!track || !viewport) return;
    let distance = 0;
    const sticky = sec.querySelector<HTMLElement>('.hs__sticky');
    // Heights in px from innerHeight, the same number the scroll progress uses. CSS 100vh is taller than
    // innerHeight in Safari while its toolbar shows, which let the pin release before the last photo arrived.
    const measure = () => {
      if (!wide.matches) { sec.classList.remove('is-pinned'); sec.style.height = ''; if (sticky) sticky.style.height = ''; track.style.transform = ''; distance = 0; return; }
      sec.classList.add('is-pinned');
      distance = Math.max(0, Math.ceil(track.scrollWidth - viewport.clientWidth));
      if (sticky) sticky.style.height = `${innerHeight}px`;
      sec.style.height = `${innerHeight + distance}px`;
      request();
    };
    register(sec, (vh) => {
      if (!distance) return;
      const r = sec.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh));
      track.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
    });
    measure();
    addEventListener('resize', measure);
    addEventListener('load', measure, { once: true });
    document.fonts?.ready.then(measure);
    wide.addEventListener?.('change', measure);
    track.querySelectorAll('img').forEach((img) => { if (!img.complete) img.addEventListener('load', measure, { once: true }); });
  });

  // Magnetic buttons: mouse and trackpad only.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll<HTMLElement>('.btn, .quotes__btn, .social--big a, .header-phone, .grow__caption').forEach((el) => {
      el.classList.add('magnetic');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.transform = `translate3d(${(dx * 7).toFixed(2)}px, ${(dy * 6).toFixed(2)}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  document.documentElement.classList.add('scroll-fx');
}

/** Wrap each word of a heading (keeping <em> and other inline elements) in a mask span. */
function split(h: HTMLElement) {
  let i = 0;
  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = (child.textContent ?? '').split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(document.createTextNode(part)); continue; }
          const mask = document.createElement('span');
          mask.className = 'w';
          const inner = document.createElement('span');
          inner.textContent = part;
          inner.style.setProperty('--wi', String(Math.min(i++, 10)));
          mask.append(inner);
          frag.append(mask);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };
  walk(h);
}

function stop() {
  // Reduced motion switched on mid-visit: put everything at rest.
  for (const fx of all) {
    fx.el.style.transform = '';
    fx.el.querySelectorAll<HTMLElement>('[data-grow-frame], [data-parallax-content]').forEach((c) => { c.style.transform = ''; c.style.opacity = ''; c.style.borderRadius = ''; });
  }
  document.querySelectorAll<HTMLElement>('[data-parallax], [data-settle], [data-drift], .magnetic, [data-hscroll-track]').forEach((el) => (el.style.transform = ''));
  document.querySelectorAll<HTMLElement>('[data-hscroll]').forEach((s) => { s.classList.remove('is-pinned'); s.style.height = ''; });
  document.querySelectorAll('.unveil-ready, .words-ready').forEach((el) => el.classList.add('is-unveiled', 'is-in'));
  active.clear();
  removeEventListener('scroll', request);
  document.documentElement.classList.remove('scroll-fx');
}

if (!rm.matches && 'IntersectionObserver' in window) start();
rm.addEventListener?.('change', (e) => { if (e.matches) stop(); });

export {};
