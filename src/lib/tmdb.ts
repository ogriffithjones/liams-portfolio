// Film posters from TMDB's official API, looked up at build time.
// Needs TMDB_API_KEY (a v3 API key or a v4 read access token, both free at
// themoviedb.org/settings/api). Without it, films simply show without posters.

export interface Poster {
  src: string;
  srcset: string;
  tmdbUrl: string;
}

export interface FilmRef {
  title: string;
  year?: number | null | undefined;
  tmdbId?: number | null | undefined;
}

const key = import.meta.env.TMDB_API_KEY ?? process.env.TMDB_API_KEY;
const image = (path: string, size: string) => `https://image.tmdb.org/t/p/${size}${path}`;
const cache = new Map<string, Promise<Poster | null>>();

export const tmdbEnabled = Boolean(key);

async function api<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // v4 read tokens are JWTs; v3 keys go in the query string
  const headers: Record<string, string> = { accept: 'application/json' };
  if (key!.startsWith('eyJ')) headers.authorization = `Bearer ${key}`;
  else url.searchParams.set('api_key', key!);

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  }
  return null;
}

interface Movie {
  id: number;
  poster_path: string | null;
}

async function lookup({ title, year, tmdbId }: FilmRef): Promise<Poster | null> {
  let movie: Movie | null | undefined;
  if (tmdbId) {
    movie = await api<Movie>(`/movie/${tmdbId}`);
  } else {
    const search = (params: Record<string, string>) =>
      api<{ results: Movie[] }>('/search/movie', { query: title, include_adult: 'false', ...params });
    movie =
      (year ? (await search({ primary_release_year: String(year) }))?.results[0] : undefined) ??
      (year ? (await search({ year: String(year) }))?.results[0] : undefined) ??
      (await search({}))?.results[0];
  }
  const path = movie?.poster_path;
  if (!movie || !path) return null;
  return {
    src: image(path, 'w342'),
    srcset: [185, 342, 500].map((w) => `${image(path, `w${w}`)} ${w}w`).join(', '),
    tmdbUrl: `https://www.themoviedb.org/movie/${movie.id}`,
  };
}

/** Poster for a film, or null. Results are cached for the whole build. */
export function getPoster(film: FilmRef): Promise<Poster | null> {
  if (!key) return Promise.resolve(null);
  const id = film.tmdbId ? `id:${film.tmdbId}` : `${film.title.toLowerCase()}|${film.year ?? ''}`;
  if (!cache.has(id)) {
    cache.set(
      id,
      lookup(film).catch((error) => {
        console.warn(`[tmdb] ${film.title}: ${error}`);
        return null;
      }),
    );
  }
  return cache.get(id)!;
}
