import Anthropic from '@anthropic-ai/sdk';
import { ALL_POS, type NewWord } from './types';

const CARD_PROMPT = `Ти допомагаєш українцю вчити німецьку лексику. Користувач надсилає одне слово або короткий вираз — німецькою або українською.

Поверни картку слова:
- german: німецьке слово у словниковій формі (іменник — в однині, з великої літери, БЕЗ артикля; дієслово — в інфінітиві). Якщо користувач написав українською — переклади німецькою.
- article: der, die або das для іменників; порожній рядок для всіх інших частин мови.
- translations: варіанти перекладу українською, від найуживанішого до рідшого. Один варіант, якщо слово однозначне; до чотирьох, якщо значень кілька. Кожен варіант — одне слово або короткий вираз. Варіанти мають бути різними значеннями, без повторів; якщо українське слово саме багатозначне, коротко уточни значення в дужках (наприклад: «замок (палац)», «замок (дверний)»).
- partOfSpeech: частина мови.`;

const DETAILS_PROMPT = `- examples: два короткі природні речення німецькою з цим словом (рівень A2–B1), кожне з перекладом українською.
- grammar: 2–4 короткі граматичні примітки українською, найкорисніші для цього слова. Для іменника — множина й родовий відмінок; для дієслова — форми (3-тя особа однини Präsens, Präteritum, Perfekt з haben/sein), керування відмінком чи прийменником, відокремлюваний префікс; для прикметника — ступені порівняння; для прийменника — відмінок. Німецькі форми пиши німецькою.`;

const TYPO_PROMPT = 'Якщо у слові одрук — виправ його.';

const CARD_PROPERTIES = {
  german: { type: 'string' },
  article: { type: 'string', enum: ['der', 'die', 'das', ''] },
  translations: { type: 'array', items: { type: 'string' } },
  partOfSpeech: { type: 'string', enum: ALL_POS },
};

const DETAILS_PROPERTIES = {
  examples: {
    type: 'array',
    items: {
      type: 'object',
      properties: { german: { type: 'string' }, ukrainian: { type: 'string' } },
      required: ['german', 'ukrainian'],
      additionalProperties: false,
    },
  },
  grammar: { type: 'array', items: { type: 'string' } },
};

function objectSchema(properties: Record<string, unknown>) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

export interface Example {
  german: string;
  ukrainian: string;
}

export interface WordCard {
  /** The part that is saved to the word list. */
  word: NewWord;
  /** Every translation variant, most common first. */
  translations: string[];
}

export interface Translation extends WordCard {
  examples: Example[];
  grammar: string[];
}

interface RawCard {
  german: string;
  article: string;
  translations: string[];
  partOfSpeech: NewWord['partOfSpeech'];
  examples?: Example[];
  grammar?: string[];
}

/** Whether `err` is a request cancelled through its AbortSignal rather than a real failure. */
export function isAbort(err: unknown): boolean {
  return err instanceof Anthropic.APIUserAbortError;
}

async function requestCard(
  apiKey: string,
  input: string,
  system: string,
  schema: Record<string, unknown>,
  signal?: AbortSignal
): Promise<RawCard> {
  // The key is fetched after sign-in and only ever sent to Anthropic — there is no backend to hide it behind.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  let response: Anthropic.Message;
  try {
    response = await client.messages.create(
      {
        model: 'claude-haiku-5-5',
        max_tokens: 2000,
        system,
        output_config: { effort: 'low', format: { type: 'json_schema', schema } },
        messages: [{ role: 'user', content: input }],
      },
      { signal }
    );
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new Error(describeApiError(err));
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude відмовився перекладати це слово.');
  }
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
  if (!text || response.stop_reason === 'max_tokens') {
    throw new Error('Claude повернув неповну відповідь. Спробуй ще раз.');
  }
  try {
    return JSON.parse(text) as RawCard;
  } catch {
    throw new Error('Не вдалося розібрати відповідь Claude. Спробуй ще раз.');
  }
}

function toWordCard(raw: RawCard): WordCard {
  const translations = (raw.translations ?? []).map((t) => t.trim()).filter(Boolean);
  if (translations.length === 0) {
    throw new Error('Claude не знайшов перекладу для цього слова.');
  }
  return {
    word: {
      german: raw.german.trim(),
      article: raw.article === 'der' || raw.article === 'die' || raw.article === 'das' ? raw.article : null,
      // The word list keeps one short line; the two most common variants are enough to quiz on.
      translation: translations.slice(0, 2).join(', '),
      partOfSpeech: ALL_POS.includes(raw.partOfSpeech) ? raw.partOfSpeech : 'Sonstiges',
    },
    translations,
  };
}

/** The short card only — fast and cheap enough to run while the user is still typing. Errors carry a user-facing (Ukrainian) message. */
export async function translateQuick(apiKey: string, input: string, signal?: AbortSignal): Promise<WordCard> {
  const system = `${CARD_PROMPT}\n\n${TYPO_PROMPT}`;
  return toWordCard(await requestCard(apiKey, input, system, objectSchema(CARD_PROPERTIES), signal));
}

/** The full card with usage examples and grammar notes. Errors carry a user-facing (Ukrainian) message. */
export async function translateWord(apiKey: string, input: string, signal?: AbortSignal): Promise<Translation> {
  const system = `${CARD_PROMPT}\n${DETAILS_PROMPT}\n\n${TYPO_PROMPT}`;
  const schema = objectSchema({ ...CARD_PROPERTIES, ...DETAILS_PROPERTIES });
  const raw = await requestCard(apiKey, input, system, schema, signal);
  return { ...toWordCard(raw), examples: raw.examples ?? [], grammar: raw.grammar ?? [] };
}

function describeApiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'API-ключ недійсний. Перевір його або встав новий.';
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return 'Цей API-ключ не має доступу до моделі.';
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Забагато запитів. Зачекай хвилину і спробуй ще раз.';
  }
  if (err instanceof Anthropic.BadRequestError) {
    return /credit balance/i.test(err.message)
      ? 'На балансі Anthropic закінчились кошти. Поповни його в консолі.'
      : `Запит відхилено: ${err.message}`;
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'Немає з’єднання з Anthropic. Перевір інтернет.';
  }
  if (err instanceof Anthropic.APIError) {
    return `Помилка Anthropic (${err.status ?? '?'}). Спробуй пізніше.`;
  }
  return String(err);
}
