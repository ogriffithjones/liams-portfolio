import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { aspects, captions, columns, endings, filmLayouts, previews, ratings, transitions, widths } from './lib/options';
import { accents, defaultTheme, dotColours, dotHeights, dotSizes, modes, palettes } from './lib/themes';

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

// The building blocks for the home page and every other page
const pageBlocks = z
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
    .default([]);

const pageEnding = z
    .object({ transition: z.enum(endings.values).default('FADE OUT.'), theEnd: z.boolean().default(true) })
    .default({ transition: 'FADE OUT.', theEnd: true });

const home = defineCollection({
  loader: glob({ pattern: 'index.yaml', base: './src/content/home' }),
  schema: z.object({ blocks: pageBlocks, ending: pageEnding }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: optional,
    showTitle: z.boolean().default(true),
    blocks: pageBlocks,
    ending: pageEnding,
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
    sections: z
      .object({
        notesLabel: z.string().default('Notes on film'),
        notesPath: z.string().default('notes'),
        notesPage: z.boolean().default(true),
        reviewsLabel: z.string().default('Reviews'),
        reviewsPath: z.string().default('reviews'),
        listsPath: z.string().default('lists'),
        workPath: z.string().default('work'),
      })
      .prefault({}),
    nav: z
      .object({
        show: z.boolean().default(false),
        items: z
          .array(
            z.discriminatedUnion('discriminant', [
              z.object({ discriminant: z.literal('home'), value: z.object({ label: z.string().default('') }) }),
              z.object({ discriminant: z.literal('notes'), value: z.object({ label: z.string().default('') }) }),
              z.object({ discriminant: z.literal('reviews'), value: z.object({ label: z.string().default('') }) }),
              z.object({
                discriminant: z.literal('page'),
                value: z.object({ page: z.string().nullish(), label: z.string().default('') }),
              }),
              z.object({ discriminant: z.literal('link'), value: z.object({ url: z.string(), label: z.string().default('') }) }),
            ]),
          )
          .default([]),
      })
      .prefault({}),
    theme: z
      .object({
        palette: z
          .object({
            discriminant: z.enum([...(Object.keys(palettes) as [keyof typeof palettes]), 'custom']),
            value: z.object({ background: z.string().optional(), text: z.string().optional() }).nullish(),
          })
          .default(defaultTheme.palette),
        accent: z
          .object({
            discriminant: z.enum([...(Object.keys(accents) as [keyof typeof accents]), 'custom']),
            value: z.object({ colour: z.string().optional() }).nullish(),
          })
          .default(defaultTheme.accent),
        mode: z.enum(Object.keys(modes) as [keyof typeof modes]).default('auto'),
        lightsSwitch: z.boolean().default(false),
        // Keystatic stores the checkbox as true/false; the site reads it as on/off
        dots: z
          .discriminatedUnion('discriminant', [
            z.object({ discriminant: z.literal(false), value: z.unknown().optional() }),
            z.object({
              discriminant: z.literal(true),
              value: z.object({
                colour: z
                  .object({
                    discriminant: z.enum([...(Object.keys(dotColours) as [keyof typeof dotColours]), 'custom']),
                    value: z.object({ colour: z.string().optional() }).nullish(),
                  })
                  .default({ discriminant: 'sage' }),
                size: z.enum(Object.keys(dotSizes) as [keyof typeof dotSizes]).default('medium'),
                height: z.enum(Object.keys(dotHeights) as [keyof typeof dotHeights]).default('medium'),
                animate: z.boolean().default(true),
              }),
            }),
          ])
          .default({ discriminant: false })
          .transform((d) => (d.discriminant ? { discriminant: 'on' as const, value: d.value } : { discriminant: 'off' as const })),
      })
      .prefault({}),
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
      fullScript: z.enum(['request', 'link', 'none']).default('request'),
      excerptMarks: z.enum(['auto', 'both', 'start', 'end', 'none']).default('auto'),
      excerptLabel: z
        .discriminatedUnion('discriminant', [
          z.object({ discriminant: z.enum(['auto', 'excerpt', 'script', 'none']), value: z.unknown().optional() }),
          z.object({ discriminant: z.literal('custom'), value: z.object({ text: z.string().default('') }) }),
        ])
        .default({ discriminant: 'auto' }),
      excerptShow: z
        .discriminatedUnion('discriminant', [
          z.object({ discriminant: z.literal('all'), value: z.unknown().optional() }),
          z.object({ discriminant: z.literal('off'), value: z.unknown().optional() }),
          z.object({
            discriminant: z.literal('chosen'),
            value: z.object({ scenes: z.string().default(''), gaps: z.boolean().default(true) }),
          }),
        ])
        .default({ discriminant: 'all' }),
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

export const collections = { home, pages, site, work, reviews, lists, notes };
