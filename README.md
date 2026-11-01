# Liams Portfolio

Liam Dunstan's portfolio: one page laid out like a screenplay, plus pages for reviews, film lists and notes on film.

- **Astro 7**: every page is pre-rendered to static HTML. Public pages ship about 1 KB of JavaScript.
- **Keystatic CMS** at `/admin` (redirects to `/keystatic`, where the editor runs): content lives in this repo as YAML/Markdoc files, so there's no database or CMS subscription.
- **Vercel** hosting: static pages on the CDN. Only the CMS and the Letterboxd block run as functions.

## Editing content

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:4321/admin>. Locally, saving writes straight to the files in `src/content/`.

| CMS section | What it controls |
| --- | --- |
| **Home page** | The blocks on the page, in order. Add, remove and drag to reorder. |
| **Work** | Projects: title, year, role, description, YouTube/Vimeo video, still, optional preview loop, link. |
| **Reviews** | Film reviews: rating, watched date, rewatch/liked, tags, poster, text. Listed at `/reviews` with search and filters, plus a page each at `/reviews/<slug>`. |
| **Film lists** | Lists with intro text and images, films in order with optional notes. A page each at `/lists/<slug>`. |
| **Notes on film** | Blog posts. Each one gets its own page at `/notes/<slug>`. |
| **Site settings** | Name, role, email, location, links, search description, and the switch for the reviews pages. |

### Home page blocks

| Block | Notes |
| --- | --- |
| Script | Lines of screenplay: scene heading, action, character, parenthetical, dialogue, transition, centered. The first script with "Type out on load" ticked types itself out once per visit. |
| Recently watched | Latest films from a public Letterboxd account. Hidden on the live site while the username is empty. |
| Work | Chosen projects in the order picked, or all projects (newest first). Options: columns (1–4), image shape (widescreen, scope, 4:3, square, portrait, poster), width (script column, wide, full), captions, and video previews (hover, autoplay, off). |
| Reviews | The latest reviews as posters or a list, linking to `/reviews`. |
| Film list | The first few films of a chosen list, linking to the full list. |
| Notes on film | List of notes, optionally limited. |
| Text | A heading and paragraphs. |
| Contact | Email, location and links from Site settings. |

Every block also has **Transition before** (`CUT TO:`, `DISSOLVE TO:`, `SMASH CUT TO:`, … or none), printed right-aligned above it, and a **Hide** switch to take it off the page without deleting it. The **Ending** setting below the blocks controls the closing `FADE OUT.` and `THE END`.

Scene numbers are worked out automatically. A block that's hidden or has nothing to show is skipped, along with its transition.

The name on the title page always comes first, so the page always has its `<h1>`.

On phones, grids drop to two columns (one for landscape images) whatever the block is set to.

### Videos

Paste a YouTube or Vimeo link into a project's **Video** field. The still gets a Play label, and clicking it opens the video in a full-screen overlay. The YouTube/Vimeo player only loads at that moment, so videos don't slow the page down. YouTube videos without an uploaded still use the YouTube thumbnail.

A **Preview loop** is an optional short, silent MP4 that plays inside the tile (on hover, or when scrolled into view, depending on the block). Keep it to a few seconds and under about 8 MB, since it's stored in the repo. Visitors with reduced motion turned on never see loops play.

### Film posters (TMDB)

Reviews and lists get posters from [TMDB](https://www.themoviedb.org/)'s official API at build time. Without a key, films show as typed title cards instead.

1. Create a free account at themoviedb.org and request an API key under **Settings → API**.
2. Add it as `TMDB_API_KEY` in Vercel's environment variables (and in a local `.env` to see posters in dev). Either the v3 API key or the v4 read access token works.

If the wrong poster appears, put the film's TMDB ID (the number in its themoviedb.org address) in the **TMDB ID** field. An uploaded poster on a review always takes priority. The footer credits TMDB whenever the key is set, as TMDB's terms require.

### Importing a Letterboxd list

Letterboxd doesn't allow other sites to pull lists automatically, but it does let you export them:

1. On Letterboxd, export the list as CSV (from the list's own page, or **Settings → Import & Export → Export your data**, which includes every list).
2. In the CMS, create a **Film list** and upload the CSV to **Letterboxd export (CSV)**.

The films come through in order, with any notes written on Letterboxd. To add or change a note, add the film under **Films** with the same title and year: notes there win over the CSV. To update the list later, export again and replace the file. Without a CSV, the **Films** field is the whole list.

### Recently watched

The Recently watched block uses Liam's public Letterboxd RSS feed, which Letterboxd provides for this kind of use. It shows the latest diary entries and refreshes hourly without a rebuild.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo. The defaults are correct (framework: Astro, build: `npm run build`).
3. Once a custom domain is attached, set `SITE_URL` (e.g. `https://liamdunstan.com`) in **Project → Settings → Environment Variables** and redeploy. This sets canonical URLs, the sitemap and social preview images. Until then, the `*.vercel.app` production domain is used.

### Letting Liam edit the live site

In production, Keystatic saves by committing to GitHub. Each commit triggers a Vercel rebuild, and the change is live in about a minute. There is no separate password: Liam signs in with his GitHub account, which needs write access to the repo. Until `PUBLIC_KEYSTATIC_GITHUB_REPO` is set, `/admin` and `/keystatic` return 404 on the live site.

1. Add `PUBLIC_KEYSTATIC_GITHUB_REPO=owner/repo-name` to a local `.env`, run `npm run dev` and open `/admin`.
2. Follow the prompt to create the Keystatic GitHub App. It writes `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` and `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` into `.env`.
3. Copy all five variables into Vercel's environment variables and redeploy.
4. In the GitHub App settings, add `https://<your-domain>/api/keystatic/github/oauth/callback` as a callback URL.
5. Liam signs in at `https://<your-domain>/admin` with a GitHub account that has write access to the repo.

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
