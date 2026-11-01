// Web addresses for each section, from Site settings → Sections. Every
// internal link goes through here, so changing an address in the CMS moves
// the pages and all the links to them together.
import { getCollection } from 'astro:content';
import { getSite } from './content';

// Addresses the site or host already uses
const reserved = new Set(['admin', 'keystatic', 'api', '_astro', '_image', '_server-islands', 'media', 'robots.txt', 'ai.txt', '404', 'sitemap-index.xml', 'sitemap-0.xml']);
const valid = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const defaults = { notes: 'notes', reviews: 'reviews', lists: 'lists', work: 'work' } as const;

export interface Paths {
  notes: string;
  reviews: string;
  lists: string;
  work: string;
}

/** Section addresses, falling back to the defaults (with a build warning) if one is unusable or clashes. */
export async function getPaths(): Promise<Paths> {
  const { sections } = await getSite();
  const chosen = { notes: sections.notesPath, reviews: sections.reviewsPath, lists: sections.listsPath, work: sections.workPath };
  const used = new Set<string>();
  const out = {} as Paths;
  for (const key of Object.keys(defaults) as (keyof Paths)[]) {
    let path = chosen[key].trim().toLowerCase();
    if (!valid.test(path) || reserved.has(path) || used.has(path)) {
      console.warn(`[paths] "${path}" can't be used for ${key}; using "${defaults[key]}"`);
      path = defaults[key];
    }
    used.add(path);
    out[key] = path;
  }
  return out;
}

/** Custom pages, minus any whose address clashes with a section or the site itself. */
export async function getPages() {
  const paths = await getPaths();
  const taken = new Set([...Object.values(paths), ...reserved]);
  const pages = await getCollection('pages');
  return pages.filter((page) => {
    const ok = valid.test(page.id) && !taken.has(page.id);
    if (!ok) console.warn(`[paths] page "${page.id}" clashes with a section or reserved address and was skipped`);
    taken.add(page.id);
    return ok;
  });
}

export async function getLinks() {
  const p = await getPaths();
  return {
    notes: `/${p.notes}`,
    note: (id: string) => `/${p.notes}/${id}`,
    reviews: `/${p.reviews}`,
    review: (id: string) => `/${p.reviews}/${id}`,
    list: (id: string) => `/${p.lists}/${id}`,
    work: (id: string) => `/${p.work}/${id}`,
    page: (id: string) => `/${id}`,
  };
}
