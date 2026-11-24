// RULE: every interaction works on top of complete server-rendered HTML; with JavaScript off the menu, every rental, every quote and the form still work | PREVENTS: the original's failure, where rentals, events and photography were empty until scripts ran.

import { armLeadForm, turnstileToken, sendLead } from './turnstile-lazy';
import { attribution } from './attribution';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

// ── Mobile menu ───────────────────────────────────────────────
const toggle = $<HTMLButtonElement>('.nav-toggle');
if (toggle) {
  const set = (open: boolean) => {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => set(!document.body.classList.contains('nav-open')));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && set(false));
  $$('.nav a').forEach((a) => a.addEventListener('click', () => set(false)));
}

// ── Inquiry cart (localStorage, same key as the original site) ─
type InqItem = { name: string; category?: string; price?: number | null; image?: string; url?: string };
const KEY = 'inquiryItems';
const read = (): InqItem[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const write = (l: InqItem[]) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* private mode: the form still works */ } };

function paintCount() {
  const n = read().length;
  $$('[data-inq-count]').forEach((el) => { el.textContent = String(n); el.hidden = n === 0; });
  $$<HTMLButtonElement>('[data-add]').forEach((b) => {
    const on = read().some((i) => i.name === b.dataset.name);
    b.setAttribute('aria-pressed', String(on));
    const label = b.querySelector('.add-btn__label, [data-add-label]');
    if (label) label.textContent = on ? 'Added' : b.dataset.addText || 'Add';
  });
}
const toast = $('[data-toast]');
let toastTimer = 0;
function say(html: string) {
  if (!toast) return;
  toast.innerHTML = html;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
}
document.addEventListener('click', (e) => {
  const b = (e.target as Element)?.closest<HTMLButtonElement>('[data-add]');
  if (!b) return;
  e.preventDefault();
  const list = read();
  const i = list.findIndex((x) => x.name === b.dataset.name);
  if (i >= 0) { list.splice(i, 1); write(list); say(`Removed from your inquiry`); }
  else {
    list.push({ name: b.dataset.name!, category: b.dataset.category, price: b.dataset.price ? Number(b.dataset.price) : null, image: b.dataset.image, url: b.dataset.url });
    write(list);
    say(`Added to inquiry · <a href="/contact/">Review and send</a>`);
  }
  paintCount();
  renderCart();
});
paintCount();

// ── Testimonials ──────────────────────────────────────────────
for (const root of $$('[data-quotes]')) {
  const quotes = $$('.quote', root);
  const count = $('[data-quote-count]', root);
  const bar = $('.quotes__bar i', root);
  let i = 0, timer = 0;
  const DUR = 7000;
  const show = (n: number) => {
    i = (n + quotes.length) % quotes.length;
    quotes.forEach((q, k) => { q.classList.toggle('is-active', k === i); q.setAttribute('aria-hidden', String(k !== i)); });
    root.querySelectorAll('[data-quote-bg]').forEach((g, k) => g.classList.toggle('is-active', k === i));
    if (count) count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(quotes.length).padStart(2, '0')}`;
    if (bar) { bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run'); }
  };
  const play = () => { if (reduce) return; clearInterval(timer); timer = window.setInterval(() => show(i + 1), DUR); };
  $('[data-quote-prev]', root)?.addEventListener('click', () => { show(i - 1); play(); });
  $('[data-quote-next]', root)?.addEventListener('click', () => { show(i + 1); play(); });
  root.addEventListener('mouseenter', () => clearInterval(timer));
  root.addEventListener('mouseleave', play);
  root.addEventListener('focusin', () => clearInterval(timer));
  show(0);
  // Only rotate while on screen.
  new IntersectionObserver(([e]) => (e.isIntersecting ? play() : clearInterval(timer))).observe(root);
}

// ── Rentals: filter, search, sort, pages ──────────────────────
const grid = $('[data-rental-grid]');
if (grid) {
  const cards = $$('[data-rental]', grid);
  const search = $<HTMLInputElement>('[data-rental-search]');
  const sort = $<HTMLSelectElement>('[data-rental-sort]');
  const chips = $$<HTMLButtonElement>('[data-filter]');
  const count = $('[data-rental-count]');
  const empty = $('[data-rental-empty]');
  const pager = $('[data-pager]');
  const PER = innerWidth < 600 ? 12 : 24;
  let cat = 'All', term = '', page = 1;
  const original = [...cards];

  const apply = (scroll = false) => {
    let list = original.filter((c) => (cat === 'All' || (c.dataset.cats || '').split('|').includes(cat)) && (!term || (c.dataset.search || '').includes(term)));
    const mode = sort?.value || 'none';
    if (mode !== 'none') {
      list = [...list].sort((a, b) => {
        if (mode === 'name') return (a.dataset.name || '').localeCompare(b.dataset.name || '');
        const pa = Number(a.dataset.price || 0), pb = Number(b.dataset.price || 0);
        return mode === 'low' ? pa - pb : pb - pa;
      });
    }
    const pages = Math.max(1, Math.ceil(list.length / PER));
    page = Math.min(page, pages);
    original.forEach((c) => (c.hidden = true));
    list.forEach((c, k) => { grid.appendChild(c); c.hidden = k < (page - 1) * PER || k >= page * PER; });
    if (count) count.textContent = `${list.length} ${list.length === 1 ? 'item' : 'items'}${cat !== 'All' ? ` in ${cat}` : ''}`;
    if (empty) empty.hidden = list.length > 0;
    if (pager) {
      pager.innerHTML = '';
      if (pages > 1) {
        const btn = (label: string, n: number, opts: { current?: boolean; disabled?: boolean; aria?: string } = {}) => {
          const b = document.createElement('button');
          b.type = 'button'; b.textContent = label; b.disabled = !!opts.disabled;
          if (opts.current) b.setAttribute('aria-current', 'true');
          if (opts.aria) b.setAttribute('aria-label', opts.aria);
          b.addEventListener('click', () => { page = n; apply(true); });
          pager.appendChild(b);
        };
        btn('‹', page - 1, { disabled: page === 1, aria: 'Previous page' });
        for (let n = 1; n <= pages; n++) btn(String(n), n, { current: n === page, aria: `Page ${n}` });
        btn('›', page + 1, { disabled: page === pages, aria: 'Next page' });
      }
    }
    if (scroll) grid.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  chips.forEach((c) => c.addEventListener('click', () => {
    cat = c.dataset.filter || 'All'; page = 1;
    chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    apply();
  }));
  search?.addEventListener('input', () => { term = search.value.toLowerCase().trim(); page = 1; apply(); });
  sort?.addEventListener('change', () => { page = 1; apply(); });
  apply();
}

// ── Item page thumbnails ──────────────────────────────────────
for (const media of $$('[data-item-media]')) {
  const main = $$('[data-item-main] picture, [data-item-main] img', media);
  const thumbs = $$<HTMLButtonElement>('[data-thumb]', media);
  thumbs.forEach((t, k) => t.addEventListener('click', () => {
    $$('[data-item-slide]', media).forEach((s, j) => (s.hidden = j !== k));
    thumbs.forEach((x, j) => x.setAttribute('aria-current', String(j === k)));
  }));
  void main;
}

// ── Lightbox for galleries ────────────────────────────────────
const box = $<HTMLDialogElement>('[data-lightbox]');
if (box) {
  const img = $<HTMLImageElement>('img', box)!;
  let set: HTMLButtonElement[] = [], at = 0;
  const open = (k: number) => {
    at = (k + set.length) % set.length;
    const b = set[at];
    img.src = b.dataset.full || '';
    img.alt = b.querySelector('img')?.alt || '';
    box.toggleAttribute('data-single', set.length < 2);
    if (!box.open) box.showModal();
  };
  document.addEventListener('click', (e) => {
    const b = (e.target as Element)?.closest<HTMLButtonElement>('[data-full]');
    if (!b) return;
    const g = b.closest('[data-gallery]');
    set = g ? $$<HTMLButtonElement>('[data-full]', g) : [b];
    open(set.indexOf(b));
  });
  $('[data-lb-close]', box)?.addEventListener('click', () => box.close());
  $('[data-lb-prev]', box)?.addEventListener('click', () => open(at - 1));
  $('[data-lb-next]', box)?.addEventListener('click', () => open(at + 1));
  box.addEventListener('click', (e) => { if (e.target === box || (e.target as Element).classList.contains('lightbox__fig')) box.close(); });
  box.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') open(at - 1); if (e.key === 'ArrowRight') open(at + 1); });
}

// ── Background video (contact): after load, never under reduced motion or Save-Data ─
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
for (const v of $$<HTMLVideoElement>('[data-bgvideo]')) {
  if (reduce || saveData) continue;
  const go = () => {
    for (const [type, src] of [['video/webm', v.dataset.webm], ['video/mp4', v.dataset.mp4]] as const) {
      if (!src) continue;
      const s = document.createElement('source'); s.type = type; s.src = src; v.appendChild(s);
    }
    v.load();
    new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause())).observe(v);
  };
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
}

// ── Contact page: the inquiry list and the form ───────────────
function renderCart() {
  const box = $('[data-cart]');
  if (!box) return;
  const list = read();
  const ul = $('ul', box)!;
  const empty = $('[data-cart-empty]', box)!;
  ul.innerHTML = '';
  empty.hidden = list.length > 0;
  for (const item of list) {
    const li = document.createElement('li');
    if (item.image) { const im = document.createElement('img'); im.src = item.image; im.alt = ''; im.width = 54; im.height = 54; li.appendChild(im); }
    const s = document.createElement('span');
    if (item.url) { const a = document.createElement('a'); a.href = item.url; a.textContent = item.name; s.appendChild(a); } else s.textContent = item.name;
    if (item.price != null) s.append(` · $${item.price} / day`);
    li.appendChild(s);
    const rm = document.createElement('button'); rm.type = 'button'; rm.textContent = '✕'; rm.setAttribute('aria-label', `Remove ${item.name}`);
    rm.addEventListener('click', () => { write(read().filter((x) => x.name !== item.name)); renderCart(); paintCount(); });
    li.appendChild(rm);
    ul.appendChild(li);
  }
  const hidden = $<HTMLInputElement>('[name="inquiry_items"]');
  if (hidden) hidden.value = list.length ? list.map((i) => `• ${i.name} (${i.category || 'Rental'}) – ${i.price != null ? `$${i.price} / day` : 'Price not listed'}`).join('\n') : 'No rental items added.';
  const type = $<HTMLSelectElement>('[name="service"]');
  if (type && list.length && !type.value) type.value = 'Rental';
}
renderCart();

const form = $<HTMLFormElement>('[data-lead-form]');
if (form) {
  if (form.dataset.relay === 'on') armLeadForm(form);
  const started = Date.now();
  const err = $('[data-form-error]', form);
  const params = new URLSearchParams(location.search);
  const pre = params.get('type');
  const typeSel = $<HTMLSelectElement>('[name="service"]', form);
  if (pre && typeSel && [...typeSel.options].some((o) => o.value === pre)) typeSel.value = pre;
  const about = params.get('about');
  const msg = $<HTMLTextAreaElement>('[name="message"]', form);
  if (about && msg && !msg.value) msg.value = `I’m interested in: ${about.slice(0, 120)}\n\n`;

  const valid = (f: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
    let ok = f.value.trim() !== '' || !f.required;
    if (ok && f.name === 'email' && f.value) ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim());
    if (ok && f.name === 'phone' && f.value) ok = f.value.replace(/\D/g, '').length >= 10;
    f.setAttribute('aria-invalid', String(!ok));
    return ok;
  };
  const fields = $$<HTMLInputElement>('input[required], select[required], textarea[required]', form);
  fields.forEach((f) => f.addEventListener('blur', () => f.value && valid(f)));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = fields.filter((f) => !valid(f));
    if (err) err.hidden = bad.length === 0;
    if (bad.length) { bad[0].focus(); return; }
    const relay = form.dataset.relay === 'on';
    if (relay) await turnstileToken(form);
    const fd = new FormData(form);
    if (!fd.get('form_ms')) fd.set('form_ms', String(Date.now() - started));
    fd.set('page_url', location.href.split('#')[0]);
    fd.set('referrer', document.referrer.slice(0, 300));
    Object.entries(attribution()).forEach(([k, v]) => v && fd.set(k, v));
    fd.set('inquiry_type', String(fd.get('service') || ''));
    const btn = $<HTMLButtonElement>('[type="submit"]', form);
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent || ''; btn.textContent = 'Sending…'; }
    try {
      if (relay) {
        await sendLead(new URLSearchParams(fd as unknown as Record<string, string>));
      } else {
        const res = await fetch(form.action, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
      }
      write([]);
      location.href = '/thank-you/';
    } catch {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Send'; }
      if (err) { err.hidden = false; err.innerHTML = `Sorry, that didn’t go through. Please try again, or call <a href="tel:+16139837827">(613) 983-7827</a>.`; }
    }
  });
}

// ── Home hero: night montage of Ottawa, Toronto and Montréal (Pexels, .forge/media-credits.md) ─
// Phones get a portrait cut, wider screens the 16:9 cut: same clips, same order, same city label and pause button.
// The poster is the first frame of each cut, so the video fades in without a jump. Not under reduced motion or Save-Data.
{
  const v = document.querySelector<HTMLVideoElement>('[data-city-video]');
  const list = document.querySelector<HTMLElement>('[data-cities]');
  const items = list ? [...list.querySelectorAll<HTMLElement>('[data-city]')] : [];
  const btn = document.querySelector<HTMLButtonElement>('[data-city-pause]');
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (v && !matchMedia('(prefers-reduced-motion: reduce)').matches && !conn?.saveData) {
    const phone = matchMedia('(max-width: 700px)');
    const cues = (v.dataset.cues || '').split(',').map((c) => { const [t, n] = c.split(':'); return { t: Number(t), n }; });
    // City index: the city on screen is bright with a gold rule that draws across while its footage plays.
    const setCity = () => {
      const now = v.currentTime;
      let k = 0;
      for (let j = 0; j < cues.length; j++) if (now >= cues[j].t) k = j;
      const from = cues[k].t, to = k + 1 < cues.length ? cues[k + 1].t : (v.duration || from + 6);
      const p = Math.min(1, Math.max(0, (now - from) / Math.max(0.1, to - from)));
      items.forEach((li, j) => {
        li.classList.toggle('is-on', j === k);
        li.style.setProperty('--p', j === k ? p.toFixed(3) : j < k ? '1' : '0');
      });
    };
    let raf = 0;
    const tick = () => { setCity(); raf = requestAnimationFrame(tick); };
    v.addEventListener('play', () => { list?.classList.add('is-live'); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); });
    v.addEventListener('pause', () => cancelAnimationFrame(raf));
    const load = () => {
      const src = phone.matches ? v.dataset.srcM! : v.dataset.src!;
      if (v.getAttribute('src') === src) return;
      const t = v.currentTime;
      v.src = src;
      v.load();
      if (t) v.currentTime = t;
      if (!v.dataset.paused) v.play().catch(() => {});
    };
    v.addEventListener('playing', () => { v.classList.add('is-playing'); if (btn) btn.hidden = false; });
    v.addEventListener('seeked', setCity);
    // Off screen: pause to save battery; back on screen: resume unless the visitor paused it.
    new IntersectionObserver(([e]) => {
      if (!v.getAttribute('src')) return;
      if (e.isIntersecting) { if (!v.dataset.paused) v.play().catch(() => {}); } else v.pause();
    }).observe(v);
    btn?.addEventListener('click', () => {
      const pausing = !v.paused;
      if (pausing) { v.pause(); v.dataset.paused = '1'; } else { delete v.dataset.paused; v.play().catch(() => {}); }
      btn.setAttribute('aria-pressed', String(pausing));
      const l = btn.querySelector('[data-city-pause-label]');
      if (l) l.textContent = pausing ? 'Play background video' : 'Pause background video';
    });
    phone.addEventListener?.('change', load);
    const start = () => load();
    if (document.readyState === 'complete') setTimeout(start, 150); else addEventListener('load', () => setTimeout(start, 150), { once: true });
  }
}

export {};
