import { displayGerman, type Word } from './types';

/** Which way a round goes: see the German word and pick its translation, or the reverse. */
export type Direction = 'de-uk' | 'uk-de';

export interface Question {
  word: Word;
  /** What is shown: the German word, or its translation in reverse rounds. */
  prompt: string;
  /** The correct option. */
  answer: string;
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
export function buildRound(pool: Word[], size = 10, direction: Direction = 'de-uk'): Question[] {
  const answerOf = (w: Word) => (direction === 'de-uk' ? w.translation : displayGerman(w));
  const promptOf = (w: Word) => (direction === 'de-uk' ? displayGerman(w) : w.translation);
  const roundWords = shuffle(pool).slice(0, Math.min(size, pool.length));
  const maxOptions = Math.min(4, pool.length);

  return roundWords.map((word) => {
    const answer = answerOf(word);
    const distractorCandidates = pool.filter(
      (w) => w.id !== word.id && answerOf(w).trim().toLowerCase() !== answer.trim().toLowerCase()
    );
    // Prefer distractors of the same part of speech (e.g. verbs mixed with
    // verbs) — falls back to any other word when there aren't enough.
    const samePos = distractorCandidates.filter((w) => w.partOfSpeech === word.partOfSpeech);
    const otherPos = distractorCandidates.filter((w) => w.partOfSpeech !== word.partOfSpeech);
    const distractors: string[] = [];
    for (const w of [...shuffle(samePos), ...shuffle(otherPos)]) {
      if (distractors.length >= maxOptions - 1) break;
      const option = answerOf(w);
      // Two different words can share a translation; an option must not appear twice.
      if (!distractors.some((d) => d.toLowerCase() === option.toLowerCase())) distractors.push(option);
    }

    const options = shuffle([answer, ...distractors]);
    return { word, prompt: promptOf(word), answer, options, correctIndex: options.indexOf(answer) };
  });
}
