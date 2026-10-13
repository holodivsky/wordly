import { parseTable, parseJsonList, listToJsonString } from '../importer';
import { getApiKey, setApiKey } from '../apiKey';
import { t } from '../i18n';
import { addWordsToList, getList } from '../storage';

const DOWNLOAD_ICON = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>`;
const UPLOAD_ICON = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V5M7 9l5-5 5 5M5 20h14"/></svg>`;

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

export function renderImportView(container: HTMLElement, listId: string, onImported: () => void): void {
  container.innerHTML = `
    <div class="card">
      <h2>${t('importTitle')}</h2>
      <p class="subtitle">${t('importIntro')}</p>
      <div class="round-actions">
        <a class="round-action" href="./shablon-sliv.csv" download="wordly-example.csv">
          <span class="round-icon">${DOWNLOAD_ICON}</span>
          <span>${t('downloadExample')}</span>
        </a>
        <button class="round-action" id="upload-btn" type="button">
          <span class="round-icon round-icon-primary">${UPLOAD_ICON}</span>
          <span>${t('uploadWords')}</span>
        </button>
        <input type="file" id="file-input" accept=".csv,.tsv,.txt,.json" hidden />
      </div>
      <div id="import-result"></div>
      <p class="muted" style="font-size:13px; margin:16px 0 0;">${t('importFormat')}</p>
    </div>
    <p style="text-align:center;">
      <button class="btn-link" id="export-btn" type="button">${t('exportJson')}</button>
      ${getApiKey() ? `<button class="btn-link" id="forget-key-btn" type="button">${t('forgetKey')}</button>` : ''}
    </p>
  `;

  const fileInput = container.querySelector<HTMLInputElement>('#file-input')!;
  const resultBox = container.querySelector<HTMLDivElement>('#import-result')!;

  function showResult(text: string, isError: boolean): void {
    resultBox.innerHTML = '';
    const el = document.createElement('div');
    el.className = `msg ${isError ? 'msg-error' : 'msg-success'} reveal`;
    el.style.margin = '16px 0 0';
    el.textContent = text;
    resultBox.appendChild(el);
  }

  function importText(raw: string): void {
    const text = raw.trim();
    const looksLikeJson = text.startsWith('{') || text.startsWith('[');
    const { words, errors } = looksLikeJson ? parseJsonList(text) : parseTable(text);

    if (words.length === 0) {
      showResult(errors.join(' ') || t('importNone'), true);
      return;
    }
    const { added, skipped } = addWordsToList(listId, words);
    const parts = [t('imported', { count: added })];
    if (skipped) parts.push(t('skipped', { count: skipped }));
    if (errors.length) parts.push(t('rowErrors', { count: errors.length }));
    showResult(parts.join(' '), errors.length > 0 && added === 0);
    if (added > 0) onImported();
  }

  container.querySelector<HTMLButtonElement>('#upload-btn')!.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importText(String(reader.result ?? ''));
    reader.onerror = () => showResult(t('fileReadFailed'), true);
    reader.readAsText(file, 'utf-8');
    // Lets the same file be picked again after fixing it.
    fileInput.value = '';
  });

  container.querySelector<HTMLButtonElement>('#export-btn')!.addEventListener('click', () => {
    const current = getList(listId);
    if (!current || current.words.length === 0) {
      showResult(t('exportEmpty'), true);
      return;
    }
    downloadFile('wordly-words.json', listToJsonString(current), 'application/json');
  });

  // Rarely needed, so it lives here rather than on the Translate tab: removes the shared key for both accounts.
  const forgetKeyBtn = container.querySelector<HTMLButtonElement>('#forget-key-btn');
  forgetKeyBtn?.addEventListener('click', async () => {
    if (!confirm(t('confirmForgetKey'))) return;
    try {
      await setApiKey(null);
      forgetKeyBtn.remove();
      showResult(t('keyRemoved'), false);
    } catch (err) {
      showResult(t('keyRemoveFailed', { error: String(err) }), true);
    }
  });
}
