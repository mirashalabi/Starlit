# Starlit Events & Photography

The website for **starlit-events.com**: events, photography and rentals in Ottawa, Montreal and Toronto.

Built by [Render Analytics](https://renderanalytics.net/) with [Astro](https://astro.build/). Every push to `main` rebuilds the site and publishes it to GitHub Pages at https://starlit-events.com.

## Where things are

| Folder | What it is |
|---|---|
| `src/pages/` | One file per page (home, events, photography, rentals, FAQ, contact, Christmas and Easter pages) |
| `src/config/site.ts` | Business details: phone, email, hours, social links, testimonials and Google reviews |
| `src/config/occasions.ts` | The Christmas and Easter pages' text |
| `src/data/` | Events, photography and rentals (pulled from the Google Sheet with `npm run data`) |
| `src/assets/photos/` | All website photos |
| `public/` | Files served as-is (icons, fonts, video, the `CNAME` for the domain) |
| `backend/Code.gs` | The Google Apps Script that saves contact form inquiries to a Google Sheet and emails info@starlit-events.com |
| `workers/` | Two small Cloudflare services run by Render Analytics: the contact form spam check and the Instagram feed |
| `archive/old-site/` | The previous website, kept for reference. It is not published |

## Common changes

- **Phone, email, hours, reviews:** edit `src/config/site.ts`.
- **Add a Google review to the carousel:** add a line to `googleReviews` in `src/config/site.ts`.
- **Rentals, events, photography prices:** update the Google Sheet, then run `npm run data` and commit.
- **Instagram:** the home page shows the 6 latest @starlit.event posts on its own. To replace the access token, see [docs/INSTAGRAM.md](docs/INSTAGRAM.md).

Commit to `main` and the site updates in about 3 minutes. Check progress in the **Actions** tab.

## Work on it locally

```bash
npm ci
npm run dev
```

Then open http://localhost:4321.

## Hosting

- **Domain:** registered at GoDaddy. Its DNS points to GitHub Pages, so no DNS changes are needed.
- **Hosting:** GitHub Pages, built by `.github/workflows/deploy.yml`.
- **Contact form:** browser, then the spam check (Cloudflare Turnstile), then Apps Script, then the Google Sheet plus an email to info@starlit-events.com.
- **Analytics:** Google Tag Manager `GTM-PQQBCX5D`.

`public/_headers`, `public/_redirects`, `functions/` and `wrangler.toml` are used only by the Cloudflare Pages preview copy at starlit-events.pages.dev. GitHub Pages ignores them. The old `.html` addresses (`/events.html` and so on) forward to the new pages through small files in `public/`.
