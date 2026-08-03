import type { NewWord, Word } from './types';

const STORAGE_KEY = 'gvt.words.v1';

function generateId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID();
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function loadWords(): Word[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Word[];
  } catch {
    return [];
  }
}

export function saveWords(words: Word[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function dedupeKey(w: Pick<Word, 'german' | 'translation'>): string {
  return `${w.german.trim().toLowerCase()}|${w.translation.trim().toLowerCase()}`;
}

/** Adds new words, skipping ones that already exist (same german + translation). Returns counts. */
export function addWords(newWords: NewWord[]): { added: number; skipped: number } {
  const existing = loadWords();
  const existingKeys = new Set(existing.map(dedupeKey));
  let added = 0;
  let skipped = 0;

  for (const nw of newWords) {
    const key = dedupeKey(nw);
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    existingKeys.add(key);
    existing.push({
      id: generateId(),
      german: nw.german.trim(),
      article: nw.article,
      translation: nw.translation.trim(),
      partOfSpeech: nw.partOfSpeech,
      learned: false,
      correct: 0,
      incorrect: 0,
      lastPracticed: null,
    });
    added++;
  }

  saveWords(existing);
  return { added, skipped };
}

export function updateWord(id: string, patch: Partial<Word>): void {
  const words = loadWords();
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return;
  words[idx] = { ...words[idx], ...patch };
  saveWords(words);
}

export function deleteWord(id: string): void {
  const words = loadWords().filter((w) => w.id !== id);
  saveWords(words);
}

export function clearAllWords(): void {
  saveWords([]);
}

export function recordAnswer(id: string, wasCorrect: boolean): void {
  const words = loadWords();
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return;
  const w = words[idx];
  words[idx] = {
    ...w,
    correct: w.correct + (wasCorrect ? 1 : 0),
    incorrect: w.incorrect + (wasCorrect ? 0 : 1),
    lastPracticed: new Date().toISOString(),
  };
  saveWords(words);
}
