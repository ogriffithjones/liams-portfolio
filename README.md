# Liams Portfolio

Liam Dunstan's portfolio: one page laid out like a screenplay, plus a page for each note on film.

- **Astro 7**: every page is pre-rendered to static HTML. Public pages ship about 1 KB of JavaScript.
- **Keystatic CMS** at `/keystatic`: content lives in this repo as YAML/Markdoc files, so there's no database or CMS subscription.
- **Vercel** hosting: static pages on the CDN. Only the CMS and the Letterboxd block run as functions.

## Editing content

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:4321/keystatic>. Locally, saving writes straight to the files in `src/content/`.

| CMS section | What it controls |
| --- | --- |
| **Home page** | The blocks on the page, in order. Add, remove and drag to reorder. |
| **Work** | Projects: title, year, role, description, link, still. |
| **Notes on film** | Blog posts. Each one gets its own page at `/notes/<slug>`. |
| **Site settings** | Name, role, email, location, links, search description. |

### Home page blocks

| Block | Notes |
| --- | --- |
| Script | Lines of screenplay: scene heading, action, character, parenthetical, dialogue, transition, centered. The first script with "Type out on load" ticked types itself out once per visit. |
| Transition | `CUT TO:`, `DISSOLVE TO:`, `FADE OUT.`, etc. Right-aligned. |
| Recently watched | Latest films from a public Letterboxd account. Hidden on the live site while the username is empty. |
| Work | Shows chosen projects in the order picked, or all projects (newest first) if none are chosen. |
| Notes on film | List of notes, optionally limited. |
| Text | A heading and paragraphs. |
| Contact | Email, location and links from Site settings. |

Scene numbers are worked out automatically. A block with nothing to show is skipped, along with the transition leading into it.

The name on the title page always comes first, so the page always has its `<h1>`.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo. The defaults are correct (framework: Astro, build: `npm run build`).
3. Once a custom domain is attached, set `SITE_URL` (e.g. `https://liamdunstan.com`) in **Project → Settings → Environment Variables** and redeploy. This sets canonical URLs, the sitemap and social preview images. Until then, the `*.vercel.app` production domain is used.

### Letting Liam edit the live site

In production, Keystatic saves by committing to GitHub. Each commit triggers a Vercel rebuild, and the change is live in about a minute.

1. Add `PUBLIC_KEYSTATIC_GITHUB_REPO=owner/repo-name` to a local `.env`, run `npm run dev` and open `/keystatic`.
2. Follow the prompt to create the Keystatic GitHub App. It writes `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` and `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` into `.env`.
3. Copy all five variables into Vercel's environment variables and redeploy.
4. In the GitHub App settings, add `https://<your-domain>/api/keystatic/github/oauth/callback` as a callback URL.
5. Liam signs in at `https://<your-domain>/keystatic` with a GitHub account that has write access to the repo.

`.env.example` lists every variable.

## Speed and search

- Static HTML with styles inlined, so there's no render-blocking CSS request.
- Courier Prime is downloaded at build time and served from the site's own domain, with the two main weights preloaded.
- Images are resized to WebP at several widths at build time. Space is reserved for them, so nothing shifts as they load.
- The typing effect only hides text visually. The full script is in the HTML for search engines, screen readers and visitors without JavaScript, and it's skipped for anyone with reduced motion turned on.
- Sitemap at `/sitemap-index.xml`, `robots.txt`, canonical URLs, Open Graph tags, and JSON-LD (`Person` on the home page, `BlogPosting` on notes).
- The Letterboxd block is a server island: the page stays static, and the film list is fetched separately and cached at Vercel's edge for an hour.

## Project layout

```
keystatic.config.ts        CMS fields (keep in sync with src/content.config.ts)
src/content.config.ts      Content schemas Astro validates at build time
src/content/               All content (edited by the CMS)
src/assets/                Images uploaded through the CMS
src/pages/index.astro      The one main page: title + blocks
src/pages/notes/[slug]     A page per note
src/components/blocks/     One component per block type
src/components/Typewriter  The typing effect
src/styles/global.css      Screenplay formatting
```
