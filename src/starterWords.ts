import starterCsv from './starterWords.csv?raw';
import { parseTable } from './importer';
import { createWords } from './storage';
import type { Word } from './types';

/**
 * The words every account starts with. They are added on an account's first
 * sign-in, when it has no word list in the cloud yet — so creating a user in
 * the Firebase console is all it takes. Edit starterWords.csv to change them.
 */
export function starterWords(): Word[] {
  return createWords(parseTable(starterCsv).words);
}
