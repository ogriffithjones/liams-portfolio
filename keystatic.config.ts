import { config, fields, collection, singleton } from '@keystatic/core';
import { aspects, captions, columns, endings, filmLayouts, previews, ratings, transitions, widths } from './src/lib/options';

// Locally, edits are written straight to the files in this repo.
// In production, set PUBLIC_KEYSTATIC_GITHUB_REPO (e.g. "owner/liams-portfolio")
// and edits are committed to GitHub, which triggers a Vercel rebuild.
const githubRepo = import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO as
  | `${string}/${string}`
  | undefined;

const sceneHeading = (defaultValue: string) =>
  fields.text({
    label: 'Scene heading',
    description: 'Section title, screenplay style. e.g. INT. WORK — DAY',
    defaultValue,
  });

const select = <T extends { options: { value: string; label: string }[] }>(
  label: string,
  choice: T,
  defaultValue: T['options'][number]['value'],
  description?: string,
) => fields.select({ label, options: choice.options, defaultValue, ...(description ? { description } : {}) });

// Row labels in the Home page block list: "Type · heading · key settings"
const label = (type: string, hidden: boolean, ...parts: (string | false | null | undefined)[]) =>
  [hidden ? `${type} (hidden)` : type, ...parts.filter(Boolean)].join('  ·  ');

const title = (slug: string) => slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Every home block ends with these two settings
const extras = (cut: string) => ({
  cut: select('Transition before', transitions, cut, 'Printed right-aligned above the block, like a script.'),
  hidden: fields.checkbox({ label: 'Hide', description: 'Keep the block but leave it off the page.' }),
});

const elementLabels = {
  scene: 'Scene heading',
  action: 'Action',
  character: 'Character',
  parenthetical: 'Parenthetical',
  dialogue: 'Dialogue',
  transition: 'Transition',
  centered: 'Centered',
} as const;

const scriptElement = fields.object({
  kind: fields.select({
    label: 'Element',
    options: Object.entries(elementLabels).map(([value, label]) => ({ value, label })),
    defaultValue: 'action',
  }),
  text: fields.text({
    label: 'Text',
    description: 'Parentheticals get their brackets added automatically.',
    multiline: true,
  }),
});

const filmFields = {
  title: fields.text({ label: 'Film title', validation: { isRequired: true } }),
  year: fields.integer({ label: 'Release year', description: 'Helps find the right poster' }),
  tmdbId: fields.integer({
    label: 'TMDB ID (optional)',
    description: 'Only if the wrong poster shows up. The number in the film’s themoviedb.org address.',
  }),
};

export default config({
  storage: githubRepo ? { kind: 'github', repo: githubRepo } : { kind: 'local' },
  ui: {
    brand: { name: 'Liams Portfolio' },
    navigation: {
      Pages: ['home'],
      Content: ['work', 'reviews', 'lists', 'notes'],
      Settings: ['site'],
    },
  },
  singletons: {
    home: singleton({
      label: 'Home page',
      path: 'src/content/home/',
      format: { data: 'yaml' },
      schema: {
        blocks: fields.blocks(
          {
            script: {
              label: 'Script (screenplay lines)',
              itemLabel: (props) => {
                const lines = props.fields.lines.elements.map((l) => l.fields.text.value.trim()).filter(Boolean);
                const scene = props.fields.lines.elements.find((l) => l.fields.kind.value === 'scene')?.fields.text.value;
                return label('Script', props.fields.hidden.value, scene || lines[0] || 'empty', props.fields.typewriter.value && 'types out');
              },
              schema: fields.object({
                lines: fields.array(scriptElement, {
                  label: 'Lines',
                  itemLabel: (props) =>
                    `${elementLabels[props.fields.kind.value as keyof typeof elementLabels]}: ${props.fields.text.value.slice(0, 50)}`,
                }),
                typewriter: fields.checkbox({
                  label: 'Type out on load',
                  description: 'Only the first script on the page types itself out.',
                  defaultValue: true,
                }),
                ...extras(''),
              }),
            },
            watching: {
              label: 'Recently watched (Letterboxd)',
              itemLabel: (props) =>
                label(
                  'Recently watched',
                  props.fields.hidden.value,
                  props.fields.heading.value,
                  props.fields.username.value ? `@${props.fields.username.value}` : 'no username',
                  `${props.fields.count.value ?? 4} films`,
                ),
              schema: fields.object({
                heading: sceneHeading('INT. SCREENING ROOM — NIGHT'),
                username: fields.text({ label: 'Letterboxd username', description: 'Hidden on the live site while empty.' }),
                count: fields.integer({ label: 'How many films', defaultValue: 4, validation: { min: 1, max: 12 } }),
                ...extras('CUT TO:'),
              }),
            },
            work: {
              label: 'Work (projects)',
              itemLabel: (props) => {
                const f = props.fields;
                const chosen = f.items.elements.length;
                return label(
                  'Work',
                  f.hidden.value,
                  f.heading.value,
                  chosen ? `${chosen} chosen` : 'all projects',
                  `${f.columns.value} across, ${aspects.labels[f.aspect.value as keyof typeof aspects.labels].split(' ')[0]!.toLowerCase()}`,
                );
              },
              schema: fields.object({
                heading: sceneHeading('INT. WORK — DAY'),
                items: fields.array(fields.relationship({ label: 'Project', collection: 'work' }), {
                  label: 'Projects',
                  description: 'Pick and drag into order. Leave empty to show every project, newest first.',
                  itemLabel: (props) => (props.value ? title(props.value) : 'Choose a project'),
                }),
                columns: select('Columns', columns, '1'),
                aspect: select('Image shape', aspects, 'wide'),
                width: select('Width', widths, 'script', 'Wide and full width break out of the text column.'),
                captions: select('Captions', captions, 'full'),
                preview: select('Video previews', previews, 'hover', 'For projects with a preview loop uploaded.'),
                ...extras('CUT TO:'),
              }),
            },
            reviews: {
              label: 'Reviews (latest)',
              itemLabel: (props) =>
                label(
                  'Reviews',
                  props.fields.hidden.value,
                  props.fields.heading.value,
                  `latest ${props.fields.count.value ?? 4}`,
                  filmLayouts.labels[props.fields.layout.value as keyof typeof filmLayouts.labels].toLowerCase(),
                ),
              schema: fields.object({
                heading: sceneHeading('INT. REVIEWS — NIGHT'),
                count: fields.integer({ label: 'How many reviews', defaultValue: 4, validation: { min: 1, max: 24 } }),
                layout: select('Layout', filmLayouts, 'posters'),
                columns: select('Columns (poster grid)', columns, '4'),
                ...extras('CUT TO:'),
              }),
            },
            list: {
              label: 'Film list',
              itemLabel: (props) =>
                label(
                  'Film list',
                  props.fields.hidden.value,
                  props.fields.list.value ? title(props.fields.list.value) : 'choose a list',
                  props.fields.count.value ? `first ${props.fields.count.value}` : 'all films',
                ),
              schema: fields.object({
                heading: sceneHeading('INT. VIDEO SHOP — DAY'),
                list: fields.relationship({ label: 'List', collection: 'lists' }),
                count: fields.integer({
                  label: 'How many films',
                  description: 'Shows the first few with a link to the full list. Leave empty to show all.',
                  defaultValue: 8,
                }),
                layout: select('Layout', filmLayouts, 'posters'),
                columns: select('Columns (poster grid)', columns, '4'),
                ...extras('CUT TO:'),
              }),
            },
            notes: {
              label: 'Notes on film',
              itemLabel: (props) =>
                label(
                  'Notes on film',
                  props.fields.hidden.value,
                  props.fields.heading.value,
                  props.fields.limit.value ? `latest ${props.fields.limit.value}` : 'all notes',
                ),
              schema: fields.object({
                heading: sceneHeading('INT. NOTES ON FILM — NIGHT'),
                limit: fields.integer({ label: 'How many notes', description: 'Leave empty to show all.' }),
                ...extras('CUT TO:'),
              }),
            },
            text: {
              label: 'Text',
              itemLabel: (props) =>
                label('Text', props.fields.hidden.value, props.fields.heading.value, props.fields.body.value.slice(0, 40)),
              schema: fields.object({
                heading: sceneHeading('INT. ANYWHERE — DAY'),
                body: fields.text({ label: 'Text', description: 'Leave a blank line between paragraphs.', multiline: true }),
                ...extras('CUT TO:'),
              }),
            },
            contact: {
              label: 'Contact',
              itemLabel: (props) => label('Contact', props.fields.hidden.value, props.fields.heading.value),
              schema: fields.object({
                heading: sceneHeading('EXT. CONTACT — DAY'),
                ...extras('CUT TO:'),
              }),
            },
          },
          {
            label: 'Blocks',
            description:
              'The page from top to bottom. Drag to reorder, click to edit. Each block has its own transition (CUT TO: etc.) and a Hide switch.',
          },
        ),
        ending: fields.object(
          {
            transition: select('Final transition', endings, 'FADE OUT.'),
            theEnd: fields.checkbox({ label: 'Show THE END', defaultValue: true }),
          },
          { label: 'Ending', description: 'Printed after the last block.' },
        ),
      },
    }),
    site: singleton({
      label: 'Site settings',
      path: 'src/content/site/',
      format: { data: 'yaml' },
      schema: {
        name: fields.text({ label: 'Name', validation: { isRequired: true } }),
        role: fields.text({ label: 'Role', description: 'Shown under your name on the title page' }),
        email: fields.text({ label: 'Email' }),
        location: fields.text({ label: 'Location' }),
        links: fields.array(
          fields.object({
            label: fields.text({ label: 'Label', validation: { isRequired: true } }),
            url: fields.url({ label: 'URL', validation: { isRequired: true } }),
          }),
          {
            label: 'Links',
            description: 'Instagram, Vimeo, Letterboxd, etc.',
            itemLabel: (props) => props.fields.label.value || 'Link',
          },
        ),
        reviewsPage: fields.checkbox({
          label: 'Reviews page',
          description: 'Publish /reviews (with search and filters) and a page for each review.',
          defaultValue: true,
        }),
        seoDescription: fields.text({
          label: 'Search description',
          description: 'Shown by Google under your name. Aim for 120–160 characters.',
          multiline: true,
          validation: { length: { max: 200 } },
        }),
      },
    }),
  },
  collections: {
    work: collection({
      label: 'Work',
      slugField: 'title',
      path: 'src/content/work/*',
      format: { data: 'yaml' },
      columns: ['title', 'year'],
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        year: fields.integer({ label: 'Year', validation: { isRequired: true } }),
        role: fields.text({ label: 'Role', description: 'e.g. Director, Editor' }),
        description: fields.text({ label: 'Description', multiline: true, validation: { length: { max: 300 } } }),
        video: fields.url({
          label: 'Video',
          description: 'YouTube or Vimeo link. Plays in a full-screen overlay when the still is clicked.',
        }),
        image: fields.image({
          label: 'Still',
          description: 'Optional for YouTube videos (their thumbnail is used). Recommended for everything else.',
          directory: 'src/assets/work',
          publicPath: '../../assets/work/',
        }),
        imageAlt: fields.text({ label: 'Still description (alt text)' }),
        loop: fields.file({
          label: 'Preview loop',
          description: 'Optional short, silent MP4 that plays in the tile. Keep it under about 8 MB.',
          directory: 'public/media/work',
          publicPath: '/media/work/',
        }),
        link: fields.url({ label: 'Link', description: 'Optional: where the title links to (festival page, credits, etc.)' }),
        excerpt: fields.text({
          label: 'Script excerpt',
          description:
            'Optional. Paste a scene from WriterDuet (or any screenplay as plain text). Shown on the project’s own page, formatted as a script. For exact formatting, upload an .fdx below instead.',
          multiline: true,
        }),
        excerptFile: fields.file({
          label: 'Script file (.fdx or .fountain)',
          description:
            'Optional. .fdx or .fountain only (not PDF). In WriterDuet: Export → Final Draft (.fdx). Used instead of the pasted excerpt when both are set.',
          directory: 'src/data/scripts',
          publicPath: 'src/data/scripts/',
        }),
      },
    }),
    reviews: collection({
      label: 'Reviews',
      slugField: 'title',
      path: 'src/content/reviews/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['title', 'watched'],
      schema: {
        title: fields.slug({ name: { label: 'Film title' } }),
        year: fields.integer({ label: 'Release year' }),
        director: fields.text({ label: 'Director' }),
        rating: select('Rating', ratings, ''),
        watched: fields.date({ label: 'Watched', validation: { isRequired: true }, defaultValue: { kind: 'today' } }),
        rewatch: fields.checkbox({ label: 'Rewatch' }),
        liked: fields.checkbox({ label: 'Liked ♥' }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          description: 'Used for filtering, e.g. a genre, festival or cinema.',
          itemLabel: (props) => props.value || 'Tag',
        }),
        poster: fields.image({
          label: 'Poster',
          description: 'Optional. Pulled from TMDB automatically when left empty.',
          directory: 'src/assets/reviews',
          publicPath: '../../assets/reviews/',
        }),
        tmdbId: filmFields.tmdbId,
        letterboxd: fields.url({ label: 'Letterboxd link' }),
        draft: fields.checkbox({ label: 'Draft', description: 'Drafts are hidden from the live site' }),
        content: fields.markdoc({
          label: 'Review',
          options: { image: { directory: 'src/assets/reviews', publicPath: '../../assets/reviews/' } },
        }),
      },
    }),
    lists: collection({
      label: 'Film lists',
      slugField: 'title',
      path: 'src/content/lists/*',
      format: { contentField: 'intro' },
      entryLayout: 'content',
      columns: ['title'],
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        summary: fields.text({
          label: 'Summary',
          description: 'One sentence. Used in search results and link previews.',
          multiline: true,
          validation: { length: { max: 200 } },
        }),
        ranked: fields.checkbox({ label: 'Ranked', description: 'Number the films', defaultValue: true }),
        layout: select('Layout', filmLayouts, 'posters'),
        columns: select('Columns (poster grid)', columns, '4'),
        letterboxdCsv: fields.file({
          label: 'Letterboxd export (CSV)',
          description:
            'Optional. Upload a list exported from Letterboxd and its films (with any notes) are used in that order. Films added below then only add notes or poster fixes.',
          directory: 'src/data/letterboxd',
          publicPath: 'src/data/letterboxd/',
        }),
        films: fields.array(
          fields.object({
            ...filmFields,
            note: fields.text({ label: 'Note', description: 'Optional comment shown with the film', multiline: true }),
          }),
          {
            label: 'Films',
            description: 'In order. With a CSV uploaded, use this only to add notes or fix posters for films in it.',
            itemLabel: (props) =>
              `${props.fields.title.value || 'Film'}${props.fields.year.value ? ` (${props.fields.year.value})` : ''}`,
          },
        ),
        letterboxd: fields.url({ label: 'Letterboxd link', description: 'Optional link to the list on Letterboxd' }),
        draft: fields.checkbox({ label: 'Draft', description: 'Drafts are hidden from the live site' }),
        intro: fields.markdoc({
          label: 'Intro',
          description: 'Text and images shown above the films',
          options: { image: { directory: 'src/assets/lists', publicPath: '../../assets/lists/' } },
        }),
      },
    }),
    notes: collection({
      label: 'Notes on film',
      slugField: 'title',
      path: 'src/content/notes/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['title', 'date'],
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date', validation: { isRequired: true }, defaultValue: { kind: 'today' } }),
        film: fields.text({ label: 'Film', description: 'e.g. Film Title (1984)' }),
        summary: fields.text({
          label: 'Summary',
          description: 'One sentence. Shown in search results.',
          multiline: true,
          validation: { isRequired: true, length: { max: 200 } },
        }),
        draft: fields.checkbox({ label: 'Draft', description: 'Drafts are hidden from the live site' }),
        content: fields.markdoc({
          label: 'Content',
          options: {
            image: { directory: 'src/assets/notes', publicPath: '../../assets/notes/' },
          },
        }),
      },
    }),
  },
});
