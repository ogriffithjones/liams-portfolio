import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { aspects, captions, columns, endings, filmLayouts, previews, ratings, transitions, widths } from './lib/options';

// These schemas mirror keystatic.config.ts. Keystatic edits the files,
// Astro reads them at build time and optimises the images.

const optional = z.string().optional();
const heading = z.string().default('');
const int = z.number().int().nullish();
const url = z.url().nullish().or(z.literal(''));

// Every home block also has a transition printed before it, and a Hide switch
const block = <K extends string, S extends z.ZodRawShape>(discriminant: K, shape: S, cut = 'CUT TO:') =>
  z.object({
    discriminant: z.literal(discriminant),
    value: z.object({
      ...shape,
      cut: z.enum(transitions.values).default(cut as (typeof transitions.values)[number]),
      hidden: z.boolean().default(false),
    }),
  });

export const scriptKinds = ['scene', 'action', 'character', 'parenthetical', 'dialogue', 'transition', 'centered'] as const;

const home = defineCollection({
  loader: glob({ pattern: 'index.yaml', base: './src/content/home' }),
  schema: z.object({
    blocks: z
      .array(
        z.discriminatedUnion('discriminant', [
          block(
            'script',
            {
              typewriter: z.boolean().default(false),
              lines: z.array(z.object({ kind: z.enum(scriptKinds), text: z.string().default('') })).default([]),
            },
            '',
          ),
          block('watching', { heading, username: z.string().default(''), count: int }),
          block('work', {
            heading,
            items: z.array(z.string().nullable()).default([]),
            columns: z.enum(columns.values).default('1'),
            aspect: z.enum(aspects.values).default('wide'),
            width: z.enum(widths.values).default('script'),
            captions: z.enum(captions.values).default('full'),
            preview: z.enum(previews.values).default('hover'),
          }),
          block('reviews', {
            heading,
            count: int,
            layout: z.enum(filmLayouts.values).default('posters'),
            columns: z.enum(columns.values).default('4'),
          }),
          block('list', {
            heading,
            list: z.string().nullish(),
            count: int,
            layout: z.enum(filmLayouts.values).default('posters'),
            columns: z.enum(columns.values).default('4'),
          }),
          block('notes', { heading, limit: int }),
          block('text', { heading, body: z.string().default('') }),
          block('contact', { heading }),
        ]),
      )
      .default([]),
    ending: z
      .object({ transition: z.enum(endings.values).default('FADE OUT.'), theEnd: z.boolean().default(true) })
      .default({ transition: 'FADE OUT.', theEnd: true }),
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
    reviewsPage: z.boolean().default(true),
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
      video: url,
      image: image().nullish(),
      imageAlt: optional,
      loop: z.string().nullish(),
      link: url,
      excerpt: z.string().optional(),
      excerptFile: z.string().nullish(),
      excerptScenes: z.string().optional(),
    }),
});

const reviews = defineCollection({
  loader: glob({ pattern: '*.mdoc', base: './src/content/reviews' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: int,
      director: optional,
      rating: z
        .enum(ratings.values)
        .default('')
        .transform((r) => (r ? Number(r) : null)),
      watched: z.coerce.date(),
      rewatch: z.boolean().default(false),
      liked: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
      poster: image().nullish(),
      tmdbId: int,
      letterboxd: url,
      draft: z.boolean().default(false),
    }),
});

const lists = defineCollection({
  loader: glob({ pattern: '*.mdoc', base: './src/content/lists' }),
  schema: z.object({
    title: z.string(),
    summary: optional,
    ranked: z.boolean().default(true),
    layout: z.enum(filmLayouts.values).default('posters'),
    columns: z.enum(columns.values).default('4'),
    letterboxdCsv: z.string().nullish(),
    films: z
      .array(z.object({ title: z.string(), year: int, tmdbId: int, note: z.string().default('') }))
      .default([]),
    letterboxd: url,
    draft: z.boolean().default(false),
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

export const collections = { home, site, work, reviews, lists, notes };
