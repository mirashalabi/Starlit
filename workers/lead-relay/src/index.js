// TEMPLATE (seo-forge references/lead-forms-and-spam.md). Copy to <site repo>/workers/lead-relay/src/index.js.
/**
 * Lead relay.
 *
 * Browser form  ->  this Worker  ->  Apps Script (sheet row first, then the branded email)
 *
 * The Worker checks the Cloudflare Turnstile token with the secret only it holds (wrangler secret
 * TURNSTILE_SECRET), adds turnstile = pass | fail | missing | error, via=worker and the visitor's country,
 * and forwards the lead to APPS_SCRIPT_URL (a second wrangler secret). It never drops a lead itself: the
 * Apps Script files a "fail" in the Blocked tab and saves and emails everything else.
 *
 * GOVERNING RULE: losing one real lead costs more than ten junk ones. A missing token (ad blocker, the
 * Turnstile script failed to load, an old cached page) or a Cloudflare outage is passed on as missing or
 * error and still reaches the inbox, marked unverified.
 *
 * The reply is JSON with CORS, so the browser knows the lead landed. If this Worker is unreachable the
 * front end posts straight to the Apps Script /exec (no-cors), and the script marks it "direct post".
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export default {
  async fetch(request, env) {
    const previewRe = env.PREVIEW_HOST_RE ? new RegExp(env.PREVIEW_HOST_RE) : null;
    const isPreview = (host) => !!(previewRe && host && previewRe.test(host));
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    try { if (origin && isPreview(new URL(origin).hostname)) allowed.push(origin); } catch { /* not a URL */ }
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    const reply = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method === "GET") return reply({ ok: true, service: "lead-relay" });
    if (request.method !== "POST") return reply({ ok: false }, 405);
    if (origin && !allowed.includes(origin)) return reply({ ok: false, message: "origin not allowed" }, 403);

    let form;
    try {
      form = await request.formData();
    } catch {
      return reply({ ok: false, message: "bad request" }, 400);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "";
    const token = String(form.get("cf-turnstile-response") || "").trim();
    form.delete("cf-turnstile-response");

    let turnstile = "missing";
    let detail = "";
    if (token) {
      try {
        const body = new FormData();
        body.set("secret", env.TURNSTILE_SECRET);
        body.set("response", token);
        if (ip) body.set("remoteip", ip);
        const res = await fetch(VERIFY_URL, { method: "POST", body });
        const out = await res.json();
        const hosts = (env.ALLOWED_HOSTNAMES || "").split(",").map((s) => s.trim());
        if (out.success && (!out.hostname || hosts.includes(out.hostname) || isPreview(out.hostname))) {
          turnstile = "pass";
        } else if (out.success) {
          turnstile = "fail";
          detail = "hostname " + out.hostname;
        } else {
          const codes = out["error-codes"] || [];
          // Cloudflare's fault or ours (internal-error, a bad or missing secret), not the visitor's: fail open.
          const ours = ["internal-error", "missing-input-secret", "invalid-input-secret"];
          turnstile = codes.length && codes.every((c) => ours.includes(c)) ? "error" : "fail";
          detail = codes.join(" ");
        }
      } catch (err) {
        turnstile = "error";
        detail = String(err).slice(0, 120);
      }
    }

    form.set("via", "worker");
    form.set("turnstile", turnstile);
    if (detail) form.set("turnstile_detail", detail);
    form.set("country", (request.cf && request.cf.country) || "");
    form.set("city", (request.cf && request.cf.city) || "");
    form.set("region", (request.cf && request.cf.region) || "");

    try {
      // Apps Script wants a urlencoded body (URLSearchParams), and answers with a 302 to
      // script.googleusercontent.com that must be fetched with GET. Multipart, or redirect "follow" (which
      // re-POSTs), gets HTTP 400 or 405 from Google. So follow the redirect by hand.
      const params = new URLSearchParams();
      for (const [k, v] of form.entries()) if (typeof v === "string") params.append(k, v);
      let res = await fetch(env.APPS_SCRIPT_URL, { method: "POST", body: params, redirect: "manual" });
      const next = res.headers.get("Location");
      if (res.status >= 300 && res.status < 400 && next) res = await fetch(next, { redirect: "follow" });
      const text = await res.text();
      let out = {};
      try { out = JSON.parse(text); } catch { out = {}; }
      if (!res.ok || out.ok === false) {
        console.error("apps script said no", res.status, text.slice(0, 200));
        return reply({ ok: false, message: "save failed" }, 502);
      }
      // A blocked token still reads as success to the browser, so a bot learns nothing.
      return reply({ ok: true });
    } catch (err) {
      console.error("apps script unreachable", String(err));
      return reply({ ok: false, message: "save failed" }, 502);
    }
  },
};
