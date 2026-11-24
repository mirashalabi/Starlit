import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

// Staging until PUBLIC_SITE_URL names the real domain (src/config/staging.ts).
const SITE = (process.env.PUBLIC_SITE_URL || 'https://starlit-events.pages.dev').replace(/\/$/, '');

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  image: { responsiveStyles: false },
  vite: { resolve: { alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) } } },
});
