// From seo-forge templates/ads-attribution/turnstile-lazy.ts (references/lead-forms-and-spam.md). Call armLeadForm(form) once per lead form.
/**
 * Cloudflare Turnstile, loaded lazily and never in the way.
 *
 * - The script loads on the form's first focus or when the form comes near the
 *   screen, never with the page, so page speed is untouched.
 * - appearance "interaction-only": most people never see a widget. Only a
 *   visitor Cloudflare is unsure about gets a checkbox, inside the form.
 * - Fail open: if the script is blocked (ad blocker, strict privacy browser,
 *   offline, an old cached page) the form still sends. The lead arrives with no
 *   token and the server saves AND emails it, marked Unverified.
 * - form_ms (milliseconds from the first focus to submit) goes with every lead
 *   for the server's min-time check. No first focus means no value, which the
 *   server treats as unknown, never as a bot.
 *
 * The sitekey is public and belongs in the front end. The SECRET never does: it
 * lives only in the lead-relay Worker (wrangler secret TURNSTILE_SECRET).
 * On localhost, and to prove the integration in an automated browser, use the
 * always-pass test sitekey 1x00000000000000000000AA (the real key shows a
 * "Verify you are human" checkbox to automated browsers; never solve it).
 */
import { lead } from '~/config/lead';
/** Public sitekey (widget 'Starlit Events lead form'); localhost uses Cloudflare's always-pass test key. */
export const TURNSTILE_SITEKEY = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '1x00000000000000000000AA' : '0x4AAAAAAGO9lH4iSYkxWmH0';
/** The lead-relay Worker (templates/lead-relay). It verifies the token and answers JSON with CORS. */
export const LEAD_RELAY = lead.relay;
/** The Apps Script /exec URL: the fallback when the Worker is unreachable. */
export const LEAD_ENDPOINT = lead.exec;
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const FIELD = 'cf-turnstile-response';

type TurnstileApi = { render: (el: HTMLElement, opts: Record<string, unknown>) => string };
let loading: Promise<TurnstileApi> | null = null;
let blocked = false;

function loadTurnstile(): Promise<TurnstileApi> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const w = window as unknown as { turnstile?: TurnstileApi };
    if (w.turnstile) return resolve(w.turnstile);
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => (w.turnstile ? resolve(w.turnstile) : reject(new Error('turnstile missing')));
    s.onerror = () => reject(new Error('turnstile blocked'));
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Arms one lead form. The form needs:
 *   <div data-turnstile></div>                     where a challenge may appear (near the button)
 *   <input type="hidden" name="form_ms">           filled on submit
 *   <select name="service" required>...</select>   the required "Service needed" field
 *   a honeypot: <div aria-hidden="true" class="hp"><input name="company" tabindex="-1" autocomplete="off"></div>
 */
export function armLeadForm(form: HTMLFormElement): void {
  let t0 = 0;
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    loadTurnstile()
      .then((ts) => {
        let slot = form.querySelector<HTMLElement>('[data-turnstile]');
        if (!slot) {
          slot = document.createElement('div');
          slot.setAttribute('data-turnstile', '');
          form.appendChild(slot);
        }
        ts.render(slot, {
          sitekey: TURNSTILE_SITEKEY,
          appearance: 'interaction-only',
          action: 'lead',
          'response-field-name': FIELD,
          'refresh-expired': 'auto',
        });
      })
      .catch(() => {
        blocked = true;
        /* blocked or offline: the form still sends, and the server marks the lead Unverified */
      });
  };
  form.addEventListener('focusin', () => {
    if (!t0) t0 = Date.now();
    start();
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(form);
  }
  form.addEventListener('submit', () => {
    const ms = form.elements.namedItem('form_ms') as HTMLInputElement | null;
    if (ms && t0) ms.value = String(Date.now() - t0);
  }, { capture: true });
}

/**
 * Call in the submit handler before sending. Waits up to waitMs for a token when a
 * challenge is still running, then returns whatever is there (maybe ''). Never throws
 * and never blocks the lead: an empty token is sent and the server fails open.
 */
export async function turnstileToken(form: HTMLFormElement, waitMs = 3000): Promise<string> {
  const read = () => (form.elements.namedItem(FIELD) as HTMLInputElement | null)?.value || '';
  const end = Date.now() + waitMs;
  while (!read() && loading && !blocked && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 150));
  }
  return read();
}

/**
 * Sends one lead. Worker first (it knows whether the lead landed); if the Worker is unreachable or says
 * no, post straight to the Apps Script /exec with no-cors (the script marks it "direct post"). Throws
 * only when both fail at the network level, so the caller can show the phone number.
 */
export async function sendLead(body: URLSearchParams): Promise<void> {
  try {
    const res = await fetch(LEAD_RELAY, { method: 'POST', body });
    const out = await res.json().catch(() => ({} as { ok?: boolean }));
    if (res.ok && out.ok !== false) return;
  } catch { /* fall through to the direct post */ }
  body.delete(FIELD);
  await fetch(LEAD_ENDPOINT, { method: 'POST', body, mode: 'no-cors', keepalive: true });
}
