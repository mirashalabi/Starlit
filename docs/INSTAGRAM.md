# Instagram photos on the Starlit website

The "Follow Starlit" section on the home page shows the 6 latest posts from **@starlit.event**. Each photo opens its post on Instagram.

## How it works

- A small Cloudflare service called **starlit-instagram** checks Instagram every 6 hours.
- It uses a Meta access token, the **Starlit Events System User** token from Meta Business Suite.
- The token is stored encrypted in Cloudflare. It is not in GitHub, the website code, or any document.
- If Instagram or the token ever stops working, the website keeps showing the last posts it fetched, or Starlit's own event photos. Nothing breaks.

To check the feed, open https://starlit-instagram.renderanalytics.workers.dev/status

- `"ok": true` means it is working.
- `"ok": false` with an `error` means the token needs replacing. Follow the steps below.

## Replacing the token (Mira)

You only need this if the status page shows an error, or if you remove the system user in Meta.

### 1. Make a new token in Meta

1. Go to **business.facebook.com** and open **Settings** (the gear icon), then **Business settings**.
2. Go to **Users → System users** and click **Starlit Events System User**.
3. Check that the user is assigned to @starlit.event: click **Assign assets → Instagram accounts**, tick **@starlit.event**, and allow **View content**.
4. Click **Generate new token**.
   - Pick the Starlit app.
   - Token expiration: **Never**.
   - Permission: tick **instagram_basic** only. The website only reads posts, so do not tick publishing or messaging permissions.
5. Copy the token. It starts with `EAA`.

Never paste the token into email, text messages, a shared document, or anywhere on GitHub. Anyone who has it can read the account.

### 2. Put the new token in Cloudflare

If you have access to the Cloudflare account:

1. Log in at **dash.cloudflare.com** and open **Workers & Pages → starlit-instagram**.
2. Go to **Settings → Variables and Secrets**.
3. Next to **IG_TOKEN**, click **Edit** (or the pencil icon), paste the new token and click **Deploy**.

If you do not have Cloudflare access, send the token to Render Analytics through a password manager share (1Password or Bitwarden "Send") that expires after one view. Render Analytics will put it in.

### 3. Check it

The website picks up new posts at its next check, within 6 hours. After that, https://starlit-instagram.renderanalytics.workers.dev/status shows `"ok": true`.

## For developers

- Code: `workers/instagram-feed/`. Deploy with `npx wrangler deploy` from that folder (Cloudflare account dc8bcb7c350debb7d40bb15b6504ad01).
- Secret: `npx wrangler secret put IG_TOKEN`
- `IG_USER_ID` in `wrangler.jsonc` is the Instagram professional account ID. Find it in Business settings → Accounts → Instagram accounts → @starlit.event.
- `GET /refresh?key=<first 12 hex characters of sha256(IG_TOKEN)>` updates the feed right away.
- Meta omits `media_url` for videos with licensed audio (changelog, July 30 2026). The Worker then uses `thumbnail_url`, or skips the post if there is no picture at all.
