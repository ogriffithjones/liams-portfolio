import type { CollectionEntry } from 'astro:content';
import type { FilmItem } from '../components/Films.astro';
import { excerpt, formatDate, isoDate, stars } from './content';
import { getPoster } from './tmdb';
import { getLinks } from './paths';

type Review = CollectionEntry<'reviews'>;

export const reviewMeta = ({ data }: Review) =>
  [data.rating ? stars(data.rating) : '', data.liked ? '♥' : '', formatDate(data.watched), data.rewatch ? 'rewatch' : '']
    .filter(Boolean)
    .join(' · ');

export const reviewPoster = async ({ data }: Review) =>
  data.poster ?? (await getPoster({ title: data.title, year: data.year, tmdbId: data.tmdbId }));

/** Reviews as film items, with the data the /reviews filters search and sort on. */
export async function reviewItems(reviews: Review[], { withExcerpt = false } = {}): Promise<FilmItem[]> {
  const links = await getLinks();
  return Promise.all(
    reviews.map(async (review) => {
      const { data } = review;
      const text = excerpt(review.body);
      return {
        title: data.title,
        year: data.year,
        href: links.review(review.id),
        poster: await reviewPoster(review),
        meta: reviewMeta(review),
        note: withExcerpt ? text : undefined,
        data: {
          search: [data.title, data.year, data.director, ...data.tags, text].filter(Boolean).join(' ').toLowerCase(),
          rating: String(data.rating ?? 0),
          year: String(data.year ?? ''),
          decade: data.year ? String(Math.floor(data.year / 10) * 10) : '',
          tags: `|${data.tags.map((t) => t.toLowerCase()).join('|')}|`,
          watched: isoDate(data.watched),
          liked: data.liked ? '1' : '',
          title: data.title.toLowerCase(),
        },
      };
    }),
  );
}
