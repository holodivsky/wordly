import type { NewWord, Word, WordList } from './types';

const LISTS_KEY = 'gvt.lists.v1';
const ACTIVE_LIST_KEY = 'gvt.activeListId.v1';
const LEGACY_WORDS_KEY = 'gvt.words.v1';
const OWNER_KEY = 'gvt.ownerUid.v1';
const DEFAULT_LIST_NAME = 'Мої слова';

type SyncPushHandler = (lists: WordList[]) => void;
let syncPushHandler: SyncPushHandler | null = null;

/** Registers a callback that fires on every local save (unless `push: false` is passed). Used by account.ts to mirror changes to the cloud. */
export function setSyncPushHandler(handler: SyncPushHandler | null): void {
  syncPushHandler = handler;
}

function generateId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** One-time migration from the earlier single-list version of the app. */
function migrateLegacyWords(): WordList[] | null {
  const raw = localStorage.getItem(LEGACY_WORDS_KEY);
  if (!raw) return null;
  localStorage.removeItem(LEGACY_WORDS_KEY);
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return [{ id: generateId(), name: DEFAULT_LIST_NAME, words: parsed as Word[] }];
  } catch {
    return null;
  }
}

export function loadLists(): WordList[] {
  const raw = localStorage.getItem(LISTS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as WordList[];
    } catch {
      // fall through to migration/empty
    }
  }
  const migrated = migrateLegacyWords();
  if (migrated) {
    saveLists(migrated);
    return migrated;
  }
  return [];
}

/** Set `push: false` when applying data that just arrived from the cloud, to avoid pushing it right back. */
export function saveLists(lists: WordList[], push = true): void {
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  if (push && syncPushHandler) syncPushHandler(lists);
}

export function getList(listId: string): WordList | undefined {
  return loadLists().find((l) => l.id === listId);
}

export function getActiveListId(): string | null {
  const lists = loadLists();
  if (lists.length === 0) return null;
  const stored = localStorage.getItem(ACTIVE_LIST_KEY);
  if (stored && lists.some((l) => l.id === stored)) return stored;
  const fallback = lists[0].id;
  localStorage.setItem(ACTIVE_LIST_KEY, fallback);
  return fallback;
}

export function setActiveListId(id: string): void {
  localStorage.setItem(ACTIVE_LIST_KEY, id);
}

export function createList(name: string): WordList {
  const lists = loadLists();
  const list: WordList = { id: generateId(), name: name.trim() || 'Без назви', words: [] };
  lists.push(list);
  saveLists(lists);
  setActiveListId(list.id);
  return list;
}

export function renameList(listId: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const lists = loadLists();
  const idx = lists.findIndex((l) => l.id === listId);
  if (idx === -1) return;
  lists[idx] = { ...lists[idx], name: trimmed };
  saveLists(lists);
}

export function deleteList(listId: string): void {
  const lists = loadLists().filter((l) => l.id !== listId);
  saveLists(lists);
  if (localStorage.getItem(ACTIVE_LIST_KEY) === listId) {
    if (lists.length > 0) setActiveListId(lists[0].id);
    else localStorage.removeItem(ACTIVE_LIST_KEY);
  }
}

function dedupeKey(w: Pick<Word, 'german' | 'translation'>): string {
  return `${w.german.trim().toLowerCase()}|${w.translation.trim().toLowerCase()}`;
}

/** Returns `base` plus every word from `extra` that isn't already in it (same german + translation). */
export function mergeWords(base: Word[], extra: Word[]): Word[] {
  const keys = new Set(base.map(dedupeKey));
  const merged = [...base];
  for (const w of extra) {
    const key = dedupeKey(w);
    if (keys.has(key)) continue;
    keys.add(key);
    merged.push(w);
  }
  return merged;
}

/** Every word stored on this device as one array. Earlier versions of the app allowed several lists; an account has exactly one. */
export function loadAllWords(): Word[] {
  return loadLists().reduce<Word[]>((all, l) => mergeWords(all, l.words), []);
}

/** Replaces everything stored on this device with a single list of `words`, without pushing it back to the cloud. */
export function replaceAllWords(words: Word[]): void {
  const id = loadLists()[0]?.id ?? generateId();
  saveLists([{ id, name: DEFAULT_LIST_NAME, words }], false);
  setActiveListId(id);
}

/** The account whose words are cached on this device, or null if they were added before anyone signed in. */
export function getOwnerUid(): string | null {
  return localStorage.getItem(OWNER_KEY);
}

export function setOwnerUid(uid: string): void {
  localStorage.setItem(OWNER_KEY, uid);
}

export function clearLocalData(): void {
  localStorage.removeItem(LISTS_KEY);
  localStorage.removeItem(ACTIVE_LIST_KEY);
  localStorage.removeItem(OWNER_KEY);
}

/** Adds new words to a list, skipping ones that already exist there (same german + translation). */
export function addWordsToList(listId: string, newWords: NewWord[]): { added: number; skipped: number } {
  const lists = loadLists();
  const listIdx = lists.findIndex((l) => l.id === listId);
  if (listIdx === -1) return { added: 0, skipped: 0 };

  const list = lists[listIdx];
  const existingKeys = new Set(list.words.map(dedupeKey));
  const updatedWords = [...list.words];
  let added = 0;
  let skipped = 0;

  for (const nw of newWords) {
    const key = dedupeKey(nw);
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    existingKeys.add(key);
    updatedWords.push({
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

  lists[listIdx] = { ...list, words: updatedWords };
  saveLists(lists);
  return { added, skipped };
}

export function updateWordInList(listId: string, wordId: string, patch: Partial<Word>): void {
  const lists = loadLists();
  const listIdx = lists.findIndex((l) => l.id === listId);
  if (listIdx === -1) return;
  const words = lists[listIdx].words;
  const wordIdx = words.findIndex((w) => w.id === wordId);
  if (wordIdx === -1) return;
  const updatedWords = [...words];
  updatedWords[wordIdx] = { ...updatedWords[wordIdx], ...patch };
  lists[listIdx] = { ...lists[listIdx], words: updatedWords };
  saveLists(lists);
}

export function deleteWordFromList(listId: string, wordId: string): void {
  const lists = loadLists();
  const listIdx = lists.findIndex((l) => l.id === listId);
  if (listIdx === -1) return;
  lists[listIdx] = { ...lists[listIdx], words: lists[listIdx].words.filter((w) => w.id !== wordId) };
  saveLists(lists);
}

export function clearListWords(listId: string): void {
  const lists = loadLists();
  const listIdx = lists.findIndex((l) => l.id === listId);
  if (listIdx === -1) return;
  lists[listIdx] = { ...lists[listIdx], words: [] };
  saveLists(lists);
}

export function recordAnswerInList(listId: string, wordId: string, wasCorrect: boolean): void {
  const lists = loadLists();
  const listIdx = lists.findIndex((l) => l.id === listId);
  if (listIdx === -1) return;
  const words = lists[listIdx].words;
  const wordIdx = words.findIndex((w) => w.id === wordId);
  if (wordIdx === -1) return;
  const w = words[wordIdx];
  const updatedWords = [...words];
  updatedWords[wordIdx] = {
    ...w,
    correct: w.correct + (wasCorrect ? 1 : 0),
    incorrect: w.incorrect + (wasCorrect ? 0 : 1),
    lastPracticed: new Date().toISOString(),
  };
  lists[listIdx] = { ...lists[listIdx], words: updatedWords };
  saveLists(lists);
}
