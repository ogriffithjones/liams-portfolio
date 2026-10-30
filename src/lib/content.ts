import { getCollection, getEntry } from 'astro:content';

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
  const notes = await getCollection('notes', ({ data }) => import.meta.env.DEV || !data.draft);
  return notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export const formatDate = (date: Date) =>
  date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
