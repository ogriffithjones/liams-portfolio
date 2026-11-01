// Screenplay excerpts for work pages. Two sources:
// - Final Draft .fdx (e.g. WriterDuet's export): element types and
//   bold/italic/underline are read exactly.
// - Pasted text or .fountain: element types are inferred the way the Fountain
//   format does (INT./EXT. headings, ALL CAPS character cues, (parentheticals),
//   TO: transitions), with *italic*, **bold** and _underline_.
// Both produce the same elements, rendered with the site's script styles.

import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

export type Kind = 'scene' | 'action' | 'character' | 'parenthetical' | 'dialogue' | 'transition' | 'centered' | 'shot' | 'gap' | 'continued-top' | 'continued-bottom';

export interface Element {
  kind: Kind;
  /** Escaped HTML with <strong>/<em>/<u> only */
  html: string;
  /** Scene number from the source script, if it had one */
  scene?: string;
  /** Side-by-side (dual) dialogue column */
  dual?: 'left' | 'right';
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const decodeXml = (s: string) =>
  s
    .replace(/&#x([\da-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

// ---------------------------------------------------------------- Final Draft

const fdxKinds: Record<string, Kind> = {
  'Scene Heading': 'scene',
  Action: 'action',
  General: 'action',
  'Cast List': 'action',
  Character: 'character',
  Parenthetical: 'parenthetical',
  Dialogue: 'dialogue',
  Lyrics: 'dialogue',
  Transition: 'transition',
  Shot: 'shot',
  'New Act': 'centered',
  'End of Act': 'centered',
};

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

export function parseFdx(xml: string): Element[] {
  const body = xml.match(/<Content>([\s\S]*?)<\/Content>/)?.[1] ?? xml;
  const elements: Element[] = [];
  let dual: { open: boolean; side: 'left' | 'right' } = { open: false, side: 'left' };

  for (const [token] of body.matchAll(/<DualDialogue>|<\/DualDialogue>|<Paragraph\b[^>]*>[\s\S]*?<\/Paragraph>|<Paragraph\b[^>]*\/>/g)) {
    if (token === '<DualDialogue>') {
      dual = { open: true, side: 'left' };
      continue;
    }
    if (token === '</DualDialogue>') {
      dual = { open: false, side: 'left' };
      continue;
    }
    const open = token.match(/^<Paragraph\b[^>]*>/)![0];
    const type = attr(open, 'Type') ?? 'Action';
    let kind = fdxKinds[type] ?? 'action';
    if (attr(open, 'Alignment') === 'Center' && kind === 'action') kind = 'centered';

    const html = [...token.matchAll(/<Text\b([^>]*)>([\s\S]*?)<\/Text>/g)]
      .map(([, attrs, raw]) => {
        const style = attrs?.match(/Style="([^"]*)"/)?.[1]?.split('+') ?? [];
        let text = escape(decodeXml(raw ?? ''));
        if (style.includes('AllCaps')) text = text.toUpperCase();
        if (style.includes('Underline')) text = `<u>${text}</u>`;
        if (style.includes('Italic')) text = `<em>${text}</em>`;
        if (style.includes('Bold')) text = `<strong>${text}</strong>`;
        return text;
      })
      .join('');
    if (!html.replace(/<[^>]+>/g, '').trim()) continue;

    // In a dual block, the second character cue starts the right column
    if (dual.open && kind === 'character' && elements.at(-1)?.dual === 'left') dual.side = 'right';
    const scene = kind === 'scene' ? attr(open, 'Number') : undefined;
    elements.push({ kind, html, ...(scene ? { scene } : {}), ...(dual.open ? { dual: dual.side } : {}) });
  }
  return elements;
}

// ---------------------------------------------------------------- Fountain / pasted text

const emphasis = (text: string) =>
  escape(text)
    .replace(/\\\*/g, '&#42;')
    .replace(/\\_/g, '&#95;')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<u>$1</u>');

const titleKeys = /^(title|credit|author|authors|source|draft date|date|contact|notes|copyright|revision):/i;
const sceneRe = /^(int|ext|est|int\.?\/ext|i\/e)[.\s]/i;
const transitionRe = /^[A-Z0-9 .'’-]+(TO:|OUT\.|TO BLACK\.)$/;
const isUpper = (s: string) => /[A-Z]/.test(s) && s === s.toUpperCase();
/** "NAME", "NAME (V.O.)", "NAME (CONT'D)": capitals before any extension */
const isCue = (s: string) => {
  const name = s.replace(/\s*\(.*\)\s*$/, '').replace(/\^$/, '').trim();
  return name.length > 0 && name.length <= 40 && isUpper(name) && !/[.!?:]$/.test(name);
};

export function parseFountain(source: string): Element[] {
  let text = source.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
  text = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\[\[[\s\S]*?\]\]/g, '');

  const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
  // Optional title page: "Key: value" lines up to the first blank line
  if (titleKeys.test(lines[0] ?? '')) {
    const end = lines.findIndex((l) => l === '');
    lines.splice(0, end === -1 ? lines.length : end + 1);
  }

  const elements: Element[] = [];
  let inDialogue = false;
  let dualSide: 'left' | 'right' | undefined;
  const push = (kind: Kind, raw: string, extra: Partial<Element> = {}) =>
    elements.push({ kind, html: emphasis(raw), ...extra, ...(dualSide ? { dual: dualSide } : {}) });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    const prevBlank = i === 0 || lines[i - 1]!.trim() === '';
    const next = lines[i + 1]?.trim() ?? '';

    if (!trimmed) {
      inDialogue = false;
      if (dualSide === 'right') dualSide = undefined;
      continue;
    }
    // Sections, synopses and page breaks don't print
    if (/^#/.test(trimmed) || /^=(?!==)/.test(trimmed) || /^={3,}$/.test(trimmed)) continue;

    if (inDialogue) {
      if (/^\(.*\)$/.test(trimmed)) push('parenthetical', trimmed);
      else {
        const last = elements.at(-1);
        // Consecutive dialogue lines are one speech
        if (last?.kind === 'dialogue') last.html += '\n' + emphasis(trimmed);
        else push('dialogue', trimmed);
      }
      continue;
    }

    // Forced elements
    if (/^\.[^.]/.test(trimmed)) {
      const [, heading, num] = trimmed.slice(1).match(/^(.*?)\s*(?:#([\w.-]+)#)?$/)!;
      push('scene', heading!, num ? { scene: num } : {});
      continue;
    }
    if (trimmed.startsWith('!')) {
      push('action', trimmed.slice(1));
      continue;
    }
    if (/^>.*<$/.test(trimmed)) {
      push('centered', trimmed.slice(1, -1).trim());
      continue;
    }
    if (trimmed.startsWith('>')) {
      push('transition', trimmed.slice(1).trim());
      continue;
    }
    if (trimmed.startsWith('~')) {
      push('dialogue', `*${trimmed.slice(1).trim()}*`);
      continue;
    }

    if (sceneRe.test(trimmed)) {
      const [, heading, num] = trimmed.match(/^(.*?)\s*(?:#([\w.-]+)#)?$/)!;
      push('scene', heading!.toUpperCase(), num ? { scene: num } : {});
      continue;
    }
    if (transitionRe.test(trimmed) && (prevBlank || !next)) {
      push('transition', trimmed);
      continue;
    }
    if ((trimmed.startsWith('@') || (isCue(trimmed) && prevBlank)) && next) {
      const cue = trimmed.replace(/^@/, '');
      if (cue.endsWith('^')) {
        // Dual dialogue: this speech goes beside the previous one
        const start = elements.findLastIndex((e) => e.kind === 'character');
        for (let j = Math.max(start, 0); j < elements.length; j++) elements[j]!.dual = 'left';
        dualSide = 'right';
      }
      push('character', cue.replace(/\s*\^$/, ''));
      inDialogue = true;
      continue;
    }

    // Action: consecutive lines stay one paragraph, keeping line breaks
    const last = elements.at(-1);
    if (last?.kind === 'action' && !prevBlank) last.html += '\n' + emphasis(trimmed);
    else push('action', trimmed);
  }
  return elements;
}

// ---------------------------------------------------------------- scene selection

const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');

/**
 * Keep the chosen scenes, in the order they were typed. The spec is a comma
 * list of scene numbers (3), ranges (5-8, 12-) and words from a heading
 * (KITCHEN). Anything before the first heading (FADE IN:, etc.) goes with
 * scene 1. Scenes keep their number from the full script.
 */
export interface Selection {
  elements: Element[];
  /** The selection leaves out the start / end of the script */
  cutStart: boolean;
  cutEnd: boolean;
}

export function selectScenes(elements: Element[], spec: string, { gaps = true } = {}): Selection {
  const scenes: Element[][] = [[]];
  for (const el of elements) {
    if (el.kind === 'scene') scenes.push([]);
    scenes.at(-1)!.push(el);
  }
  const count = scenes.length - 1;
  const heading = (n: number) => plain(scenes[n]![0]!.html).toUpperCase();

  const order: number[] = [];
  for (const token of spec.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean)) {
    const range = token.match(/^(\d+)\s*(?:[-–]\s*(\d*))?$/);
    let picked: number[] = [];
    if (range) {
      const from = Number(range[1]);
      const to = range[2] === undefined ? from : range[2] === '' ? count : Number(range[2]);
      for (let n = Math.max(from, 1); n <= Math.min(to, count); n++) picked.push(n);
    } else {
      const words = token.toUpperCase();
      for (let n = 1; n <= count; n++) if (heading(n).includes(words)) picked.push(n);
    }
    for (const n of picked) if (!order.includes(n)) order.push(n);
  }

  if (!order.length) {
    console.warn(`[excerpt] Scenes "${spec}" matched nothing; showing the whole script`);
    return { elements, cutStart: false, cutEnd: false };
  }

  const out: Element[] = [];
  order.forEach((n, i) => {
    if (gaps && i > 0 && n !== order[i - 1]! + 1) out.push({ kind: 'gap', html: '…' });
    if (n === 1) out.push(...scenes[0]!);
    for (const el of scenes[n]!) out.push(el.kind === 'scene' && !el.scene ? { ...el, scene: String(n) } : el);
  });
  return { elements: out, cutStart: Math.min(...order) > 1, cutEnd: Math.max(...order) < count };
}

// ---------------------------------------------------------------- loading

type Show = { discriminant: 'all' | 'off'; value?: unknown } | { discriminant: 'chosen'; value: { scenes: string; gaps: boolean } };
type Marks = 'auto' | 'both' | 'start' | 'end' | 'none';
type Source = {
  excerpt?: string | undefined;
  excerptFile?: string | null | undefined;
  excerptShow?: Show | undefined;
  excerptMarks?: Marks | undefined;
};

/** Script files we can read; anything else (PDF, Word…) is ignored, not mangled. */
const readable = (file: string | null | undefined) =>
  !!file && ['.fdx', '.fountain', '.spmd', '.txt'].includes(extname(file).toLowerCase());

export async function loadExcerpt(data: Source) {
  let elements: Element[] = [];
  if (readable(data.excerptFile)) {
    const file = await readFile(resolve(process.cwd(), data.excerptFile!.replace(/^\/+/, '')), 'utf8');
    elements = extname(data.excerptFile!).toLowerCase() === '.fdx' ? parseFdx(file) : parseFountain(file);
  } else {
    if (data.excerptFile) console.warn(`[excerpt] ${data.excerptFile}: only .fdx and .fountain files can be shown`);
    if (data.excerpt?.trim()) elements = parseFountain(data.excerpt);
  }
  const show = data.excerptShow;
  const chosen =
    show?.discriminant === 'chosen' && show.value.scenes.trim()
      ? selectScenes(elements, show.value.scenes, { gaps: show.value.gaps })
      : { elements, cutStart: false, cutEnd: false };

  // CONTINUED markers, as on a script page that carries on from / to another
  const marks = data.excerptMarks ?? 'auto';
  const top = marks === 'both' || marks === 'start' || (marks === 'auto' && chosen.cutStart);
  const bottom = marks === 'both' || marks === 'end' || (marks === 'auto' && chosen.cutEnd);
  if (!chosen.elements.length) return [];
  return [
    ...(top ? [{ kind: 'continued-top' as const, html: 'CONTINUED:' }] : []),
    ...chosen.elements,
    ...(bottom ? [{ kind: 'continued-bottom' as const, html: '(CONTINUED)' }] : []),
  ];
}

/** Whether a project has a script to show (and it isn't switched off). */
export const hasExcerpt = (data: Source) =>
  data.excerptShow?.discriminant !== 'off' && (readable(data.excerptFile) || Boolean(data.excerpt?.trim()));
