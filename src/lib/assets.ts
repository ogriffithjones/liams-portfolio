import type { ImageMetadata } from 'astro';

// Images placed inside writing are stored as paths like
// "../../assets/notes/my-piece/still.jpg". Look them up here so they can be
// resized and optimised like every other image on the site.
const images = import.meta.glob<{ default: ImageMetadata }>('/src/assets/**/*.{jpg,jpeg,png,webp,avif,gif}', {
  eager: true,
});

export function resolveImage(path: string | undefined | null): ImageMetadata | null {
  if (!path) return null;
  const key = `/src/${path.replace(/^(\.\.\/)+/, '').replace(/^src\//, '')}`;
  return images[key]?.default ?? null;
}
