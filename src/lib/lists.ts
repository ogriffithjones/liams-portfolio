import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CollectionEntry } from 'astro:content';
import { getPoster, type Poster } from './tmdb';

export interface ListFilm {
  title: string;
  year: number | null;
  note: string;
  url: string | null;
  poster: Poster | null;
}

/** Minimal RFC 4180 CSV parser (quoted fields, commas and newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') row.push(field), (field = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  return rows;
}

/**
 * Films from a Letterboxd list export. The file has a list header
 * (Date,Name,Tags,URL,Description) then the films (Position,Name,Year,URL,Description).
 */
export function filmsFromLetterboxdCsv(text: string) {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const header = rows.findIndex((r) => r.includes('Name') && r.includes('Year'));
  if (header === -1) return [];
  const col = (name: string) => rows[header]!.indexOf(name);
  const [name, year, url, note] = [col('Name'), col('Year'), col('URL'), col('Description')];
  return rows
    .slice(header + 1)
    .filter((r) => r[name]?.trim())
    .map((r) => ({
      title: r[name]!.trim(),
      year: Number(r[year]) || null,
      url: r[url]?.trim() || null,
      note: note >= 0 ? (r[note]?.trim() ?? '') : '',
    }));
}

const key = (title: string, year: number | null | undefined) =>
  `${title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${year ?? ''}`;

/** A list's films in order, with notes merged and posters attached. */
export async function getListFilms(list: CollectionEntry<'lists'>): Promise<ListFilm[]> {
  const manual = list.data.films;
  let films: { title: string; year: number | null; url: string | null; note: string; tmdbId?: number | null | undefined }[];

  if (list.data.letterboxdCsv) {
    const path = resolve(process.cwd(), list.data.letterboxdCsv.replace(/^\/+/, ''));
    const csv = filmsFromLetterboxdCsv(await readFile(path, 'utf8'));
    // Films added in the CMS add notes or poster fixes to matching CSV films
    const extras = new Map(manual.map((f) => [key(f.title, f.year), f]));
    const byTitle = new Map(manual.map((f) => [key(f.title, null), f]));
    films = csv.map((film) => {
      const extra = extras.get(key(film.title, film.year)) ?? byTitle.get(key(film.title, null));
      return { ...film, note: extra?.note || film.note, tmdbId: extra?.tmdbId };
    });
  } else {
    films = manual.map((f) => ({ title: f.title, year: f.year ?? null, url: null, note: f.note, tmdbId: f.tmdbId }));
  }

  return Promise.all(
    films.map(async (f) => ({
      title: f.title,
      year: f.year,
      note: f.note,
      url: f.url,
      poster: await getPoster(f),
    })),
  );
}
