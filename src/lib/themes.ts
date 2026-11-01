// Site colour themes, chosen in Site settings → Theme. Plain TypeScript so
// the CMS config can import the option lists too.

interface Colours {
  paper: string;
  ink: string;
  muted: string;
  line: string;
}

interface Palette {
  label: string;
  light: Colours;
  dark: Colours;
}

const c = (paper: string, ink: string, muted: string, line: string): Colours => ({ paper, ink, muted, line });

// Revision pages: tinted paper in light mode, a deep version of the same
// tint in dark mode.
const revision = (label: string, paper: string, darkPaper: string, darkInk: string): Palette => ({
  label: `${label} revision pages`,
  light: c(paper, '#1a1a1a', 'color-mix(in srgb, #1a1a1a 55%, ' + paper + ')', 'color-mix(in srgb, #1a1a1a 14%, ' + paper + ')'),
  dark: c(darkPaper, darkInk, 'color-mix(in srgb, ' + darkInk + ' 55%, ' + darkPaper + ')', 'color-mix(in srgb, ' + darkInk + ' 16%, ' + darkPaper + ')'),
});

export const palettes = {
  script: {
    label: 'Script paper (default)',
    light: c('#f7f5f0', '#1a1a1a', '#8a867d', '#e2ded5'),
    dark: c('#121211', '#e9e6df', '#807c73', '#2a2926'),
  },
  stone: {
    label: 'Stone and sage',
    light: c('#d6d1c4', '#2b3328', '#5d6658', '#c2bcad'),
    dark: c('#1a1f19', '#d6d1c4', '#8d9487', '#30382e'),
  },
  blue: revision('Blue', '#dde9f6', '#0f1720', '#d6e4f2'),
  pink: revision('Pink', '#f8dfe8', '#1f1216', '#f3d7e1'),
  yellow: revision('Yellow', '#fbf3c6', '#1c1a0e', '#f4ecc4'),
  green: revision('Green', '#ddf0d6', '#111a10', '#d6ebcf'),
  goldenrod: revision('Goldenrod', '#f3d98c', '#1f1a0b', '#f1dca0'),
  buff: revision('Buff', '#f1e3c8', '#1d1810', '#ecdcc0'),
  salmon: revision('Salmon', '#f8d3c4', '#21140f', '#f3cfc1'),
  cherry: revision('Cherry', '#efb9bd', '#220e10', '#f0c3c6'),
  projection: {
    label: 'Projection booth (amber on black)',
    light: c('#f6efe2', '#3a2a12', '#8f7b58', '#e3d6bd'),
    dark: c('#0d0b08', '#f2d49b', '#8c7752', '#2a2318'),
  },
  darkroom: {
    label: 'Darkroom (red safelight)',
    light: c('#fbeeee', '#5c1410', '#a65b55', '#efd2d0'),
    dark: c('#100505', '#ff6b5a', '#a2463c', '#33130f'),
  },
  noir: {
    label: 'Noir (black and white)',
    light: c('#ffffff', '#000000', '#6b6b6b', '#dddddd'),
    dark: c('#000000', '#ffffff', '#9a9a9a', '#262626'),
  },
} satisfies Record<string, Palette>;

export const accents = {
  ink: { label: 'Ink (no accent)', colour: '' },
  red: { label: 'Typewriter red', colour: '#c0392b' },
  blue: { label: 'Revision blue', colour: '#2f6db5' },
  yellow: { label: 'Highlighter yellow', colour: '#e8b600' },
  green: { label: 'Leader green', colour: '#2e8b57' },
} as const;

export const modes = {
  auto: "Follow the visitor's device",
  light: 'Always light',
  dark: 'Always dark',
} as const;

export const dotColours = {
  sage: { label: 'Sage green', colour: '#586a57' },
  ink: { label: 'Same as text', colour: 'var(--ink)' },
  accent: { label: 'Accent colour', colour: 'var(--accent, var(--ink))' },
} as const;

export const dotSizes = { fine: 'Fine', medium: 'Medium', bold: 'Bold' } as const;
export const dotHeights = { short: 'Short', medium: 'Medium', tall: 'Tall' } as const;

/** Spacing between dot centres (px) and band height (share of the window). */
export const dotSpacing = { fine: 8, medium: 12, bold: 18 } as const;
export const dotBand = { short: 0.38, medium: 0.6, tall: 0.82 } as const;

export type PaletteKey = keyof typeof palettes;
export type AccentKey = keyof typeof accents;
export type Mode = keyof typeof modes;

export const hexPattern = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export interface ThemeSettings {
  palette: { discriminant: PaletteKey | 'custom'; value?: { background?: string; text?: string } | null | undefined };
  accent: { discriminant: AccentKey | 'custom'; value?: { colour?: string } | null | undefined };
  mode: Mode;
  lightsSwitch: boolean;
  dots: DotsSetting;
}

export type DotsSetting =
  | { discriminant: 'off'; value?: unknown }
  | {
      discriminant: 'on';
      value: {
        colour: { discriminant: keyof typeof dotColours | 'custom'; value?: { colour?: string } | null | undefined };
        size: keyof typeof dotSizes;
        height: keyof typeof dotHeights;
        animate: boolean;
      };
    };

export const defaultTheme: ThemeSettings = {
  palette: { discriminant: 'script' },
  accent: { discriminant: 'ink' },
  mode: 'auto',
  lightsSwitch: false,
  dots: { discriminant: 'off' },
};

const valid = (hex: string | undefined) => (hex && hexPattern.test(hex) ? hex : undefined);

function resolvePalette(theme: ThemeSettings): Palette {
  if (theme.palette.discriminant !== 'custom') return palettes[theme.palette.discriminant];
  const paper = valid(theme.palette.value?.background) ?? palettes.script.light.paper;
  const ink = valid(theme.palette.value?.text) ?? palettes.script.light.ink;
  // A custom palette is used as-is in both modes
  const colours = c(paper, ink, `color-mix(in srgb, ${ink} 55%, ${paper})`, `color-mix(in srgb, ${ink} 14%, ${paper})`);
  return { label: 'Custom', light: colours, dark: colours };
}

const vars = (x: Colours, scheme: 'light' | 'dark') =>
  `--paper:${x.paper};--ink:${x.ink};--muted:${x.muted};--line:${x.line};color-scheme:${scheme};`;

/**
 * CSS for the chosen theme. Light/dark follows the setting, the device, or
 * (with the lights switch) the visitor's choice via html[data-mode].
 */
export function themeCss(theme: ThemeSettings) {
  const p = resolvePalette(theme);
  const accent = theme.accent.discriminant === 'custom' ? valid(theme.accent.value?.colour) : accents[theme.accent.discriminant].colour;
  const accentVar = accent ? `--accent:${accent};` : '';
  const dots = theme.dots.discriminant === 'on' ? theme.dots.value.colour : null;
  const dotColour = dots ? (dots.discriminant === 'custom' ? valid(dots.value?.colour) : dotColours[dots.discriminant].colour) : null;
  const dotsVar = dotColour ? `--dots:${dotColour};` : '';

  const css = [`:root{${vars(theme.mode === 'dark' ? p.dark : p.light, theme.mode === 'dark' ? 'dark' : 'light')}${accentVar}${dotsVar}}`];
  if (accent) css.push(`::selection{background:color-mix(in srgb,${accent} 35%,transparent)}`);
  if (theme.mode === 'auto') css.push(`@media (prefers-color-scheme:dark){:root{${vars(p.dark, 'dark')}}}`);
  if (theme.lightsSwitch) {
    css.push(`:root[data-mode="light"]{${vars(p.light, 'light')}}`, `:root[data-mode="dark"]{${vars(p.dark, 'dark')}}`);
  }
  return css.join('');
}

/** Browser UI colour (address bar on phones) for each mode. */
export function themeColours(theme: ThemeSettings) {
  const p = resolvePalette(theme);
  const plainColour = (x: string) => (x.startsWith('#') ? x : undefined);
  return { light: plainColour(p.light.paper), dark: plainColour(p.dark.paper) };
}
