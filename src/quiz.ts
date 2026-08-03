import type { Word } from './types';

export interface Question {
  word: Word;
  options: string[];
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Builds a round of up to `size` questions drawn from `pool`, with 4-way (or fewer, if pool is small) options. */
export function buildRound(pool: Word[], size = 10): Question[] {
  const roundWords = shuffle(pool).slice(0, Math.min(size, pool.length));
  const maxOptions = Math.min(4, pool.length);

  return roundWords.map((word) => {
    const distractorCandidates = pool.filter(
      (w) => w.id !== word.id && w.translation.trim().toLowerCase() !== word.translation.trim().toLowerCase()
    );
    const distractors = shuffle(distractorCandidates)
      .slice(0, maxOptions - 1)
      .map((w) => w.translation);

    const options = shuffle([word.translation, ...distractors]);
    const correctIndex = options.indexOf(word.translation);

    return { word, options, correctIndex };
  });
}
