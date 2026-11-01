// Choices shared by the CMS (keystatic.config.ts) and the site, so the two
// can't drift apart. Plain TypeScript: no Astro imports.

const choices = <T extends Record<string, string>>(labels: T) => ({
  labels,
  values: Object.keys(labels) as [keyof T & string, ...(keyof T & string)[]],
  options: Object.entries(labels).map(([value, label]) => ({ value, label })),
});

export const columns = choices({ '1': '1 across', '2': '2 across', '3': '3 across', '4': '4 across' });

export const aspects = choices({
  wide: 'Widescreen 16:9',
  scope: 'Scope 2.39:1',
  classic: 'Classic 4:3',
  square: 'Square 1:1',
  portrait: 'Portrait 4:5',
  poster: 'Poster 2:3',
});

export const aspectRatio: Record<keyof typeof aspects.labels, string> = {
  wide: '16 / 9',
  scope: '2.39 / 1',
  classic: '4 / 3',
  square: '1 / 1',
  portrait: '4 / 5',
  poster: '2 / 3',
};

export const widths = choices({
  script: 'Script column',
  wide: 'Wide',
  full: 'Full width',
});

export const captions = choices({
  full: 'Title, role and description',
  title: 'Title and year only',
  none: 'No captions',
});

export const previews = choices({
  hover: 'Play loops on hover',
  autoplay: 'Autoplay loops when in view',
  off: 'Stills only',
});

export const filmLayouts = choices({
  posters: 'Poster grid',
  list: 'Numbered list with notes',
});

export const ratings = choices({
  '': 'No rating',
  '0.5': '½',
  '1': '★',
  '1.5': '★½',
  '2': '★★',
  '2.5': '★★½',
  '3': '★★★',
  '3.5': '★★★½',
  '4': '★★★★',
  '4.5': '★★★★½',
  '5': '★★★★★',
});

export const transitions = choices({
  '': 'None',
  'CUT TO:': 'CUT TO:',
  'DISSOLVE TO:': 'DISSOLVE TO:',
  'SMASH CUT TO:': 'SMASH CUT TO:',
  'MATCH CUT TO:': 'MATCH CUT TO:',
  'FADE TO:': 'FADE TO:',
  'INTERCUT WITH:': 'INTERCUT WITH:',
});

export const endings = choices({
  '': 'None',
  'FADE OUT.': 'FADE OUT.',
  'FADE TO BLACK.': 'FADE TO BLACK.',
  'CUT TO BLACK.': 'CUT TO BLACK.',
});

export type Columns = (typeof columns.values)[number];
export type Aspect = (typeof aspects.values)[number];
export type Width = (typeof widths.values)[number];
export type Captions = (typeof captions.values)[number];
export type Preview = (typeof previews.values)[number];
export type FilmLayout = (typeof filmLayouts.values)[number];
