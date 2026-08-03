export type PartOfSpeech =
  | 'Nomen'
  | 'Verb'
  | 'Adjektiv'
  | 'Adverb'
  | 'Pronomen'
  | 'Präposition'
  | 'Konjunktion'
  | 'Numerale'
  | 'Interjektion'
  | 'Sonstiges';

export type Article = 'der' | 'die' | 'das';

export interface Word {
  id: string;
  german: string;
  article: Article | null;
  translation: string;
  partOfSpeech: PartOfSpeech;
  learned: boolean;
  correct: number;
  incorrect: number;
  lastPracticed: string | null;
}

export type NewWord = Pick<Word, 'german' | 'article' | 'translation' | 'partOfSpeech'>;

export const ALL_POS: PartOfSpeech[] = [
  'Nomen',
  'Verb',
  'Adjektiv',
  'Adverb',
  'Pronomen',
  'Präposition',
  'Konjunktion',
  'Numerale',
  'Interjektion',
  'Sonstiges',
];

export function displayGerman(w: Pick<Word, 'german' | 'article'>): string {
  return w.article ? `${w.article} ${w.german}` : w.german;
}

export function accuracy(w: Pick<Word, 'correct' | 'incorrect'>): number | null {
  const total = w.correct + w.incorrect;
  if (total === 0) return null;
  return Math.round((w.correct / total) * 100);
}
