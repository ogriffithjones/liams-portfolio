import type { CollectionEntry } from 'astro:content';
import type { FilmItem } from '../components/Films.astro';
import { excerpt, formatDate, isoDate, stars } from './content';
import { getPoster } from './tmdb';
import { getLinks } from './paths';

export type Piece = CollectionEntry<'writing'>;

export const kindLabel = { review: 'Review', opinion: 'Opinion' } as const;

/** "★★★★ · ♥ · 12 Oct 2026 · rewatch" for reviews, "Film · 12 Oct 2026" for opinion pieces */
export function pieceMeta({ data }: Piece) {
  const date = formatDate(data.date);
  if (data.kind.discriminant === 'opinion') return [data.kind.value.film, date].filter(Boolean).join(' · ');
  const r = data.kind.value;
  return [r.rating ? stars(r.rating) : '', r.liked ? '♥' : '', date, r.rewatch ? 'rewatch' : ''].filter(Boolean).join(' · ');
}

/** A review's poster (uploaded, else TMDB), or an opinion piece's lead image */
export async function piecePoster({ data }: Piece) {
  if (data.kind.discriminant === 'opinion') return data.kind.value.lead.image ?? null;
  const r = data.kind.value;
  return r.poster ?? (await getPoster({ title: data.title, year: r.year, tmdbId: r.tmdbId }));
}

/** About 230 words a minute, ignoring editor markup */
export const readingMinutes = (body: string | undefined) =>
  Math.max(1, Math.round((body ?? '').replace(/\{%[\s\S]*?%\}/g, ' ').split(/\s+/).filter(Boolean).length / 230));

/** Writing as film items, with the data the writing page's filters search and sort on. */
export async function writingItems(pieces: Piece[], { withExcerpt = false } = {}): Promise<FilmItem[]> {
  const links = await getLinks();
  return Promise.all(
    pieces.map(async (piece) => {
      const { data } = piece;
      const review = data.kind.discriminant === 'review' ? data.kind.value : null;
      const text = data.summary?.trim() || excerpt(piece.body);
      return {
        title: data.title,
        year: review?.year,
        href: links.piece(piece.id),
        poster: await piecePoster(piece),
        meta: `${kindLabel[data.kind.discriminant]} · ${pieceMeta(piece)}`,
        note: withExcerpt ? text : undefined,
        data: {
          kind: data.kind.discriminant,
          search: [data.title, review?.year, review?.director, data.kind.discriminant === 'opinion' ? data.kind.value.film : '', ...data.tags, text]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          rating: String(review?.rating ?? 0),
          year: String(review?.year ?? ''),
          decade: review?.year ? String(Math.floor(review.year / 10) * 10) : '',
          tags: `|${data.tags.map((t) => t.toLowerCase()).join('|')}|`,
          watched: isoDate(data.date),
          liked: review?.liked ? '1' : '',
          title: data.title.toLowerCase(),
        },
      };
    }),
  );
}
