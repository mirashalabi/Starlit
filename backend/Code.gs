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
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "device", label: "Device" },
  { key: "first_referrer", label: "Came from site" },
  { key: "utm_source", label: "UTM source" },
  { key: "utm_medium", label: "UTM medium" },
  { key: "utm_campaign", label: "UTM campaign" },
  { key: "utm_term", label: "UTM term" },
  { key: "utm_content", label: "UTM content" },
  { key: "fbclid", label: "fbclid" },
  { key: "msclkid", label: "msclkid" },
  { key: "first_visit", label: "First visit" },
  { key: "pages_viewed", label: "Pages viewed" }
];
// Filled here (or by the Worker), never trusted from the browser.
var DERIVED = { ad_source: true, quality: true, quality_reason: true, turnstile: true, country: true, city: true };

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
  if (p.via === "worker") {
    // Only the Worker may say what Turnstile decided.
    r.turnstile = TURNSTILE_LABELS[p.turnstile] && p.turnstile !== "direct" ? p.turnstile : "missing";
    r.country = String(p.country || "").slice(0, 2).toUpperCase();
    r.city = [p.city, p.region].filter(Boolean).join(", ").slice(0, 80);
  } else {
    r.turnstile = verifyDirect_(p["cf-turnstile-response"]);
  }
  r.ad_source = channel_(r);
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
  // Under 25 characters ("hi", "call me") is just a short message from a real person, not a reason to doubt them.
  else if (msg.length >= 25 && !ON_TOPIC.test(msg)) why.push("Message does not mention the service");
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

/**
 * How the visitor found the site, in plain words. Ad click ids first, then UTM tags, then the outside site
 * that sent them (first touch, kept 90 days by the site), then "Typed the address or a bookmark".
 */
function channel_(r) {
  var src = String(r.utm_source || "").toLowerCase();
  var med = String(r.utm_medium || "").toLowerCase();
  var ref = String(r.first_referrer || "").toLowerCase().replace(/^https?:\/\/(www\.|m\.|l\.|lm\.)?/, "");
  if (r.gclid || r.gbraid || r.wbraid) return "Google Ads";
  if (r.msclkid) return "Microsoft (Bing) Ads";
  if (r.fbclid && /(cpc|paid|ads?)$/.test(med)) return "Facebook or Instagram ad";
  if (/gbp|gmb|business|maps/.test(src + med)) return "Google Business Profile";
  if (src) {
    var name = src.charAt(0).toUpperCase() + src.slice(1);
    return name + (/(cpc|paid|ads?)$/.test(med) ? " ad" : med ? " (" + med + ")" : "");
  }
  if (/^instagram\./.test(ref)) return "Instagram";
  if (/^(facebook|fb)\./.test(ref) || r.fbclid) return "Facebook";
  if (/^maps\.google|google\.[a-z.]+\/maps/.test(ref)) return "Google Maps";
  if (/^google\./.test(ref)) return "Google search";
  if (/^bing\./.test(ref)) return "Bing search";
  if (/^(duckduckgo|search\.yahoo|yahoo|ecosia)\./.test(ref)) return "Web search";
  if (/^(chatgpt\.com|chat\.openai|perplexity|claude\.ai|gemini\.google|copilot)/.test(ref)) return "AI assistant (" + ref.split("/")[0] + ")";
  if (/^(tiktok|pinterest|x\.com|t\.co|linkedin|youtube|reddit)/.test(ref)) return ref.split("/")[0];
  if (ref) return "Link on " + ref.split("/")[0];
  return "Typed the address or a bookmark";
}

/** The Starlit logo (white, 240x129) sent inside the email, so it shows even when remote images are off. */
var LOGO_B64 = "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";

function short_(url) {
  return String(url || "").replace(/^https?:\/\/(www\.)?/, "").split("?")[0].replace(/\/$/, "") || "";
}

function notify_(r) {
  if (!CONFIG.NOTIFY_TO) return;
  var C = { ink: "#15120e", gold: "#e6c068", goldDeep: "#b8913a", text: "#2a241d", muted: "#6f6559", cream: "#f8f3ea", line: "#ece3d3", white: "#ffffff" };
  var F = "Georgia,'Times New Roman',serif";
  var S = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
  var service = SERVICES[r.service] || r.service || "Inquiry";
  var phone = formatPhone_(r.phone);
  var tel = telHref_(r.phone);
  var who = (r.name + " " + r.lastname).trim();
  var flagged = r.quality === "Check";
  var spam = TURNSTILE_LABELS[r.turnstile] || r.turnstile;
  var when = Utilities.formatDate(r.received, CONFIG.TIME_ZONE, "EEE, MMM d, yyyy 'at' h:mm a z");
  var validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email);
  var eventDate = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(r.event_date)) {
    var d = r.event_date.split("-");
    eventDate = Utilities.formatDate(new Date(+d[0], +d[1] - 1, +d[2], 12), CONFIG.TIME_ZONE, "EEEE, MMMM d, yyyy");
  } else eventDate = r.event_date;
  var items = r.inquiry_items && r.inquiry_items !== "No rental items added." ? r.inquiry_items : "";

  function row(label, html) {
    if (!html) return "";
    return '<tr><td style="padding:12px 16px;border-bottom:1px solid ' + C.line + ';font:600 11px/1.4 ' + S + ';color:' + C.muted +
      ';text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;width:34%">' + esc_(label) + '</td>' +
      '<td style="padding:12px 16px;border-bottom:1px solid ' + C.line + ';font:400 15px/1.5 ' + S + ';color:' + C.text + ';vertical-align:top;word-break:break-word">' + html + '</td></tr>';
  }
  function txt(v) { return v ? esc_(v).replace(/\n/g, "<br>") : ""; }
  function link(href, label) {
    return href ? '<a href="' + esc_(href) + '" style="color:' + C.goldDeep + ';text-decoration:underline">' + esc_(label || short_(href)) + '</a>' : "";
  }
  // Full-width stacked buttons: they never squeeze their label onto two lines on a phone.
  function btn(href, label, bg, fg, border) {
    return '<tr><td style="padding:0 0 10px"><a href="' + esc_(href) + '" style="display:block;padding:15px 18px;border-radius:999px;background:' + bg +
      ';border:1.5px solid ' + border + ';color:' + fg + ';font:600 16px/1.2 ' + S + ';text-align:center;text-decoration:none;white-space:nowrap">' + esc_(label) + '</a></td></tr>';
  }
  function heading(t) {
    return '<tr><td style="padding:22px 28px 8px;font:600 11px/1 ' + S + ';color:' + C.goldDeep + ';letter-spacing:0.18em;text-transform:uppercase">' + esc_(t) + '</td></tr>';
  }
  function table(rows) {
    return rows ? '<tr><td style="padding:0 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' + rows + '</table></td></tr>' : "";
  }

  var customer =
    row("Name", txt(who)) +
    row("Phone", '<a href="tel:' + esc_(tel) + '" style="color:' + C.text + ';font-weight:600;text-decoration:none">' + esc_(phone) + '</a>') +
    row("Email", validEmail ? link("mailto:" + r.email, r.email) : txt(r.email));
  var event =
    row("Inquiry", txt(service)) +
    row("Event date", txt(eventDate)) +
    row("Rental items", txt(items));
  var tags = [r.utm_source, r.utm_medium, r.utm_campaign, r.utm_term, r.utm_content].filter(Boolean).join(" / ");
  var origin =
    row("Found us via", '<b>' + esc_(r.ad_source) + '</b>') +
    row("Came from", link(r.first_referrer)) +
    row("First page seen", link(r.landing_page)) +
    row("Sent from page", link(r.page_url)) +
    row("Page before form", r.referrer && r.referrer.split("?")[0] !== String(r.landing_page).split("?")[0] && r.referrer !== r.first_referrer ? link(r.referrer) : "") +
    row("Earlier visit", txt(r.first_visit)) +
    row("Pages viewed", txt(r.pages_viewed)) +
    row("Campaign tags", txt(tags)) +
    row("Google Ads click", txt(r.gclid || r.gbraid || r.wbraid)) +
    row("Device", txt(r.device)) +
    row("Location", txt([r.city, r.country].filter(Boolean).join(", "))) +
    row("Spam check", txt(spam)) +
    row("Form", txt(r.source));

  var preheader = who + " asked about " + service.toLowerCase() + (eventDate ? " for " + eventDate : "") + ". Call " + phone + ".";

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>New request</title></head>' +
    '<body style="margin:0;padding:0;background:' + C.cream + '">' +
    '<div style="display:none;max-height:0;overflow:hidden">' + esc_(preheader) + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.cream + '"><tr><td align="center" style="padding:20px 10px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:' + C.white + ';border-radius:18px;overflow:hidden;border:1px solid ' + C.line + '">' +
      // Header: logo and the lead's name on ink, a thin gold rule under it.
      '<tr><td style="background:' + C.ink + ';padding:26px 28px 24px">' +
        '<img src="cid:starlitlogo" width="120" height="65" alt="Starlit Events" style="display:block;border:0;width:120px;height:65px">' +
        '<div style="font:600 11px/1 ' + S + ';color:' + C.gold + ';letter-spacing:0.2em;text-transform:uppercase;margin-top:22px">New website request</div>' +
        '<div style="font:400 30px/1.2 ' + F + ';color:' + C.white + ';margin-top:10px">' + esc_(who) + '</div>' +
        '<div style="font:400 15px/1.5 ' + S + ';color:#d9cfbf;margin-top:6px">' + esc_(service) + (eventDate ? ' &middot; ' + esc_(eventDate) : '') + '</div>' +
      '</td></tr>' +
      '<tr><td style="height:4px;background:' + C.gold + ';font-size:0;line-height:0">&nbsp;</td></tr>' +
      (flagged ? '<tr><td style="padding:18px 28px 0"><div style="background:#fbf3e2;border-left:4px solid ' + C.gold + ';border-radius:6px;padding:12px 14px;font:400 14px/1.5 ' + S + ';color:' + C.text +
        '"><b>Worth a second look:</b> ' + esc_(r.quality_reason) + '</div></td></tr>' : '') +
      // Buttons, stacked.
      '<tr><td style="padding:22px 28px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
        btn("tel:" + tel, "Call " + phone, C.ink, C.white, C.ink) +
        btn("sms:" + tel, "Text " + (r.name || "them"), C.gold, C.ink, C.gold) +
        (validEmail ? btn("mailto:" + r.email + "?subject=" + encodeURIComponent("Your Starlit Events inquiry"), "Email " + (r.name || "them"), C.white, C.ink, C.ink) : "") +
      '</table></td></tr>' +
      (r.message ? heading("Their message") +
        '<tr><td style="padding:0 28px 4px"><div style="background:' + C.cream + ';border-radius:12px;padding:16px 18px;font:400 16px/1.6 ' + S + ';color:' + C.text + ';word-break:break-word">' +
        txt(r.message) + '</div></td></tr>' : '') +
      heading("The customer") + table(customer) +
      heading("The event") + table(event) +
      heading("Where it came from") + table(origin) +
      '<tr><td style="padding:22px 28px;font:400 13px/1.6 ' + S + ';color:' + C.muted + '">Received ' + esc_(when) + '. ' +
        (validEmail ? 'Reply to this email to answer ' + esc_(r.name || "them") + ' directly. ' : '') + 'Every request is also saved in the Leads sheet.</td></tr>' +
      '<tr><td style="background:' + C.ink + ';padding:16px 28px;font:400 13px/1.5 ' + S + ';color:#bfb4a3">' + esc_(CONFIG.SITE_NAME) +
        ' &middot; <a href="' + CONFIG.SITE_URL + '" style="color:' + C.gold + ';text-decoration:none">starlit-events.com</a></td></tr>' +
    '</table></td></tr></table></body></html>';

  var text = ["New website request: " + service, "", "Name: " + who, "Phone: " + phone];
  if (r.email) text.push("Email: " + r.email);
  if (eventDate) text.push("Event date: " + eventDate);
  if (r.message) text.push("", "Message:", r.message);
  if (items) text.push("", "Rental items:", items);
  text.push("", "Where it came from", "Found us via: " + r.ad_source);
  if (r.first_referrer) text.push("Came from: " + r.first_referrer);
  if (r.landing_page) text.push("First page seen: " + r.landing_page);
  text.push("Sent from page: " + r.page_url);
  if (tags) text.push("Campaign tags: " + tags);
  if (r.gclid) text.push("gclid: " + r.gclid);
  if (r.device) text.push("Device: " + r.device);
  text.push("Spam check: " + spam);
  if (flagged) text.push("Worth a second look: " + r.quality_reason);
  text.push("Received " + when);

  var opts = {
    to: CONFIG.NOTIFY_TO,
    subject: (flagged ? "Check: " : "") + "New request from " + who + " (" + service + (eventDate ? ", " + eventDate : "") + ")",
    body: text.join("\n"),
    htmlBody: html,
    inlineImages: { starlitlogo: Utilities.newBlob(Utilities.base64Decode(LOGO_B64), "image/png", "starlit-logo.png") },
    name: CONFIG.SITE_NAME + " website"
  };
  if (validEmail) opts.replyTo = r.email;
  MailApp.sendEmail(opts);
}

/** Run from the editor to see the new email in the inbox: sends one sample to NOTIFY_TO, writes nothing to the sheet. */
function previewEmail() {
  var r = { received: new Date(), name: "Sample", lastname: "Lead", phone: "6135550100", email: "sample@example.com", service: "Photography",
    event_date: "2026-12-12", message: "Hi! I'd love a family photo session in December. Do you have availability on the 12th?",
    inquiry_items: "No rental items added.", source: "Contact page", page_url: CONFIG.SITE_URL + "/contact/", referrer: CONFIG.SITE_URL + "/photography/",
    first_referrer: "https://www.instagram.com/", landing_page: CONFIG.SITE_URL + "/photography/", device: "Phone", pages_viewed: "4",
    city: "Ottawa, Ontario", country: "CA", turnstile: "pass", quality: "Looks good", quality_reason: "" };
  r.ad_source = channel_(r);
  notify_(r);
}

/** Run once from the editor: authorises the script, creates the Leads and Blocked tabs. Sends no email. */
function setup() {
  var sh = sheet_(CONFIG.SHEET_NAME, leadHeader_());
  sheet_(CONFIG.BLOCKED_NAME, leadHeader_());
  Logger.log("Sheet: " + sh.getParent().getUrl());
}
