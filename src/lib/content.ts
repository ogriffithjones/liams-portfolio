import { getCollection, getEntry } from 'astro:content';
import { defaultTheme } from './themes';

const published = ({ data }: { data: { draft: boolean } }) => import.meta.env.DEV || !data.draft;

/**
 * All settings as one object: Profile, plus Theme, Navigation and Advanced
 * (each its own page in the editor). Empty or missing values use defaults.
 */
export async function getSite() {
  const [profile, theme, navigation, advanced] = await Promise.all([
    getEntry('site', 'index'),
    getEntry('theme', 'index'),
    getEntry('navigation', 'index'),
    getEntry('advanced', 'index'),
  ]);
  if (!profile) throw new Error('Missing src/content/site/index.yaml. Fill in Settings → Profile in the CMS.');
  const a = advanced?.data;
  const or = (value: string | undefined, fallback: string) => value?.trim() || fallback;
  return {
    ...profile.data,
    theme: theme?.data ?? defaultTheme,
    nav: navigation?.data ?? { show: false, items: [] },
    writingPage: a?.writingPage ?? true,
    sections: {
      writingLabel: or(a?.writingLabel, 'Writing'),
      writingPath: or(a?.writingPath, 'writing'),
      listsPath: or(a?.listsPath, 'lists'),
      workPath: or(a?.workPath, 'work'),
    },
  };
}

/** Work, newest year first. */
export async function getWork() {
  const work = await getCollection('work');
  return work.sort((a, b) => b.data.year - a.data.year || a.data.title.localeCompare(b.data.title));
}

/**
 * Published writing (reviews and opinion pieces), newest first. Empty when
 * Writing is switched off in Site settings. Drafts show in `astro dev` only.
 */
export async function getWriting(kind?: 'review' | 'opinion') {
  if (!(await getSite()).writingPage) return [];
  const writing = await getCollection('writing', published);
  return writing
    .filter((w) => !kind || w.data.kind.discriminant === kind)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
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
