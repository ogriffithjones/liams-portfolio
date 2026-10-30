import { getEntry, type CollectionEntry } from 'astro:content';

export type Block = CollectionEntry<'home'>['data']['blocks'][number];
export type ScriptLine = Extract<Block, { discriminant: 'script' }>['value']['lines'][number];

const titled: Block['discriminant'][] = ['watching', 'work', 'notes', 'text', 'contact'];

/**
 * Home page blocks in CMS order, with scene numbers worked out and
 * empty blocks (and the transition leading into them) dropped.
 */
export async function getBlocks({ hasWork, hasNotes, dev }: { hasWork: boolean; hasNotes: boolean; dev: boolean }) {
  const blocks = (await getEntry('home', 'index'))?.data.blocks ?? [];

  const isEmpty = (b: Block | undefined) =>
    !b ||
    (b.discriminant === 'watching' && !b.value.username && !dev) ||
    (b.discriminant === 'work' && !hasWork) ||
    (b.discriminant === 'notes' && !hasNotes) ||
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
