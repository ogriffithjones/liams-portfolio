// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';

// Canonical URL used for sitemap, canonical links and Open Graph tags.
// Set SITE_URL in Vercel once a custom domain is attached; until then the
// Vercel production domain is used.
const site =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:4321');

export default defineConfig({
  site,
  // Every page is pre-rendered to static HTML. Only the Keystatic admin
  // (/keystatic, /api/keystatic) and the cached Letterboxd island run as
  // serverless functions.
  output: 'static',
  // Downloaded at build time and served from this domain.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Courier Prime',
      cssVariable: '--font-script',
      weights: [400, 700],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Courier New', 'monospace'],
    },
  ],
  adapter: vercel(),
  trailingSlash: 'never',
  build: { inlineStylesheets: 'always' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  image: {
    responsiveStyles: true,
    layout: 'constrained',
  },
  integrations: [
    react(),
    markdoc(),
    keystatic(),
    sitemap({ filter: (page) => !page.includes('/keystatic') }),
  ],
});
