import { defineMiddleware } from 'astro:middleware';

// Only runs for on-demand routes (the CMS); every public page is static.
// In production the editor needs Keystatic Cloud to save, so until
// PUBLIC_KEYSTATIC_CLOUD_PROJECT is set it's hidden rather than half-working.
export const onRequest = defineMiddleware((context, next) => {
  const cms = /^\/(api\/)?keystatic(\/|$)/.test(context.url.pathname);
  if (cms && import.meta.env.PROD && !import.meta.env.PUBLIC_KEYSTATIC_CLOUD_PROJECT) {
    return new Response('Not found', { status: 404 });
  }
  return next();
});
