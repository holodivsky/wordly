import { parseTable } from '../importer';
import { addWords } from '../storage';
import { SAMPLE_WORDS } from '../sampleData';

export function renderImportView(container: HTMLElement, onImported: () => void): void {
  container.innerHTML = `
    <div class="card">
      <h2>Імпорт слів</h2>
      <p class="subtitle">Встав таблицю (з Excel/Google Sheets — просто скопіюй і встав) або обери файл .csv/.tsv.</p>
      <div class="row" style="margin-bottom: 10px;">
        <a class="btn" id="template-link" href="./shablon-sliv.csv" download="shablon-sliv.csv">Скачати шаблон (CSV)</a>
        <input type="file" id="file-input" accept=".csv,.tsv,.txt" />
        <button class="btn" id="sample-btn" type="button">Завантажити приклад слів</button>
      </div>
      <textarea id="raw-input" placeholder="german	article	translation	partOfSpeech
Tisch	der	стіл	Nomen
gehen		йти	Verb"></textarea>
      <div class="row" style="margin-top: 12px;">
        <button class="btn btn-primary" id="import-btn" type="button">Імпортувати</button>
      </div>
      <div id="import-result"></div>
      <div class="help-box">
        Скачай шаблон вище, заповни колонку своїми словами в Excel/Google Sheets/Numbers, збережи як CSV і завантаж тут файлом або встав скопійований вміст у поле нижче.<br/>
        <strong>Формат:</strong> перший рядок — заголовки колонок, розділювач — таб, кома або крапка з комою (визначається автоматично).<br/>
        Обов'язкові колонки: <code>german</code> (слово), <code>translation</code> (переклад).<br/>
        Необов'язкові: <code>article</code> (der/die/das — для іменників), <code>partOfSpeech</code> (Nomen, Verb, Adjektiv, Adverb, Pronomen, Präposition, Konjunktion, Numerale, Interjektion).<br/>
        Приклад:<br/>
        <code>german,article,translation,partOfSpeech</code><br/>
        <code>Tisch,der,стіл,Nomen</code><br/>
        <code>gehen,,йти,Verb</code>
      </div>
    </div>
  `;

  const textarea = container.querySelector<HTMLTextAreaElement>('#raw-input')!;
  const fileInput = container.querySelector<HTMLInputElement>('#file-input')!;
  const sampleBtn = container.querySelector<HTMLButtonElement>('#sample-btn')!;
  const importBtn = container.querySelector<HTMLButtonElement>('#import-btn')!;
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
    const { added, skipped } = addWords(SAMPLE_WORDS);
    showResult(`Додано приклад: ${added} слів${skipped ? `, пропущено дублікатів: ${skipped}` : ''}.`, false);
    onImported();
  });

  importBtn.addEventListener('click', () => {
    const raw = textarea.value.trim();
    if (!raw) {
      showResult('Спочатку встав або завантаж таблицю зі словами.', true);
      return;
    }
    const { words, errors } = parseTable(raw);
    if (words.length === 0) {
      showResult(errors.join(' '), true);
      return;
    }
    const { added, skipped } = addWords(words);
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
