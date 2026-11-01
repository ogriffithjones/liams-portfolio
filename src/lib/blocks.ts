import type { CollectionEntry } from 'astro:content';

type PageData = CollectionEntry<'home'>['data'];
export type Block = PageData['blocks'][number];
export type Ending = PageData['ending'];
export type ScriptLine = Extract<Block, { discriminant: 'script' }>['value']['lines'][number];

interface Available {
  work: boolean;
  /** Which kinds of writing exist */
  writing: { review: boolean; opinion: boolean };
  /** Slugs of published lists */
  lists: Set<string>;
  dev: boolean;
}

/**
 * A page's blocks in CMS order, without hidden or empty ones, with scene
 * numbers worked out and the transition to print before each.
 */
export function prepareBlocks(blocks: Block[], available: Available) {
  const isEmpty = (b: Block) =>
    (b.discriminant === 'watching' && !b.value.username && !available.dev) ||
    (b.discriminant === 'work' && !available.work) ||
    (b.discriminant === 'writing' &&
      (b.value.show === 'all' ? !available.writing.review && !available.writing.opinion : !available.writing[b.value.show])) ||
    (b.discriminant === 'list' && !(b.value.list && available.lists.has(b.value.list))) ||
    (b.discriminant === 'script' && !b.value.lines.some((l) => l.text.trim()));

  const visible = blocks.filter((b) => !b.value.hidden && !isEmpty(b));

  // Only the first script set to type out actually types.
  const typedIndex = visible.findIndex((b) => b.discriminant === 'script' && b.value.typewriter);

  let scene = 1;
  return visible.map((block, index) => {
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
}

export const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
