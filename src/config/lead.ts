// RULE: one place says where the contact form posts | PREVENTS: a preview and production posting to different backends by accident.
//
// Standard path (seo-forge references/lead-forms-and-spam.md): browser -> lead-relay Worker (Turnstile)
// -> Apps Script backend/Code.gs (Leads sheet first, then the branded email to info@starlit-events.com),
// with a straight post to the /exec URL when the Worker is unreachable.
//
// Until the Apps Script is deployed (it needs Kal's Google sign-in) `exec` is empty and the form keeps
// posting to the Formspree form the original site already used, so no inquiry is lost in between.
export const lead = {
  relay: 'https://starlit-lead-relay.renderanalytics.workers.dev',
  /** Apps Script web app /exec URL. Empty until deployed. */
  exec: 'https://script.google.com/macros/s/AKfycbx_DxbEgETsOSBlBF9d8H0-TGB-U00RW1W1Y0ZhE6kffAjHPCvmhAKSmlP26xEN3hC_VQ/exec',
  /** Interim backend: the original site's Formspree form. */
  formspree: 'https://formspree.io/f/xbdrajrk',
  /** Honeypot field name read by backend/Code.gs. */
  honeypot: 'company',
};
export const relayLive = lead.exec !== '';
