export type Lang = 'uk' | 'en';

const LANG_KEY = 'gvt.lang.v1';

// Interface text only. Translations, examples and grammar notes produced by
// Claude stay Ukrainian in both versions: the word lists are German–Ukrainian.
const uk = {
  signOut: 'Вийти',
  loading: 'Завантаження…',
  switchLang: 'EN',
  switchLangTitle: 'Switch to English',
  sectionList: 'Список',
  sectionImport: 'Імпорт',
  sectionStats: 'Статистика',
  noAccess: 'Цей акаунт не має доступу до Wordly.',
  loadFailed: 'Не вдалося завантажити слова: {error}',

  loginSubtitle: 'Тренажер німецької лексики. Увійди, щоб побачити свої слова.',
  email: 'Пошта',
  password: 'Пароль',
  signIn: 'Увійти',
  loginInvalid: 'Невірна пошта або пароль.',
  loginTooMany: 'Забагато невдалих спроб. Зачекай кілька хвилин і спробуй ще раз.',
  loginNoNetwork: 'Немає з’єднання. Перевір інтернет.',
  loginFailed: 'Не вдалося увійти: {error}',

  inputPlaceholder: 'Введіть слово',
  fullTitle: 'Переклад із прикладами й граматикою',
  add: 'Додати',
  added: 'Додано',
  addTitle: 'Додати до слів',
  moreBtn: 'Приклади й граматика',
  examples: 'Приклади',
  grammar: 'Граматика',
  tableEntry: 'Запис у таблицю слів',
  article: 'Артикль',
  germanWord: 'Німецьке слово',
  translation: 'Переклад',
  partOfSpeech: 'Частина мови',
  alreadyHave: 'Вже є у твоїх словах: {word}',
  fillBoth: 'Заповни і слово, і переклад.',
  addedWord: 'Додано: {word}',
  duplicateWord: 'Таке слово вже є у твоїх словах: {word}',
  knownTag: 'вже є',
  keyTitle: 'Переклад слова',
  keyIntro:
    'Щоб Claude перекладав слова прямо тут, встав API-ключ Anthropic. Достатньо зробити це один раз: ключ зберігається в закритій базі й підтягується після входу на будь-якому пристрої.',
  saveKey: 'Зберегти ключ',
  keySaveFailed: 'Не вдалося зберегти ключ: {error}',

  errRefused: 'Claude відмовився перекладати це слово.',
  errIncomplete: 'Claude повернув неповну відповідь. Спробуй ще раз.',
  errParse: 'Не вдалося розібрати відповідь Claude. Спробуй ще раз.',
  errNoTranslation: 'Claude не знайшов перекладу для цього слова.',
  errAuth: 'API-ключ недійсний. Перевір його або встав новий.',
  errPermission: 'Цей API-ключ не має доступу до моделі.',
  errRate: 'Забагато запитів. Зачекай хвилину і спробуй ще раз.',
  errCredits: 'На балансі Anthropic закінчились кошти. Поповни його в консолі.',
  errRejected: 'Запит відхилено: {error}',
  errConnection: 'Немає з’єднання з Anthropic. Перевір інтернет.',
  errApi: 'Помилка Anthropic ({status}). Спробуй пізніше.',

  quizEmpty: 'Ще немає слів. Додай їх на вкладці Translate або у Words → Імпорт.',
  quizTitle: 'Гра: вгадай переклад',
  quizIntro: 'Раунд по 10 слів. Обери правильний переклад із 4 варіантів.',
  wordsLabel: 'Слова:',
  filterNotLearnedYet: 'Ще не вивчені',
  filterAll: 'Усі',
  filterLearned: 'Вивчені',
  filterNotLearned: 'Не вивчені',
  available: 'Доступно: {count}',
  needTwo: 'Потрібно щонайменше 2 слова в цій вибірці, щоб почати гру.',
  startRound: 'Почати раунд',
  progress: 'Питання {n} з {total} · Правильно: {correct}',
  answerCorrect: '✓ Правильно!',
  answerWrong: '✗ Неправильно. Правильна відповідь: {answer}',
  learnedOn: '✓ Вивчено',
  markLearned: 'Позначити як вивчене',
  summaryBtn: 'Підсумок',
  next: 'Далі',
  summaryTitle: 'Підсумок раунду',
  summaryScore: '{correct} / {total} правильно',
  missedTitle: 'Слова, де були помилки:',
  overallAcc: ' · загальна точність: {acc}% ({ratio})',
  yourAnswer: 'твоя відповідь: {answer}',
  noMistakes: 'Жодної помилки, чудово!',
  again: 'Ще раз',

  wordsTitle: 'Слова ({count})',
  clearAll: 'Очистити все',
  wordsEmpty: 'Ще немає слів. Додай їх на вкладці Translate або в розділі «Імпорт».',
  search: 'Пошук...',
  allPos: 'Усі частини мови',
  colWord: 'Слово',
  colAccuracy: 'Точність',
  colLearned: 'Вивчено',
  nothingFound: 'Нічого не знайдено за цим фільтром.',
  confirmClear: 'Видалити всі слова та статистику? Цю дію не можна скасувати.',

  statsEmpty: 'Ще немає даних. Додай слова і зіграй кілька раундів.',
  statTotal: 'Усього слів',
  statAttempts: 'Спроб відповіді',
  statAccuracy: 'Загальна точність',
  perWord: 'Точність по словах',
  weakestFirst: '(найслабші зверху)',
  noAttempts: 'Ще немає спроб — зіграй раунд, щоб побачити статистику по кожному слову.',
  colAttempts: 'Спроб',

  importTitle: 'Імпорт слів',
  importIntro: 'Скачай приклад, заповни своїми словами і завантаж назад.',
  downloadExample: 'Скачати приклад',
  uploadWords: 'Завантажити слова',
  importFormat:
    'Файл CSV: колонки german і translation обов’язкові, article і partOfSpeech — за бажанням. Дублікати пропускаються.',
  exportJson: 'Скачати мої слова (JSON)',
  exportEmpty: 'У тебе ще немає слів для експорту.',
  importNone: 'Не знайдено жодного коректного слова.',
  imported: 'Імпортовано: {count} слів.',
  skipped: 'Пропущено дублікатів: {count}.',
  rowErrors: 'Помилок у рядках: {count}.',
  fileReadFailed: 'Не вдалося прочитати файл.',
  forgetKey: 'Видалити API-ключ Anthropic',
  confirmForgetKey:
    'Видалити API-ключ? Переклад перестане працювати в обох акаунтах, доки хтось не вставить ключ знову.',
  keyRemoved: 'API-ключ видалено.',
  keyRemoveFailed: 'Не вдалося видалити ключ: {error}',

  impNoData: 'Немає даних для імпорту.',
  impBadHeaders:
    'Не вдалося розпізнати заголовки колонок. Потрібні щонайменше колонки "german" (німецьке слово) та "translation" (переклад). Скачай приклад і звір формат.',
  impRowSkipped: 'Рядок {n}: пропущено — відсутнє слово або переклад.',
  impBadJson: 'Не вдалося прочитати JSON — перевір формат файлу.',
  impNoWordsArray: 'У JSON немає масиву "words" зі словами.',
  impBadItem: 'Елемент {n}: некоректний формат.',
  impItemSkipped: 'Елемент {n}: пропущено — відсутнє слово або переклад.',
};

export type MessageKey = keyof typeof uk;

const en: Record<MessageKey, string> = {
  signOut: 'Sign out',
  loading: 'Loading…',
  switchLang: 'UA',
  switchLangTitle: 'Перейти на українську',
  sectionList: 'List',
  sectionImport: 'Import',
  sectionStats: 'Stats',
  noAccess: 'This account does not have access to Wordly.',
  loadFailed: 'Could not load your words: {error}',

  loginSubtitle: 'German vocabulary trainer. Sign in to see your words.',
  email: 'Email',
  password: 'Password',
  signIn: 'Sign in',
  loginInvalid: 'Wrong email or password.',
  loginTooMany: 'Too many failed attempts. Wait a few minutes and try again.',
  loginNoNetwork: 'No connection. Check your internet.',
  loginFailed: 'Could not sign in: {error}',

  inputPlaceholder: 'Enter a word',
  fullTitle: 'Translation with examples and grammar',
  add: 'Add',
  added: 'Added',
  addTitle: 'Add to words',
  moreBtn: 'Examples and grammar',
  examples: 'Examples',
  grammar: 'Grammar',
  tableEntry: 'Entry for your word list',
  article: 'Article',
  germanWord: 'German word',
  translation: 'Translation',
  partOfSpeech: 'Part of speech',
  alreadyHave: 'Already in your words: {word}',
  fillBoth: 'Fill in both the word and the translation.',
  addedWord: 'Added: {word}',
  duplicateWord: 'This word is already in your words: {word}',
  knownTag: 'saved',
  keyTitle: 'Word translation',
  keyIntro:
    'To have Claude translate words right here, paste an Anthropic API key. Once is enough: the key is kept in a private database and loaded after sign-in on any device.',
  saveKey: 'Save key',
  keySaveFailed: 'Could not save the key: {error}',

  errRefused: 'Claude declined to translate this word.',
  errIncomplete: 'Claude returned an incomplete answer. Try again.',
  errParse: 'Could not read Claude’s answer. Try again.',
  errNoTranslation: 'Claude found no translation for this word.',
  errAuth: 'The API key is invalid. Check it or paste a new one.',
  errPermission: 'This API key has no access to the model.',
  errRate: 'Too many requests. Wait a minute and try again.',
  errCredits: 'The Anthropic balance has run out. Top it up in the console.',
  errRejected: 'Request rejected: {error}',
  errConnection: 'No connection to Anthropic. Check your internet.',
  errApi: 'Anthropic error ({status}). Try again later.',

  quizEmpty: 'No words yet. Add some on the Translate tab or in Words → Import.',
  quizTitle: 'Game: guess the translation',
  quizIntro: 'A round of 10 words. Pick the right translation out of 4.',
  wordsLabel: 'Words:',
  filterNotLearnedYet: 'Not learned yet',
  filterAll: 'All',
  filterLearned: 'Learned',
  filterNotLearned: 'Not learned',
  available: 'Available: {count}',
  needTwo: 'This selection needs at least 2 words to start a game.',
  startRound: 'Start round',
  progress: 'Question {n} of {total} · Correct: {correct}',
  answerCorrect: '✓ Correct!',
  answerWrong: '✗ Wrong. Correct answer: {answer}',
  learnedOn: '✓ Learned',
  markLearned: 'Mark as learned',
  summaryBtn: 'Summary',
  next: 'Next',
  summaryTitle: 'Round summary',
  summaryScore: '{correct} / {total} correct',
  missedTitle: 'Words you missed:',
  overallAcc: ' · overall accuracy: {acc}% ({ratio})',
  yourAnswer: 'your answer: {answer}',
  noMistakes: 'No mistakes, great!',
  again: 'Play again',

  wordsTitle: 'Words ({count})',
  clearAll: 'Clear all',
  wordsEmpty: 'No words yet. Add some on the Translate tab or in the Import section.',
  search: 'Search...',
  allPos: 'All parts of speech',
  colWord: 'Word',
  colAccuracy: 'Accuracy',
  colLearned: 'Learned',
  nothingFound: 'Nothing matches this filter.',
  confirmClear: 'Delete all words and statistics? This cannot be undone.',

  statsEmpty: 'No data yet. Add words and play a few rounds.',
  statTotal: 'Total words',
  statAttempts: 'Answers given',
  statAccuracy: 'Overall accuracy',
  perWord: 'Accuracy by word',
  weakestFirst: '(weakest first)',
  noAttempts: 'No answers yet — play a round to see statistics for each word.',
  colAttempts: 'Attempts',

  importTitle: 'Import words',
  importIntro: 'Download the example, fill in your words and upload it back.',
  downloadExample: 'Download example',
  uploadWords: 'Upload words',
  importFormat:
    'CSV file: the german and translation columns are required, article and partOfSpeech are optional. Duplicates are skipped.',
  exportJson: 'Download my words (JSON)',
  exportEmpty: 'You have no words to export yet.',
  importNone: 'No valid words found.',
  imported: 'Imported: {count} words.',
  skipped: 'Duplicates skipped: {count}.',
  rowErrors: 'Rows with errors: {count}.',
  fileReadFailed: 'Could not read the file.',
  forgetKey: 'Remove the Anthropic API key',
  confirmForgetKey:
    'Remove the API key? Translation will stop working in both accounts until someone pastes a key again.',
  keyRemoved: 'API key removed.',
  keyRemoveFailed: 'Could not remove the key: {error}',

  impNoData: 'Nothing to import.',
  impBadHeaders:
    'Could not recognise the column headers. At least "german" (the German word) and "translation" are required. Download the example and compare the format.',
  impRowSkipped: 'Row {n}: skipped — the word or the translation is missing.',
  impBadJson: 'Could not read the JSON — check the file format.',
  impNoWordsArray: 'The JSON has no "words" array.',
  impBadItem: 'Item {n}: invalid format.',
  impItemSkipped: 'Item {n}: skipped — the word or the translation is missing.',
};

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { uk, en };

function initialLang(): Lang {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored === 'uk' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'uk';
}

let current: Lang = initialLang();
document.documentElement.lang = current;

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
}

/** The interface text for `key` in the current language, with `{name}` placeholders filled from `params`. */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return MESSAGES[current][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}
