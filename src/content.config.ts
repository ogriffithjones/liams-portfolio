import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// These schemas mirror keystatic.config.ts. Keystatic edits the files,
// Astro reads them at build time and optimises the images.

const optional = z.string().optional();
const heading = z.string().default('');

const block = <K extends string, V extends z.ZodType>(discriminant: K, value: V) =>
  z.object({ discriminant: z.literal(discriminant), value });

export const scriptKinds = ['scene', 'action', 'character', 'parenthetical', 'dialogue', 'transition', 'centered'] as const;

const home = defineCollection({
  loader: glob({ pattern: 'index.yaml', base: './src/content/home' }),
  schema: z.object({
    blocks: z
      .array(
        z.discriminatedUnion('discriminant', [
          block(
            'script',
            z.object({
              typewriter: z.boolean().default(false),
              lines: z.array(z.object({ kind: z.enum(scriptKinds), text: z.string().default('') })).default([]),
            }),
          ),
          block('transition', z.object({ text: z.string().default('CUT TO:') })),
          block('watching', z.object({ heading, username: z.string().default(''), count: z.number().int().nullish() })),
          block('work', z.object({ heading, items: z.array(z.string().nullable()).default([]) })),
          block('notes', z.object({ heading, limit: z.number().int().nullish() })),
          block('text', z.object({ heading, body: z.string().default('') })),
          block('contact', z.object({ heading })),
        ]),
      )
      .default([]),
  }),
});

const site = defineCollection({
  loader: glob({ pattern: 'index.yaml', base: './src/content/site' }),
  schema: z.object({
    name: z.string(),
    role: optional,
    email: optional,
    location: optional,
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    seoDescription: optional,
  }),
});

const work = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/work' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.number().int(),
      role: optional,
      description: optional,
      link: z.url().nullish().or(z.literal('')),
      image: image().nullish(),
      imageAlt: optional,
    }),
});

const notes = defineCollection({
  loader: glob({ pattern: '*.mdoc', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    film: optional,
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { home, site, work, notes };
