# Starlit launch day (when starlit-events.com points at Cloudflare Pages)

1. Attach `starlit-events.com` and `www.starlit-events.com` to the Pages project `starlit-events` (www 301s to the apex).
2. Build production: `PUBLIC_SITE_URL=https://starlit-events.com npm run build`, then
   `staging_guard.py dist --expect production --base https://starlit-events.com` (0 fail), then
   `npx wrangler pages deploy dist --project-name starlit-events --branch main`.
3. Prove live with `deploy_verify.py --url https://starlit-events.com --marker <new asset> --all-assets`.
4. Old URLs: `/events.html`, `/rentals.html`, `/photography.html`, `/contact.html`, `/index.html` must 301 (public/_redirects).
5. Google Search Console: Domain property for starlit-events.com, submit `https://starlit-events.com/sitemap.xml` (feeds Google Search, AI Overviews and Gemini).
6. Bing Webmaster Tools: import from Search Console, submit the sitemap (Bing's index feeds ChatGPT search and Copilot).
7. IndexNow ping (key file `/152c1bf301361f14378669bfebcb742e.txt` is already deployed):
   `curl "https://api.indexnow.org/indexnow?url=https://starlit-events.com/&key=152c1bf301361f14378669bfebcb742e"`
8. Lead form: one TEST lead from the live domain; Turnstile widget domains already include starlit-events.com and www.
9. Formspree: the friend can close the old form once the new site is live.
10. Rerun SEO Forge Mode 1 on https://starlit-events.com and keep that audit as the drift baseline.
