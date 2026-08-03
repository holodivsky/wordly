import type { Article, NewWord, PartOfSpeech } from './types';

export interface ParseResult {
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
    return { words: [], errors: ['Немає даних для імпорту.'] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerCells = lines[0].split(delimiter).map((c) => c.trim().toLowerCase());
  const fieldByColumn: (Field | null)[] = headerCells.map((c) => HEADER_ALIASES[c] ?? null);

  const hasGerman = fieldByColumn.includes('german');
  const hasTranslation = fieldByColumn.includes('translation');

  if (!hasGerman || !hasTranslation) {
    return {
      words: [],
      errors: [
        'Не вдалося розпізнати заголовки колонок. Потрібні щонайменше колонки "german" (німецьке слово) та "translation" (переклад). Перегляньте приклад формату нижче.',
      ],
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
      errors.push(`Рядок ${i + 1}: пропущено — відсутнє слово або переклад.`);
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
