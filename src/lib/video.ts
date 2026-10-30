export interface Video {
  provider: 'youtube' | 'vimeo';
  id: string;
  /** Player URL, loaded only when the visitor presses play. */
  embed: string;
  /** Provider thumbnail, used when no still has been uploaded. */
  thumbnail?: string;
}

/** YouTube or Vimeo link → embeddable player. Anything else returns null. */
export function parseVideo(link: string | null | undefined): Video | null {
  if (!link) return null;
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtu.be' || host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
    const id =
      host === 'youtu.be'
        ? url.pathname.slice(1)
        : (url.searchParams.get('v') ?? url.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1]);
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    return {
      provider: 'youtube',
      id,
      embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`,
      thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    };
  }

  if (host.endsWith('vimeo.com')) {
    // vimeo.com/123, vimeo.com/123/abcdef (unlisted), player.vimeo.com/video/123?h=abcdef
    const [, id, hash] = url.pathname.match(/(?:\/video)?\/(\d+)(?:\/([\da-f]+))?/) ?? [];
    if (!id) return null;
    const h = hash ?? url.searchParams.get('h');
    return {
      provider: 'vimeo',
      id,
      embed: `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1${h ? `&h=${h}` : ''}`,
    };
  }

  return null;
}
