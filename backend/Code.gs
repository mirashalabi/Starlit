/**
 * Lead sheet for the website form: Google Ads click IDs, Cloudflare Turnstile, lead quality.
 *
 * TEMPLATE (seo-forge references/lead-forms-and-spam.md and references/modules/ads-attribution.md).
 * Keep this file pure ASCII (use \u escapes): pasting through the clipboard garbled a middle dot on Attica.
 *
 * Default path (v3.8.1):  browser form -> Cloudflare Worker (templates/lead-relay, checks Turnstile) -> here.
 * Fallback path:          browser form -> here directly (no-cors), when the Worker is unreachable.
 *
 * The Worker sends via=worker and turnstile = pass | fail | missing | error. The turnstile value is trusted
 * ONLY when via=worker; any other post is marked "direct post". Alternative (only when Kal sets the
 * TURNSTILE_SECRET Script Property himself): a direct post with a token is verified here with siteverify.
 *
 * Order of work for every POST:
 *   1. Bot checks: honeypot filled, sent faster than MIN_FORM_MS. Blocked tab, no email.
 *   2. Turnstile "fail" (forged, replayed or wrong-host token): Blocked tab, no email.
 *      missing, error or direct post: FAIL OPEN, saved AND emailed, marked unverified.
 *      Losing one real lead costs more than ten junk ones.
 *   3. Lead quality: off-topic words, a message with no on-topic word, out-of-area ZIP, state or country.
 *      Quality "Check" plus "Why flagged"; the subject starts "Check:". Still saved and emailed, never
 *      dropped. The Google Ads import tab must skip Quality "Check" and "Blocked" rows.
 *   4. Append to the Leads tab FIRST, then send the branded email.
 *
 * Pin appsscript.json "oauthScopes" (template beside this file) before any New version, so the editor
 * never asks for a new OAuth grant.
 * Deploy: Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone. Later changes:
 * Manage deployments > edit (pencil) > Version: New version, so the /exec URL stays the same.
 */

var CONFIG = {
  SITE_NAME: "Starlit Events & Photography",
  SITE_URL: "https://starlit-events.com",
  // Spreadsheet id. Empty on first run: the script creates the sheet and stores the id in Script Properties.
  SHEET_ID: "",
  SHEET_TITLE: "Starlit Events: website inquiries",
  SHEET_NAME: "Leads",
  BLOCKED_NAME: "Blocked",
  // Comma separate to copy more than one person. Empty sends no email.
  NOTIFY_TO: "info@starlit-events.com",
  TIME_ZONE: "America/Toronto",

  // Branded email. The logo is a PNG on the client's own site (Gmail drops SVG), about 240px wide.
  LOGO_URL: "https://starlit-events.com/img/email-logo.png",
  BRAND: { primary: "#15120e", accent: "#e6c068", ink: "#2a241d", muted: "#645b4f", panel: "#f8f3ea" },

  MIN_FORM_MS: 3000,
  SERVICE_AREA_STATES: [],         // e.g. ["FL"]; empty means no state check
  SERVICE_AREA_ZIP_PREFIXES: [],   // e.g. ["32", "33", "34"]; empty means no ZIP check
  COUNTRY: ""                      // no check: Starlit has clients outside Canada; from the Worker (Cloudflare's country); empty means no check
};

/**
 * Words that show up when someone tapped a Display ad on an assistance, housing or finance site. Kept
 * narrow: words real customers use ("apartment", "rent", "free") stay out. A match only FLAGS the lead.
 */
var OFF_TOPIC = /\b(low[\s-]*income|section\s*8|housing|disab(?:led|ility)|food\s*stamps?|vegetables?|groceries|grants?|financial\s+(?:help|assistance)|assistance\s+program|government\s+(?:help|program)|ssi|ssdi|snap|ebt|medicaid|welfare|stimulus|earn\s+money|work\s+from\s+home)\b/i;

/**
 * PER TRADE: rewrite this list for every client. Words a real customer of THIS business uses, English and
 * Spanish. A message of 3+ characters with none of them is flagged (never dropped). Example below is
 * Starlit's: events, rentals and photography, English and French (Montreal).
 */
var ON_TOPIC = /(event|party|parties|birthday|wedding|bridal|bride|proposal|propos|engage|bachelor|shower|baby|gender|anniversar|graduat|celebrat|corporate|dinner|picnic|theme|decor|d\u00e9cor|backdrop|arch|frame|plinth|balloon|neon|sign|vase|candle|flower|floral|rose|table|tray|board|game|rent|rental|photo|shoot|session|headshot|portrait|product|milestone|film|digital|plan|quote|pric|cost|budget|book|availab|date|guest|venue|consult|f\u00eate|fete|mariage|anniversaire|location|demande|prix|soir\u00e9e)/i;

// Column order. Append only, never reorder: the sheet and the Ads import depend on it.
var FIELDS = [
  { key: "name", label: "First name" },
  { key: "lastname", label: "Last name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "service", label: "Inquiry type" },
  { key: "event_date", label: "Event date" },
  { key: "message", label: "Message" },
  { key: "inquiry_items", label: "Rental items" },
  { key: "source", label: "Form" },
  { key: "page_url", label: "Page" },
  { key: "referrer", label: "Referrer" },
  { key: "ad_source", label: "Source" },
  { key: "gclid", label: "gclid" },
  { key: "gbraid", label: "gbraid" },
  { key: "wbraid", label: "wbraid" },
  { key: "landing_page", label: "Landing page" },
  { key: "quality", label: "Quality" },
  { key: "quality_reason", label: "Why flagged" },
  { key: "turnstile", label: "Spam check" },
  { key: "country", label: "Country" }
];
// Filled here (or by the Worker), never trusted from the browser.
var DERIVED = { ad_source: true, quality: true, quality_reason: true, turnstile: true, country: true };

var TURNSTILE_LABELS = {
  pass: "Passed",
  fail: "Failed",
  missing: "Not run (blocked or old page)",
  error: "Not run (Cloudflare error)",
  direct: "Not run (direct post)"
};

// Optional: map form option values to readable labels for the email and sheet.
var SERVICES = {};

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: CONFIG.SITE_NAME + " lead sheet" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  try {
    var r = collect_(p);
    var bot = botReason_(p, r);
    if (bot) { block_(r, bot); return ok_(); }
    if (r.turnstile === "fail") {
      block_(r, "Spam check failed" + (p.turnstile_detail ? " (" + String(p.turnstile_detail).slice(0, 80) + ")" : ""));
      return ok_();
    }
    var q = qualityFlags_(r);
    r.quality = q.length ? "Check" : "Looks good";
    r.quality_reason = q.join("; ");
    // Sheet FIRST: if the email fails, the lead is still kept.
    sheet_(CONFIG.SHEET_NAME, leadHeader_()).appendRow(leadRow_(r));
    try { notify_(r); } catch (mailErr) { console.error("MAIL FAILED: " + mailErr); }
    return ok_();
  } catch (err) {
    console.error("SUBMISSION FAILED: " + err);
    return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON);
  }
}

function ok_() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

function collect_(p) {
  var r = { received: new Date() };
  FIELDS.forEach(function (f) { r[f.key] = DERIVED[f.key] ? "" : String(p[f.key] || "").trim().slice(0, 4000); });
  r.ad_source = (r.gclid || r.gbraid || r.wbraid) ? "Google Ads" : "Direct, search or other";
  if (p.via === "worker") {
    // Only the Worker may say what Turnstile decided.
    r.turnstile = TURNSTILE_LABELS[p.turnstile] && p.turnstile !== "direct" ? p.turnstile : "missing";
    r.country = String(p.country || "").slice(0, 2).toUpperCase();
  } else {
    r.turnstile = verifyDirect_(p["cf-turnstile-response"]);
  }
  return r;
}

/** Bot layers kept beside Turnstile. Each returns a reason; the row goes to Blocked, no email. */
function botReason_(p, r) {
  if (String(p.company || "").trim() !== "") return "Honeypot filled";
  var ms = parseInt(p.form_ms, 10);
  // No form_ms (no JS, an old cached page) is unknown, never a bot.
  if (!isNaN(ms) && ms >= 0 && ms < CONFIG.MIN_FORM_MS) return "Sent " + ms + " ms after the first click";
  if (!r.name || !r.phone) return "No name or phone";
  return "";
}

/**
 * ALTERNATIVE path, used only when Kal has set the TURNSTILE_SECRET Script Property himself (Claude never
 * types a secret into a browser field). Without it every direct post is "direct": saved, emailed, unverified.
 * Needs the script.external_request scope in appsscript.json, which Kal grants.
 */
function verifyDirect_(token) {
  token = String(token || "").trim();
  var secret = PropertiesService.getScriptProperties().getProperty("TURNSTILE_SECRET");
  if (!secret || !token) return "direct";
  try {
    var res = UrlFetchApp.fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "post", payload: { secret: secret, response: token }, muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return "error";
    var body = JSON.parse(res.getContentText());
    if (body.success) return "pass";
    var codes = body["error-codes"] || [];
    return codes.indexOf("internal-error") >= 0 ? "error" : "fail";
  } catch (err) {
    console.error("SITEVERIFY: " + err);
    return "error";
  }
}

/** Reasons to look twice at a lead. Labels only: a flagged lead is saved and emailed with "Check:". */
function qualityFlags_(r) {
  var why = [];
  var msg = String(r.message || "").trim();
  var m = OFF_TOPIC.exec(msg);
  if (m) why.push('Message mentions "' + m[0] + '"');
  else if (msg.length >= 3 && !ON_TOPIC.test(msg)) why.push("Message does not mention the service");
  if (!r.service) why.push("No service chosen");
  var zip = String(r.zip || "").replace(/\D/g, "").slice(0, 5);
  if (CONFIG.SERVICE_AREA_ZIP_PREFIXES.length && zip.length === 5 &&
      !CONFIG.SERVICE_AREA_ZIP_PREFIXES.some(function (z) { return zip.indexOf(z) === 0; })) {
    why.push("ZIP " + zip + " is outside the service area");
  }
  var st = String(r.state || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (CONFIG.SERVICE_AREA_STATES.length && st && CONFIG.SERVICE_AREA_STATES.indexOf(st) < 0) {
    why.push("State " + r.state + " is outside the service area");
  }
  if (CONFIG.COUNTRY && r.country && r.country !== CONFIG.COUNTRY) why.push("Sent from outside " + CONFIG.COUNTRY + " (" + r.country + ")");
  var ref = String(r.referrer || "").toLowerCase();
  if (ref.indexOf("doubleclick.net") >= 0 || (/[?&]network=x\b/.test(r.page_url) && ref && ref.indexOf(CONFIG.SITE_URL.replace(/^https?:\/\/(www\.)?/, "")) < 0 &&
      !/^https?:\/\/(www\.)?(google|bing|yahoo|duckduckgo)\./.test(ref))) {
    why.push("Came from a Display placement (" + ref.replace(/^https?:\/\//, "").split("/")[0] + ")");
  }
  // A spam check that did not run (ad blocker, old page) is shown in the email but is not a reason to doubt a lead.
  return why;
}

function leadHeader_() {
  return ["Received"].concat(FIELDS.map(function (f) { return f.label; }));
}

function leadRow_(r) {
  return [r.received].concat(FIELDS.map(function (f) {
    if (f.key === "service") return SERVICES[r.service] || r.service;
    if (f.key === "turnstile") return TURNSTILE_LABELS[r.turnstile] || r.turnstile;
    return r[f.key];
  }));
}

/** Blocked tab: same columns, Quality "Blocked" and the reason. Never emailed; kept so a real person can be found again. */
function block_(r, reason) {
  r.quality = "Blocked";
  r.quality_reason = reason;
  try { sheet_(CONFIG.BLOCKED_NAME, leadHeader_()).appendRow(leadRow_(r)); } catch (err) { console.error("BLOCK LOG FAILED: " + err); }
}

function book_() {
  var props = PropertiesService.getScriptProperties();
  var id = CONFIG.SHEET_ID || props.getProperty("SHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.create(CONFIG.SHEET_TITLE);
  ss.setSpreadsheetTimeZone(CONFIG.TIME_ZONE);
  props.setProperty("SHEET_ID", ss.getId());
  ss.getSheets()[0].setName(CONFIG.SHEET_NAME);
  return ss;
}

function sheet_(name, header) {
  var ss = book_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name, ss.getSheets().length); // at the end: the Ads import tab stays first
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 150);
  }
  syncHeader_(sh, header);
  return sh;
}

/** Writes headings for any column not yet in row 1, so an existing sheet needs no manual edit. Append only. */
function syncHeader_(sh, wanted) {
  var have = sh.getLastColumn();
  if (have >= wanted.length) return;
  sh.getRange(1, have + 1, 1, wanted.length - have).setValues([wanted.slice(have)])
    .setFontWeight("bold").setBackground(CONFIG.BRAND.primary).setFontColor("#ffffff");
}

function digits_(s) { return String(s || "").replace(/\D/g, ""); }

/** (555) 123-4567 for a North American number; anything else as typed. */
function formatPhone_(s) {
  var d = digits_(s);
  if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
  if (d.length !== 10) return String(s || "");
  return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
}

function telHref_(s) {
  var d = digits_(s);
  if (d.length === 10) d = "1" + d;
  return "+" + d;
}

function esc_(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function button_(href, label, bg, fg) {
  return '<td style="padding:0 8px 8px 0"><a href="' + esc_(href) + '" style="display:inline-block;padding:12px 20px;border-radius:6px;' +
    "background:" + bg + ";color:" + fg + ';font:600 15px Arial,Helvetica,sans-serif;text-decoration:none">' + esc_(label) + "</a></td>";
}

function row_(label, value) {
  if (!value) return "";
  return '<tr><td style="padding:8px 12px 8px 0;color:' + CONFIG.BRAND.muted + ';font:13px Arial,Helvetica,sans-serif;vertical-align:top;white-space:nowrap">' +
    esc_(label) + '</td><td style="padding:8px 0;color:' + CONFIG.BRAND.ink + ';font:15px Arial,Helvetica,sans-serif;vertical-align:top">' +
    esc_(value).replace(/\n/g, "<br>") + "</td></tr>";
}

function notify_(r) {
  if (!CONFIG.NOTIFY_TO) return;
  var B = CONFIG.BRAND;
  var service = SERVICES[r.service] || r.service || "Inquiry";
  var phone = formatPhone_(r.phone);
  var who = (r.name + " " + r.lastname).trim();
  var flagged = r.quality === "Check";
  var check = flagged ? "Check: " : "";
  var spam = TURNSTILE_LABELS[r.turnstile] || r.turnstile;
  var when = Utilities.formatDate(r.received, CONFIG.TIME_ZONE, "EEE, MMM d, yyyy 'at' h:mm a z");
  var validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email);

  var buttons = button_("tel:" + telHref_(r.phone), "Call " + phone, B.primary, "#ffffff") +
    button_("sms:" + telHref_(r.phone), "Text", B.accent, B.ink) +
    (validEmail ? button_("mailto:" + r.email, "Email", B.panel, B.ink) : "");

  var details = "";
  FIELDS.forEach(function (f) {
    if (DERIVED[f.key] || /^(gclid|gbraid|wbraid|landing_page|page_url|referrer|source|lang)$/.test(f.key)) return;
    details += row_(f.label, f.key === "service" ? service : f.key === "phone" ? phone : r[f.key]);
  });
  var origin = row_("Page", r.page_url) + row_("Landing page", r.landing_page) + row_("Source", r.ad_source) +
    row_("Referrer", r.referrer) + row_("gclid", r.gclid) + row_("gbraid", r.gbraid) + row_("wbraid", r.wbraid) +
    row_("Form", r.source) + row_("Country", r.country) + row_("Spam check", spam) + row_("Quality", flagged ? r.quality_reason : r.quality);

  var html =
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + B.panel + ';padding:24px 0">' +
    '<tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px">' +
    '<tr><td style="background:' + B.primary + ';padding:20px 24px;border-radius:8px 8px 0 0"><img src="' + esc_(CONFIG.LOGO_URL) +
    '" alt="' + esc_(CONFIG.SITE_NAME) + '" width="180" style="display:block;max-width:180px;height:auto;border:0"></td></tr>' +
    (flagged ? '<tr><td style="padding:16px 24px 0"><div style="background:#fff4e5;border-left:4px solid ' + B.accent +
      ';padding:10px 12px;font:14px Arial,Helvetica,sans-serif;color:' + B.ink + '"><b>Check this one:</b> ' + esc_(r.quality_reason) + "</div></td></tr>" : "") +
    '<tr><td style="padding:20px 24px 4px;font:700 20px Arial,Helvetica,sans-serif;color:' + B.ink + '">New request: ' + esc_(service) + "</td></tr>" +
    '<tr><td style="padding:0 24px 16px;font:14px Arial,Helvetica,sans-serif;color:' + B.muted + '">' + esc_(who) + ", " + esc_(when) + "</td></tr>" +
    '<tr><td style="padding:0 24px 8px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>' + buttons + "</tr></table></td></tr>" +
    '<tr><td style="padding:8px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + details + "</table></td></tr>" +
    '<tr><td style="padding:16px 24px 4px;font:700 15px Arial,Helvetica,sans-serif;color:' + B.ink + '">Where it came from</td></tr>' +
    '<tr><td style="padding:0 24px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + origin + "</table></td></tr>" +
    "</table></td></tr></table>";

  var text = ["New website request: " + service, "", "Name: " + who, "Phone: " + phone];
  if (r.email) text.push("Email: " + r.email);
  if (r.event_date) text.push("Event date: " + r.event_date);
  if (r.message) text.push("Message: " + r.message);
  if (r.inquiry_items && r.inquiry_items !== "No rental items added.") text.push("Rental items:\n" + r.inquiry_items);
  text.push("", "Where it came from", "Page: " + r.page_url, "Source: " + r.ad_source);
  if (r.gclid) text.push("gclid: " + r.gclid);
  text.push("Spam check: " + spam);
  if (flagged) text.push("PLEASE CHECK: " + r.quality_reason);
  text.push("Received " + when);

  var opts = {
    to: CONFIG.NOTIFY_TO,
    subject: check + "New website request: " + who + " (" + service + ")",
    body: text.join("\n"),
    htmlBody: html,
    name: CONFIG.SITE_NAME + " website"
  };
  if (validEmail) opts.replyTo = r.email;
  MailApp.sendEmail(opts);
}

/** Run once from the editor: authorises the script, creates the Leads and Blocked tabs. Sends no email. */
function setup() {
  var sh = sheet_(CONFIG.SHEET_NAME, leadHeader_());
  sheet_(CONFIG.BLOCKED_NAME, leadHeader_());
  Logger.log("Sheet: " + sh.getParent().getUrl());
}
