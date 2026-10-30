import { config, fields, collection, singleton } from '@keystatic/core';

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

export default config({
  storage: githubRepo ? { kind: 'github', repo: githubRepo } : { kind: 'local' },
  ui: {
    brand: { name: 'Liams Portfolio' },
    navigation: {
      Pages: ['home'],
      Content: ['work', 'notes'],
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
              label: 'Script',
              itemLabel: (props) =>
                `Script: ${props.fields.lines.elements[0]?.fields.text.value.slice(0, 40) || 'empty'}`,
              schema: fields.object({
                typewriter: fields.checkbox({
                  label: 'Type out on load',
                  description: 'Only the first script on the page types itself out.',
                  defaultValue: true,
                }),
                lines: fields.array(scriptElement, {
                  label: 'Lines',
                  itemLabel: (props) =>
                    `${elementLabels[props.fields.kind.value as keyof typeof elementLabels]}: ${props.fields.text.value.slice(0, 50)}`,
                }),
              }),
            },
            transition: {
              label: 'Transition',
              itemLabel: (props) => `Transition: ${props.fields.text.value}`,
              schema: fields.object({
                text: fields.text({ label: 'Text', description: 'e.g. CUT TO:, DISSOLVE TO:, FADE OUT.', defaultValue: 'CUT TO:' }),
              }),
            },
            watching: {
              label: 'Recently watched (Letterboxd)',
              itemLabel: (props) => props.fields.heading.value || 'Recently watched',
              schema: fields.object({
                heading: sceneHeading('INT. SCREENING ROOM — NIGHT'),
                username: fields.text({ label: 'Letterboxd username', description: 'Hidden on the live site while empty.' }),
                count: fields.integer({ label: 'How many films', defaultValue: 4, validation: { min: 1, max: 12 } }),
              }),
            },
            work: {
              label: 'Work',
              itemLabel: (props) => props.fields.heading.value || 'Work',
              schema: fields.object({
                heading: sceneHeading('INT. WORK — DAY'),
                items: fields.array(fields.relationship({ label: 'Project', collection: 'work' }), {
                  label: 'Projects',
                  description: 'Pick and drag into order. Leave empty to show every project, newest first.',
                  itemLabel: (props) => props.value ?? 'Choose a project',
                }),
              }),
            },
            notes: {
              label: 'Notes on film',
              itemLabel: (props) => props.fields.heading.value || 'Notes',
              schema: fields.object({
                heading: sceneHeading('INT. NOTES ON FILM — NIGHT'),
                limit: fields.integer({ label: 'How many notes', description: 'Leave empty to show all.' }),
              }),
            },
            text: {
              label: 'Text',
              itemLabel: (props) => props.fields.heading.value || 'Text',
              schema: fields.object({
                heading: sceneHeading('INT. ANYWHERE — DAY'),
                body: fields.text({ label: 'Text', description: 'Leave a blank line between paragraphs.', multiline: true }),
              }),
            },
            contact: {
              label: 'Contact',
              itemLabel: (props) => props.fields.heading.value || 'Contact',
              schema: fields.object({
                heading: sceneHeading('EXT. CONTACT — DAY'),
              }),
            },
          },
          { label: 'Blocks', description: 'Add, remove and drag to reorder.' },
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
        link: fields.url({ label: 'Link', description: 'Vimeo, YouTube, or wherever it lives' }),
        image: fields.image({
          label: 'Still',
          directory: 'src/assets/work',
          publicPath: '../../assets/work/',
        }),
        imageAlt: fields.text({ label: 'Still description (alt text)' }),
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
