# Liams Portfolio

Liam Dunstan's portfolio. Astro + Keystatic, hosted on Vercel.

## Editing

Go to **/admin** on the live site and sign in with GitHub. Saving publishes in about a minute.

## Local

```bash
npm install
npm run dev
```

Editor at http://127.0.0.1:4321/admin. Leave `PUBLIC_KEYSTATIC_GITHUB_REPO` out of `.env` to edit local files instead of GitHub.

## Environment variables

See `.env.example`. Set in Vercel:

- `PUBLIC_KEYSTATIC_GITHUB_REPO`, `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`: the editor's GitHub sign-in
- `TMDB_API_KEY`: film posters (optional)
- `SITE_URL`: once a custom domain is attached (optional)
