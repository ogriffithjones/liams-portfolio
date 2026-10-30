export interface Watch {
  title: string;
  year: string | undefined;
  rating: number | undefined;
  rewatch: boolean;
  watched: string | undefined;
  url: string;
  poster: string | undefined;
}

const tag = (xml: string, name: string) =>
  xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim();

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");

/** Most recent diary entries from a public Letterboxd RSS feed. */
export async function recentWatches(username: string, limit = 4): Promise<Watch[]> {
  const res = await fetch(`https://letterboxd.com/${encodeURIComponent(username)}/rss/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; liams-portfolio)' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Letterboxd RSS returned ${res.status}`);
  const xml = await res.text();

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item]) => {
      // List posts don't have a film title; only diary entries do.
      const title = tag(item, 'letterboxd:filmTitle');
      if (!title) return null;
      const rating = tag(item, 'letterboxd:memberRating');
      // Feed posters are 600x900; 300x450 is plenty for a small grid.
      const poster = item.match(/<img src="([^"]+)"/)?.[1]?.replace('-0-600-0-900-', '-0-300-0-450-');
      return {
        title: decode(title),
        year: tag(item, 'letterboxd:filmYear'),
        rating: rating ? Number(rating) : undefined,
        rewatch: tag(item, 'letterboxd:rewatch') === 'Yes',
        watched: tag(item, 'letterboxd:watchedDate'),
        url: tag(item, 'link') ?? `https://letterboxd.com/${username}/`,
        poster: poster ? decode(poster) : undefined,
      } satisfies Watch;
    })
    .filter((w): w is Watch => w !== null)
    .slice(0, limit);
}

export const stars = (rating: number) => '★'.repeat(Math.floor(rating)) + (rating % 1 ? '½' : '');
