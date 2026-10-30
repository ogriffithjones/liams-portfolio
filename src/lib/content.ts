import { getCollection, getEntry } from 'astro:content';

const published = ({ data }: { data: { draft: boolean } }) => import.meta.env.DEV || !data.draft;

export async function getSite() {
  const entry = await getEntry('site', 'index');
  if (!entry) throw new Error('Missing src/content/site/index.yaml. Fill in Site settings in the CMS.');
  return entry.data;
}

/** Work, newest year first. */
export async function getWork() {
  const work = await getCollection('work');
  return work.sort((a, b) => b.data.year - a.data.year || a.data.title.localeCompare(b.data.title));
}

/** Published notes, newest first. Drafts show in `astro dev` only. */
export async function getNotes() {
  const notes = await getCollection('notes', published);
  return notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Published reviews, most recently watched first. Empty when the reviews page is switched off. */
export async function getReviews() {
  if (!(await getSite()).reviewsPage) return [];
  const reviews = await getCollection('reviews', published);
  return reviews.sort((a, b) => b.data.watched.getTime() - a.data.watched.getTime());
}

export async function getLists() {
  return getCollection('lists', published);
}

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export const formatDate = (date: Date) =>
  date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export { stars } from './letterboxd';

/** Plain-text excerpt of a Markdoc/Markdown body, for search and listings. */
export const excerpt = (body: string | undefined, length = 220) => {
  const text = (body ?? '')
    .replace(/^#{1,6}\s.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\{%[^%]*%\}/g, '')
    .replace(/[#>*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > length ? `${text.slice(0, length).replace(/\s+\S*$/, '')}…` : text;
};
