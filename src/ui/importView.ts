import { parseTable, parseJsonList, listToJsonString } from '../importer';
import { addWordsToList, getList } from '../storage';
import { SAMPLE_WORDS } from '../sampleData';

function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_-]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'spysok'
  );
}

export function renderImportView(container: HTMLElement, listId: string, onImported: () => void): void {
  const list = getList(listId);
  const listName = list?.name ?? '';

  container.innerHTML = `
    <div class="card">
      <h2>Імпорт слів</h2>
      <p class="subtitle">Слова додаються у поточний список: <strong>${listName}</strong> (обрати інший список можна вгорі сторінки). Можна імпортувати повторно — нові слова додадуться, дублікати пропустяться.</p>
      <div class="row" style="margin-bottom: 10px;">
        <a class="btn" id="template-link" href="./shablon-sliv.csv" download="shablon-sliv.csv">Скачати шаблон (CSV)</a>
        <input type="file" id="file-input" accept=".csv,.tsv,.txt,.json" />
        <button class="btn" id="sample-btn" type="button">Завантажити приклад слів</button>
      </div>
      <textarea id="raw-input" placeholder="german	article	translation	partOfSpeech
Tisch	der	стіл	Nomen
gehen		йти	Verb"></textarea>
      <div class="row" style="margin-top: 12px;">
        <button class="btn btn-primary" id="import-btn" type="button">Імпортувати</button>
        <button class="btn" id="export-btn" type="button">Скачати поточний список як JSON</button>
      </div>
      <div id="import-result"></div>
      <div class="help-box">
        Скачай шаблон вище, заповни колонку своїми словами в Excel/Google Sheets/Numbers, збережи як CSV і завантаж тут файлом або встав скопійований вміст у поле нижче.<br/>
        <strong>Формат CSV/TSV:</strong> перший рядок — заголовки колонок, розділювач — таб, кома або крапка з комою (визначається автоматично).<br/>
        Обов'язкові колонки: <code>german</code> (слово), <code>translation</code> (переклад).<br/>
        Необов'язкові: <code>article</code> (der/die/das — для іменників), <code>partOfSpeech</code> (Nomen, Verb, Adjektiv, Adverb, Pronomen, Präposition, Konjunktion, Numerale, Interjektion).<br/>
        Приклад:<br/>
        <code>german,article,translation,partOfSpeech</code><br/>
        <code>Tisch,der,стіл,Nomen</code><br/>
        <code>gehen,,йти,Verb</code><br/><br/>
        <strong>Поділитись списком з кимось:</strong> натисни "Скачати поточний список як JSON" і передай файл — інша людина створює у себе новий список (кнопка вгорі сторінки) і завантажує цей .json файлом сюди ж. Прогрес вивчення в кожного залишається окремим.
      </div>
    </div>
  `;

  const textarea = container.querySelector<HTMLTextAreaElement>('#raw-input')!;
  const fileInput = container.querySelector<HTMLInputElement>('#file-input')!;
  const sampleBtn = container.querySelector<HTMLButtonElement>('#sample-btn')!;
  const importBtn = container.querySelector<HTMLButtonElement>('#import-btn')!;
  const exportBtn = container.querySelector<HTMLButtonElement>('#export-btn')!;
  const resultBox = container.querySelector<HTMLDivElement>('#import-result')!;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      textarea.value = String(reader.result ?? '');
    };
    reader.readAsText(file, 'utf-8');
  });

  sampleBtn.addEventListener('click', () => {
    const { added, skipped } = addWordsToList(listId, SAMPLE_WORDS);
    showResult(`Додано приклад: ${added} слів${skipped ? `, пропущено дублікатів: ${skipped}` : ''}.`, false);
    onImported();
  });

  exportBtn.addEventListener('click', () => {
    const current = getList(listId);
    if (!current || current.words.length === 0) {
      showResult('У поточному списку ще немає слів для експорту.', true);
      return;
    }
    downloadFile(`${slugify(current.name)}.json`, listToJsonString(current), 'application/json');
  });

  importBtn.addEventListener('click', () => {
    const raw = textarea.value.trim();
    if (!raw) {
      showResult('Спочатку встав або завантаж таблицю чи JSON зі словами.', true);
      return;
    }

    const looksLikeJson = raw.startsWith('{') || raw.startsWith('[');
    const { words, errors } = looksLikeJson ? parseJsonList(raw) : parseTable(raw);

    if (words.length === 0) {
      showResult(errors.join(' ') || 'Не знайдено жодного коректного слова.', true);
      return;
    }
    const { added, skipped } = addWordsToList(listId, words);
    const parts = [`Імпортовано: ${added} слів.`];
    if (skipped) parts.push(`Пропущено дублікатів: ${skipped}.`);
    if (errors.length) parts.push(`Помилок у рядках: ${errors.length}.`);
    showResult(parts.join(' '), errors.length > 0 && added === 0);
    if (added > 0) {
      textarea.value = '';
      onImported();
    }
  });

  function showResult(text: string, isError: boolean): void {
    resultBox.innerHTML = `<div class="msg ${isError ? 'msg-error' : 'msg-success'}">${text}</div>`;
  }
}
