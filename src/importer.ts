import type { Article, NewWord, PartOfSpeech, WordList } from './types';
import { t } from './i18n';

export interface ParseResult {
  words: NewWord[];
  errors: string[];
}

export interface JsonParseResult {
  name: string | null;
  words: NewWord[];
  errors: string[];
}

type Field = 'german' | 'article' | 'translation' | 'partOfSpeech';

const HEADER_ALIASES: Record<string, Field> = {
  german: 'german',
  deutsch: 'german',
  wort: 'german',
  word: 'german',

  article: 'article',
  artikel: 'article',

  translation: 'translation',
  übersetzung: 'translation',
  ubersetzung: 'translation',
  translate: 'translation',
  переклад: 'translation',
  ukrainian: 'translation',
  укр: 'translation',

  partofspeech: 'partOfSpeech',
  pos: 'partOfSpeech',
  wortart: 'partOfSpeech',
  'part of speech': 'partOfSpeech',
  частинамови: 'partOfSpeech',
  'частина мови': 'partOfSpeech',
};

const POS_ALIASES: Record<string, PartOfSpeech> = {
  nomen: 'Nomen',
  noun: 'Nomen',
  substantiv: 'Nomen',
  іменник: 'Nomen',

  verb: 'Verb',
  дієслово: 'Verb',
  дiєслово: 'Verb',

  adjektiv: 'Adjektiv',
  adjective: 'Adjektiv',
  прикметник: 'Adjektiv',

  adverb: 'Adverb',
  прислівник: 'Adverb',

  pronomen: 'Pronomen',
  pronoun: 'Pronomen',
  займенник: 'Pronomen',

  präposition: 'Präposition',
  praposition: 'Präposition',
  preposition: 'Präposition',
  прийменник: 'Präposition',

  konjunktion: 'Konjunktion',
  conjunction: 'Konjunktion',
  сполучник: 'Konjunktion',

  numerale: 'Numerale',
  numeral: 'Numerale',
  числівник: 'Numerale',

  interjektion: 'Interjektion',
  interjection: 'Interjektion',
  вигук: 'Interjektion',
};

function detectDelimiter(line: string): string {
  const candidates = ['\t', ';', ','];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    const count = line.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function normalizePos(raw: string): PartOfSpeech {
  const key = raw.trim().toLowerCase();
  return POS_ALIASES[key] ?? 'Sonstiges';
}

function normalizeArticle(raw: string): Article | null {
  const key = raw.trim().toLowerCase();
  if (key === 'der' || key === 'die' || key === 'das') return key;
  return null;
}

export function parseTable(raw: string): ParseResult {
  const lines = raw
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { words: [], errors: [t('impNoData')] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerCells = lines[0].split(delimiter).map((c) => c.trim().toLowerCase());
  const fieldByColumn: (Field | null)[] = headerCells.map((c) => HEADER_ALIASES[c] ?? null);

  const hasGerman = fieldByColumn.includes('german');
  const hasTranslation = fieldByColumn.includes('translation');

  if (!hasGerman || !hasTranslation) {
    return {
      words: [],
      errors: [t('impBadHeaders')],
    };
  }

  const words: NewWord[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map((c) => c.trim());
    const row: Record<Field, string> = { german: '', article: '', translation: '', partOfSpeech: '' };

    fieldByColumn.forEach((field, colIdx) => {
      if (field && cells[colIdx] !== undefined) {
        row[field] = cells[colIdx];
      }
    });

    if (!row.german || !row.translation) {
      errors.push(t('impRowSkipped', { n: i + 1 }));
      continue;
    }

    words.push({
      german: row.german,
      article: normalizeArticle(row.article),
      translation: row.translation,
      partOfSpeech: normalizePos(row.partOfSpeech),
    });
  }

  return { words, errors };
}

/** Parses the JSON shape produced by `listToJsonString` (or a bare array of word objects). */
export function parseJsonList(raw: string): JsonParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { name: null, words: [], errors: [t('impBadJson')] };
  }

  let name: string | null = null;
  let rawWords: unknown;

  if (Array.isArray(data)) {
    rawWords = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.name === 'string') name = obj.name;
    rawWords = obj.words;
  }

  if (!Array.isArray(rawWords)) {
    return { name, words: [], errors: [t('impNoWordsArray')] };
  }

  const words: NewWord[] = [];
  const errors: string[] = [];

  rawWords.forEach((item, i) => {
    if (!item || typeof item !== 'object') {
      errors.push(t('impBadItem', { n: i + 1 }));
      return;
    }
    const obj = item as Record<string, unknown>;
    const german = typeof obj.german === 'string' ? obj.german.trim() : '';
    const translation = typeof obj.translation === 'string' ? obj.translation.trim() : '';
    if (!german || !translation) {
      errors.push(t('impItemSkipped', { n: i + 1 }));
      return;
    }
    words.push({
      german,
      article: typeof obj.article === 'string' ? normalizeArticle(obj.article) : null,
      translation,
      partOfSpeech: typeof obj.partOfSpeech === 'string' ? normalizePos(obj.partOfSpeech) : 'Sonstiges',
    });
  });

  return { name, words, errors };
}

/** Serializes a list's words (without personal learning stats) to a shareable JSON string. */
export function listToJsonString(list: Pick<WordList, 'name' | 'words'>): string {
  const exportShape = {
    name: list.name,
    words: list.words.map((w) => ({
      german: w.german,
      article: w.article,
      translation: w.translation,
      partOfSpeech: w.partOfSpeech,
    })),
  };
  return JSON.stringify(exportShape, null, 2);
}
