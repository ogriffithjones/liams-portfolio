import { defineMiddleware } from 'astro:middleware';

// Only runs for on-demand routes (the CMS); every public page is static.
// In production the editor needs GitHub storage to save, so until
// PUBLIC_KEYSTATIC_GITHUB_REPO is set it's hidden rather than half-working.
export const onRequest = defineMiddleware((context, next) => {
  const cms = /^\/(api\/)?keystatic(\/|$)/.test(context.url.pathname);
  if (cms && import.meta.env.PROD && !import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO) {
    return new Response('Not found', { status: 404 });
  }
  return next();
});
