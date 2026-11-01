import { getEntry, type CollectionEntry } from 'astro:content';

type Home = CollectionEntry<'home'>['data'];
export type Block = Home['blocks'][number];
export type ScriptLine = Extract<Block, { discriminant: 'script' }>['value']['lines'][number];

interface Available {
  work: boolean;
  notes: boolean;
  reviews: boolean;
  /** Slugs of published lists */
  lists: Set<string>;
  dev: boolean;
}

/**
 * Home page blocks in CMS order, without hidden or empty ones, with scene
 * numbers worked out and the transition to print before each.
 */
export async function getHome(available: Available) {
  const home = (await getEntry('home', 'index'))?.data;
  const blocks = home?.blocks ?? [];

  const isEmpty = (b: Block) =>
    (b.discriminant === 'watching' && !b.value.username && !available.dev) ||
    (b.discriminant === 'work' && !available.work) ||
    (b.discriminant === 'notes' && !available.notes) ||
    (b.discriminant === 'reviews' && !available.reviews) ||
    (b.discriminant === 'list' && !(b.value.list && available.lists.has(b.value.list))) ||
    (b.discriminant === 'script' && !b.value.lines.some((l) => l.text.trim()));

  const visible = blocks.filter((b) => !b.value.hidden && !isEmpty(b));

  // Only the first script set to type out actually types.
  const typedIndex = visible.findIndex((b) => b.discriminant === 'script' && b.value.typewriter);

  let scene = 1;
  const shown = visible.map((block, index) => {
    const firstScene = scene;
    if (block.discriminant === 'script') scene += block.value.lines.filter((l) => l.kind === 'scene' && l.text.trim()).length;
    else if ('heading' in block.value && block.value.heading) scene++;
    return {
      block,
      index,
      scene: firstScene,
      typed: index === typedIndex,
      // Nothing to cut from at the very top of the page
      cut: index === 0 ? '' : block.value.cut,
    };
  });

  return { blocks: shown, ending: home?.ending ?? { transition: 'FADE OUT.', theEnd: true } };
}

export const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
