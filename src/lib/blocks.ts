import { getEntry, type CollectionEntry } from 'astro:content';

export type Block = CollectionEntry<'home'>['data']['blocks'][number];
export type ScriptLine = Extract<Block, { discriminant: 'script' }>['value']['lines'][number];

const titled: Block['discriminant'][] = ['watching', 'work', 'reviews', 'list', 'notes', 'text', 'contact'];

interface Available {
  work: boolean;
  notes: boolean;
  reviews: boolean;
  /** Slugs of published lists */
  lists: Set<string>;
  dev: boolean;
}

/**
 * Home page blocks in CMS order, with scene numbers worked out and
 * empty blocks (and the transition leading into them) dropped.
 */
export async function getBlocks(available: Available) {
  const blocks = (await getEntry('home', 'index'))?.data.blocks ?? [];

  const isEmpty = (b: Block | undefined) =>
    !b ||
    (b.discriminant === 'watching' && !b.value.username && !available.dev) ||
    (b.discriminant === 'work' && !available.work) ||
    (b.discriminant === 'notes' && !available.notes) ||
    (b.discriminant === 'reviews' && !available.reviews) ||
    (b.discriminant === 'list' && !(b.value.list && available.lists.has(b.value.list))) ||
    (b.discriminant === 'script' && !b.value.lines.some((l) => l.text.trim()));

  const visible = blocks.filter(
    (b, i) => !isEmpty(b) && !(b.discriminant === 'transition' && i < blocks.length - 1 && isEmpty(blocks[i + 1])),
  );

  // Only the first script set to type out actually types.
  const typedIndex = visible.findIndex((b) => b.discriminant === 'script' && b.value.typewriter);

  let scene = 1;
  return visible.map((block, index) => {
    const firstScene = scene;
    if (block.discriminant === 'script') scene += block.value.lines.filter((l) => l.kind === 'scene' && l.text.trim()).length;
    else if (titled.includes(block.discriminant) && 'heading' in block.value && block.value.heading) scene++;
    return { block, index, scene: firstScene, typed: index === typedIndex };
  });
}

export const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
