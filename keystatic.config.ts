import { config, fields, collection, singleton } from '@keystatic/core';
import { aspects, captions, columns, endings, filmLayouts, previews, ratings, transitions, widths } from './src/lib/options';
import { editorialComponents } from './src/lib/editorial';
import { accents, dotColours, dotHeights, dotSizes, hexPattern, modes, palettes } from './src/lib/themes';

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

const address = (label: string, defaultValue: string, description?: string) =>
  fields.text({
    label,
    defaultValue,
    description: description ?? `Lower-case letters, numbers and dashes, e.g. ${defaultValue}`,
    validation: { isRequired: true, pattern: { regex: /^[a-z0-9]+(-[a-z0-9]+)*$/, message: 'Use lower-case letters, numbers and dashes only' } },
  });

const navLabel = (defaultValue: string) => fields.text({ label: 'Tab label', defaultValue });

const noFields = <K extends string>(keys: K[]) =>
  Object.fromEntries(keys.map((k) => [k, fields.empty()])) as Record<K, ReturnType<typeof fields.empty>>;

const hex = (label: string, description: string) =>
  fields.text({
    label,
    description,
    validation: { isRequired: true, pattern: { regex: hexPattern, message: 'Use a hex colour like #1a1a1a' } },
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

// The building blocks for the home page and every other page
const pageBlocks = fields.blocks(
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
  );

const pageEnding = fields.object(
    {
      transition: select('Final transition', endings, 'FADE OUT.'),
      theEnd: fields.checkbox({ label: 'Show THE END', defaultValue: true }),
    },
    { label: 'Ending', description: 'Printed after the last block.' },
  );

export default config({
  storage: githubRepo ? { kind: 'github', repo: githubRepo } : { kind: 'local' },
  ui: {
    brand: { name: 'Liams Portfolio' },
    navigation: {
      Pages: ['home', 'pages'],
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
        blocks: pageBlocks,
        ending: pageEnding,
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
        sections: fields.object(
          {
            notesLabel: fields.text({ label: 'Notes: name', description: 'e.g. Notes on film, Opinion pieces', defaultValue: 'Notes on film' }),
            notesPath: address('Notes: address', 'notes', 'The page listing them, and each one at /address/piece. e.g. opinion'),
            notesPage: fields.checkbox({ label: 'Notes: publish a page listing them all', defaultValue: true }),
            reviewsLabel: fields.text({ label: 'Reviews: name', defaultValue: 'Reviews' }),
            reviewsPath: address('Reviews: address', 'reviews'),
            listsPath: address('Film lists: address', 'lists'),
            workPath: address('Project pages: address', 'work'),
          },
          {
            label: 'Sections',
            description: 'Names and web addresses. Changing an address changes every link to it; old addresses stop working.',
          },
        ),
        nav: fields.object(
          {
            show: fields.checkbox({
              label: 'Show navigation',
              description: 'A small bar at the top of every page: your name (links home) and the tabs below.',
            }),
            items: fields.array(
              fields.conditional(
                fields.select({
                  label: 'Tab goes to',
                  options: [
                    { label: 'Home', value: 'home' },
                    { label: 'Notes / opinion pieces', value: 'notes' },
                    { label: 'Reviews', value: 'reviews' },
                    { label: 'A page', value: 'page' },
                    { label: 'Another website', value: 'link' },
                  ],
                  defaultValue: 'page',
                }),
                {
                  home: fields.object({ label: navLabel('Portfolio') }),
                  notes: fields.object({ label: navLabel('Opinion') }),
                  reviews: fields.object({ label: navLabel('Reviews') }),
                  page: fields.object({ page: fields.relationship({ label: 'Page', collection: 'pages' }), label: navLabel('') }),
                  link: fields.object({ url: fields.url({ label: 'Address', validation: { isRequired: true } }), label: navLabel('') }),
                },
              ),
              {
                label: 'Tabs',
                description: 'In order. Drag to reorder.',
                itemLabel: (props) =>
                  `${props.value.fields.label.value || ('page' in props.value.fields ? props.value.fields.page.value : '') || props.discriminant} → ${props.discriminant}`,
              },
            ),
          },
          { label: 'Navigation' },
        ),
        theme: fields.object(
          {
            palette: fields.conditional(
              fields.select({
                label: 'Palette',
                description: 'Revision colours are the page colours film productions use for each round of script changes.',
                options: [
                  ...Object.entries(palettes).map(([value, p]) => ({ value, label: p.label })),
                  { value: 'custom', label: 'Custom colours' },
                ],
                defaultValue: 'script',
              }),
              {
                ...noFields(Object.keys(palettes) as (keyof typeof palettes)[]),
                custom: fields.object({
                  background: hex('Background colour', 'e.g. #f7f5f0'),
                  text: hex('Text colour', 'e.g. #1a1a1a'),
                }),
              },
            ),
            mode: fields.select({
              label: 'Light or dark',
              options: Object.entries(modes).map(([value, label]) => ({ value, label })),
              defaultValue: 'auto',
            }),
            accent: fields.conditional(
              fields.select({
                label: 'Accent colour',
                description: 'Used for scene numbers, link underlines, the typing cursor and selected text.',
                options: [
                  ...Object.entries(accents).map(([value, a]) => ({ value, label: a.label })),
                  { value: 'custom', label: 'Custom colour' },
                ],
                defaultValue: 'ink',
              }),
              {
                ...noFields(Object.keys(accents) as (keyof typeof accents)[]),
                custom: fields.object({ colour: hex('Accent colour', 'e.g. #c0392b') }),
              },
            ),
            lightsSwitch: fields.checkbox({
              label: 'LIGHTS OFF / LIGHTS ON switch',
              description: 'Adds a switch in the footer so visitors can flip between light and dark themselves.',
            }),
            dots: fields.conditional(
              fields.checkbox({
                label: 'Halftone dots',
                description: 'Printed dots across the top of every page, fading down the page and dissolving as you scroll.',
              }),
              {
                false: fields.empty(),
                true: fields.object({
                  colour: fields.conditional(
                    fields.select({
                      label: 'Dot colour',
                      options: [
                        ...Object.entries(dotColours).map(([value, d]) => ({ value, label: d.label })),
                        { value: 'custom', label: 'Custom colour' },
                      ],
                      defaultValue: 'sage',
                    }),
                    {
                      ...noFields(Object.keys(dotColours) as (keyof typeof dotColours)[]),
                      custom: fields.object({ colour: hex('Dot colour', 'e.g. #586a57') }),
                    },
                  ),
                  size: fields.select({
                    label: 'Dot size',
                    options: Object.entries(dotSizes).map(([value, label]) => ({ value, label })),
                    defaultValue: 'medium',
                  }),
                  height: fields.select({
                    label: 'How far down the page',
                    options: Object.entries(dotHeights).map(([value, label]) => ({ value, label })),
                    defaultValue: 'medium',
                  }),
                  animate: fields.checkbox({
                    label: 'Animate',
                    description: 'Print in on load and dissolve on scroll. Visitors who prefer reduced motion see still dots.',
                    defaultValue: true,
                  }),
                }),
              },
            ),
          },
          { label: 'Theme', description: 'Colours for the whole site. Leave as is for the original look.' },
        ),
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
    pages: collection({
      label: 'Pages',
      slugField: 'title',
      path: 'src/content/pages/*',
      format: { data: 'yaml' },
      columns: ['title'],
      schema: {
        title: fields.slug({
          name: { label: 'Title' },
          slug: { label: 'Address', description: 'The page lives at /address. e.g. about' },
        }),
        description: fields.text({ label: 'Search description', multiline: true, validation: { length: { max: 200 } } }),
        showTitle: fields.checkbox({ label: 'Show the title at the top', defaultValue: true }),
        blocks: pageBlocks,
        ending: pageEnding,
      },
    }),
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
        fullScript: fields.select({
          label: 'Full script',
          description:
            'What the project page offers beyond the excerpt. "Request" opens an email to you, so you decide who reads it. "Link" uses the Link field above and makes it public.',
          options: [
            { label: 'Request by email', value: 'request' },
            { label: 'Link (public)', value: 'link' },
            { label: "Don't mention it", value: 'none' },
          ],
          defaultValue: 'request',
        }),
        excerptShow: fields.conditional(
          fields.select({
            label: 'Script on site',
            description: 'Whether the script excerpt or file above appears on the project’s page.',
            options: [
              { label: 'Whole script', value: 'all' },
              { label: 'Chosen scenes', value: 'chosen' },
              { label: 'Off (keep it, don’t show it)', value: 'off' },
            ],
            defaultValue: 'all',
          }),
          {
            all: fields.empty(),
            off: fields.empty(),
            chosen: fields.object({
              scenes: fields.text({
                label: 'Scenes',
                description:
                  'Any mix, in the order you want them shown, separated by commas: scene numbers (3), ranges (5-8, or 12- for the rest), or words from a scene heading (KITCHEN). The whole uploaded file is still stored in the public GitHub repo, so trim private scripts before uploading.',
              }),
              gaps: fields.checkbox({
                label: 'Mark skipped scenes with …',
                description: 'Shown between scenes that aren’t next to each other in the script.',
                defaultValue: true,
              }),
            }),
          },
        ),
        excerptMarks: fields.select({
          label: 'Continued markers',
          description:
            'CONTINUED: at the top and (CONTINUED) at the bottom, so readers know the excerpt is part of a longer script. Automatic adds them when chosen scenes leave out the start or end.',
          options: [
            { label: 'Automatic', value: 'auto' },
            { label: 'Start and end', value: 'both' },
            { label: 'Start only', value: 'start' },
            { label: 'End only', value: 'end' },
            { label: 'None', value: 'none' },
          ],
          defaultValue: 'auto',
        }),
        excerptLabel: fields.conditional(
          fields.select({
            label: 'Script label',
            description: 'Shown above the script on the project page, and used in the "Read…" link. Automatic says Excerpt when CONTINUED markers show, otherwise Script.',
            options: [
              { label: 'Automatic', value: 'auto' },
              { label: 'Excerpt', value: 'excerpt' },
              { label: 'Full script', value: 'script' },
              { label: 'Custom', value: 'custom' },
              { label: 'None', value: 'none' },
            ],
            defaultValue: 'auto',
          }),
          {
            auto: fields.empty(),
            excerpt: fields.empty(),
            script: fields.empty(),
            none: fields.empty(),
            custom: fields.object({
              text: fields.text({ label: 'Label', description: 'e.g. Cold open, Pilot — Act One', validation: { isRequired: true } }),
            }),
          },
        ),
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
          components: editorialComponents('src/assets/reviews', '../../assets/reviews/'),
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
      label: 'Notes / opinion pieces',
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
          description: 'One sentence. Shown in lists and search results.',
          multiline: true,
          validation: { isRequired: true, length: { max: 200 } },
        }),
        standfirst: fields.text({
          label: 'Standfirst',
          description: 'Optional. The line under the headline that sets up the piece.',
          multiline: true,
        }),
        byline: fields.text({ label: 'Byline', description: 'Leave empty to use your name.' }),
        lead: fields.object(
          {
            image: fields.image({ label: 'Lead image', directory: 'src/assets/notes', publicPath: '../../assets/notes/' }),
            alt: fields.text({ label: 'Description (alt text)' }),
            caption: fields.text({ label: 'Caption', multiline: true }),
            credit: fields.text({ label: 'Credit', description: 'e.g. Paris, Texas (1984), Road Movies / 20th Century Fox' }),
          },
          { label: 'Lead image', description: 'Optional. Shown large under the headline.' },
        ),
        spoilers: fields.checkbox({ label: 'Spoiler warning', description: 'Shows a warning at the top of the piece.' }),
        dropCap: fields.checkbox({ label: 'Drop cap', description: 'Large first letter on the opening paragraph.' }),
        filmBox: fields.object(
          {
            show: fields.checkbox({ label: 'Show a film details box', description: 'At the end of the piece, titled with the Film above.' }),
            director: fields.text({ label: 'Director' }),
            runtime: fields.text({ label: 'Runtime', description: 'e.g. 2h 25m' }),
            country: fields.text({ label: 'Country' }),
            where: fields.text({ label: 'Where to watch', description: 'e.g. In cinemas, Netflix' }),
            link: fields.url({ label: 'Link', description: 'e.g. Letterboxd or IMDb' }),
          },
          { label: 'Film details' },
        ),
        draft: fields.checkbox({ label: 'Draft', description: 'Drafts are hidden from the live site' }),
        content: fields.markdoc({
          label: 'Content',
          options: {
            image: { directory: 'src/assets/notes', publicPath: '../../assets/notes/' },
          },
          components: editorialComponents('src/assets/notes', '../../assets/notes/'),
        }),
      },
    }),
  },
});
