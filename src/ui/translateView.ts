import { getApiKey, setApiKey } from '../apiKey';
import { t } from '../i18n';
import { addWordsToList, getList } from '../storage';
import { suggestWords } from '../suggest';
import type { Translation, WordCard } from '../translate';
import { ALL_POS, displayGerman, type Article, type PartOfSpeech } from '../types';

const PLUS_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
const CHECK_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const SEARCH_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>`;
// The label is dropped on phones (see .btn-add in style.css) to leave the width to the field.
const addLabel = () => `${PLUS_ICON}<span>${t('add')}</span>`;
const addedLabel = () => `${CHECK_ICON}<span>${t('added')}</span>`;
// Long enough that a word in progress isn't translated letter by letter, short enough to feel live.
const LIVE_TRANSLATE_DELAY_MS = 500;
const SUGGEST_DELAY_MS = 150;
const MIN_LIVE_LENGTH = 2;

// The Anthropic SDK is only needed once the user actually translates something.
function loadTranslateModule() {
  return import('../translate');
}

export function renderTranslateView(container: HTMLElement, listId: string, onWordAdded: () => void): void {
  if (!getApiKey()) {
    renderKeyForm(container, listId, onWordAdded);
    return;
  }

  container.innerHTML = `
    <div class="card">
      <form class="translate-form" id="translate-form">
        <div class="translate-field" id="translate-field">
          <input type="text" id="translate-input" placeholder="${t('inputPlaceholder')}" autocomplete="off" autocapitalize="none" enterkeyhint="search" aria-controls="suggestions" />
          <button class="field-btn" id="translate-btn" type="submit" title="${t('fullTitle')}" aria-label="${t('fullTitle')}">${SEARCH_ICON}<span class="spinner" aria-hidden="true"></span></button>
        </div>
        <button class="btn btn-add" id="add-btn" type="submit" form="translate-result" title="${t('addTitle')}" aria-label="${t('addTitle')}" disabled>${addLabel()}</button>
      </form>
      <ul class="suggestions" id="suggestions" role="listbox" hidden></ul>
      <div class="muted" id="translate-hint"></div>
      <div id="translate-details" class="reveal" hidden>
        <div id="result-heading" style="font-size:20px; font-weight:700;"></div>
        <ol id="result-translations" style="margin:8px 0 0; padding-left:22px; font-size:16px;"></ol>
        <button class="btn-link" id="more-btn" type="button" style="padding-left:0; margin-top:4px;">${t('moreBtn')}</button>
        <div id="result-extras" class="reveal" hidden>
          <h2 style="margin-top:18px;">${t('examples')}</h2>
          <div id="result-examples"></div>
          <h2 style="margin-top:18px;">${t('grammar')}</h2>
          <ul id="result-grammar" style="margin:0; padding-left:20px;"></ul>
        </div>
        <h2 style="margin-top:18px;">${t('tableEntry')}</h2>
        <form class="word-row" id="translate-result">
          <select id="result-article" aria-label="${t('article')}">
            <option value="">—</option>
            <option value="der">der</option>
            <option value="die">die</option>
            <option value="das">das</option>
          </select>
          <input type="text" id="result-german" aria-label="${t('germanWord')}" />
          <input type="text" id="result-translation" aria-label="${t('translation')}" />
          <select id="result-pos" aria-label="${t('partOfSpeech')}">
            ${ALL_POS.map((p) => `<option value="${p}">${p}</option>`).join('')}
          </select>
        </form>
      </div>
      <div id="translate-status"></div>
    </div>
  `;

  const $ = <T extends HTMLElement>(selector: string) => container.querySelector<T>(selector)!;
  const form = $<HTMLFormElement>('#translate-form');
  const fieldEl = $<HTMLDivElement>('#translate-field');
  const input = $<HTMLInputElement>('#translate-input');
  const suggestionsEl = $<HTMLUListElement>('#suggestions');
  const translateBtn = $<HTMLButtonElement>('#translate-btn');
  const addBtn = $<HTMLButtonElement>('#add-btn');
  const hintEl = $<HTMLDivElement>('#translate-hint');
  const statusEl = $<HTMLDivElement>('#translate-status');
  const detailsEl = $<HTMLDivElement>('#translate-details');
  const headingEl = $<HTMLDivElement>('#result-heading');
  const translationsEl = $<HTMLOListElement>('#result-translations');
  const moreBtn = $<HTMLButtonElement>('#more-btn');
  const extrasEl = $<HTMLDivElement>('#result-extras');
  const examplesEl = $<HTMLDivElement>('#result-examples');
  const grammarEl = $<HTMLUListElement>('#result-grammar');
  const resultForm = $<HTMLFormElement>('#translate-result');
  const articleEl = $<HTMLSelectElement>('#result-article');
  const germanEl = $<HTMLInputElement>('#result-german');
  const translationEl = $<HTMLInputElement>('#result-translation');
  const posEl = $<HTMLSelectElement>('#result-pos');

  // Answers already received in this visit, keyed by the lowercased input, so retyping or asking for details of a word shown a moment ago costs nothing.
  const quickCache = new Map<string, WordCard>();
  const fullCache = new Map<string, Translation>();
  // Every keystroke or new request bumps this; a response is applied only if it is still the latest.
  let requestSeq = 0;
  let requestAbort: AbortController | null = null;
  let liveTimer: ReturnType<typeof setTimeout> | null = null;
  let suggestTimer: ReturnType<typeof setTimeout> | null = null;
  let suggestAbort: AbortController | null = null;
  let activeSuggestion = -1;
  // Set once the word on screen has been saved; the Add button then stays off until the field's text changes.
  let justAdded = false;

  function showStatus(text: string, kind: 'error' | 'success'): void {
    statusEl.innerHTML = '';
    const el = document.createElement('div');
    el.className = `msg msg-${kind} reveal`;
    el.textContent = text;
    statusEl.appendChild(el);
  }

  function knownWords() {
    return getList(listId)?.words ?? [];
  }

  function updateHint(): void {
    const typed = input.value.trim().toLowerCase();
    const known = typed
      ? knownWords().find(
          (w) => w.german.toLowerCase() === typed || w.translation.toLowerCase().split(/,\s*/).includes(typed)
        )
      : undefined;
    hintEl.textContent = known ? t('alreadyHave', { word: `${displayGerman(known)} — ${known.translation}` }) : '';
  }

  // --- Result -------------------------------------------------------------

  function cancelRequest(): void {
    requestSeq++;
    requestAbort?.abort();
    requestAbort = null;
    if (liveTimer) clearTimeout(liveTimer);
    liveTimer = null;
    fieldEl.classList.remove('is-busy');
    translateBtn.classList.remove('is-loading');
    translateBtn.disabled = false;
  }

  function clearResult(): void {
    detailsEl.hidden = true;
    addBtn.disabled = true;
  }

  function showCard(card: WordCard): void {
    const { word, translations } = card;
    headingEl.textContent = displayGerman(word);
    translationsEl.replaceChildren(
      ...translations.map((variant) => {
        const li = document.createElement('li');
        li.textContent = variant;
        return li;
      })
    );
    articleEl.value = word.article ?? '';
    germanEl.value = word.german;
    translationEl.value = word.translation;
    posEl.value = word.partOfSpeech;
    extrasEl.hidden = true;
    moreBtn.hidden = false;
    detailsEl.classList.remove('is-stale');
    detailsEl.hidden = false;
    addBtn.disabled = justAdded;
    if (!justAdded) statusEl.innerHTML = '';
  }

  function showTranslation(translation: Translation): void {
    showCard(translation);
    examplesEl.replaceChildren(
      ...translation.examples.map((ex) => {
        const p = document.createElement('p');
        p.style.margin = '0 0 10px';
        const german = document.createElement('strong');
        german.textContent = ex.german;
        const ukrainian = document.createElement('div');
        ukrainian.className = 'muted';
        ukrainian.textContent = ex.ukrainian;
        p.append(german, ukrainian);
        return p;
      })
    );
    grammarEl.replaceChildren(
      ...translation.grammar.map((note) => {
        const li = document.createElement('li');
        li.textContent = note;
        return li;
      })
    );
    moreBtn.hidden = true;
    extrasEl.hidden = false;
  }

  /** Translates what is in the field: the short card while typing (`full: false`), or the whole card with examples and grammar. */
  async function translate(full: boolean): Promise<void> {
    const text = input.value.trim();
    const apiKey = getApiKey();
    cancelRequest();
    if (!text || !apiKey) return;

    const cacheKey = text.toLowerCase();
    const cachedFull = fullCache.get(cacheKey);
    const cachedQuick = quickCache.get(cacheKey);
    if (cachedFull) {
      showTranslation(cachedFull);
      return;
    }
    if (!full && cachedQuick) {
      showCard(cachedQuick);
      return;
    }

    const seq = requestSeq;
    const abort = new AbortController();
    requestAbort = abort;
    fieldEl.classList.add('is-busy');
    if (full) {
      translateBtn.disabled = true;
      translateBtn.classList.add('is-loading');
    }
    try {
      const { translateQuick, translateWord } = await loadTranslateModule();
      if (full) {
        const translation = await translateWord(apiKey, text, abort.signal);
        fullCache.set(cacheKey, translation);
        if (seq === requestSeq) showTranslation(translation);
      } else {
        const card = await translateQuick(apiKey, text, abort.signal);
        quickCache.set(cacheKey, card);
        if (seq === requestSeq) showCard(card);
      }
    } catch (err) {
      if (seq !== requestSeq) return; // superseded by newer typing — whatever went wrong no longer matters
      clearResult();
      showStatus(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      if (seq === requestSeq) {
        fieldEl.classList.remove('is-busy');
        translateBtn.classList.remove('is-loading');
        translateBtn.disabled = false;
      }
    }
  }

  // --- Suggestions --------------------------------------------------------

  function hideSuggestions(): void {
    if (suggestTimer) clearTimeout(suggestTimer);
    suggestAbort?.abort();
    suggestionsEl.hidden = true;
    suggestionsEl.replaceChildren();
    activeSuggestion = -1;
  }

  function setActiveSuggestion(index: number): void {
    const items = suggestionsEl.children;
    activeSuggestion = items.length === 0 ? -1 : (index + items.length) % items.length;
    Array.from(items).forEach((item, i) => item.classList.toggle('active', i === activeSuggestion));
  }

  function pickSuggestion(word: string): void {
    input.value = word;
    hideSuggestions();
    updateHint();
    translate(true);
  }

  function showSuggestions(words: { text: string; known: boolean }[]): void {
    suggestionsEl.replaceChildren(
      ...words.map(({ text, known }) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.textContent = text;
        if (known) {
          const tag = document.createElement('span');
          tag.className = 'muted';
          tag.textContent = t('knownTag');
          li.appendChild(tag);
        }
        // mousedown, not click: it fires before the field loses focus and the list is hidden.
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          pickSuggestion(text);
        });
        return li;
      })
    );
    activeSuggestion = -1;
    suggestionsEl.hidden = words.length === 0;
  }

  function scheduleSuggestions(): void {
    if (suggestTimer) clearTimeout(suggestTimer);
    suggestAbort?.abort();
    const typed = input.value.trim();
    if (!typed) {
      hideSuggestions();
      return;
    }
    suggestTimer = setTimeout(async () => {
      const abort = new AbortController();
      suggestAbort = abort;
      const lower = typed.toLowerCase();
      const own = knownWords()
        .map((w) => w.german)
        .filter((g) => g.toLowerCase().startsWith(lower));
      const remote = await suggestWords(typed, abort.signal);
      if (abort.signal.aborted) return;
      const seen = new Set<string>();
      const merged = [...own.map((text) => ({ text, known: true })), ...remote.map((text) => ({ text, known: false }))]
        // The exact text already typed is not a suggestion.
        .filter(({ text }) => text.toLowerCase() !== lower && !seen.has(text.toLowerCase()) && seen.add(text.toLowerCase()))
        .slice(0, 6);
      showSuggestions(merged);
    }, SUGGEST_DELAY_MS);
  }

  // --- Events -------------------------------------------------------------

  input.addEventListener('input', () => {
    cancelRequest();
    if (justAdded) {
      justAdded = false;
      addBtn.innerHTML = addLabel();
      addBtn.classList.remove('btn-added');
      statusEl.innerHTML = '';
    }
    updateHint();
    scheduleSuggestions();
    const text = input.value.trim();
    if (text.length < MIN_LIVE_LENGTH) {
      clearResult();
      statusEl.innerHTML = '';
      return;
    }
    // The card on screen belongs to the previous text until the new answer arrives.
    detailsEl.classList.add('is-stale');
    addBtn.disabled = true;
    liveTimer = setTimeout(() => translate(false), LIVE_TRANSLATE_DELAY_MS);
  });

  input.addEventListener('keydown', (e) => {
    if (suggestionsEl.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(activeSuggestion + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault();
      pickSuggestion(suggestionsEl.children[activeSuggestion].firstChild!.textContent!);
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  input.addEventListener('blur', hideSuggestions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    hideSuggestions();
    translate(true);
  });

  moreBtn.addEventListener('click', () => translate(true));

  resultForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const german = germanEl.value.trim();
    const translation = translationEl.value.trim();
    if (!german || !translation) {
      showStatus(t('fillBoth'), 'error');
      return;
    }
    const article = (articleEl.value || null) as Article | null;
    const { added } = addWordsToList(listId, [
      { german, article, translation, partOfSpeech: posEl.value as PartOfSpeech },
    ]);
    const shown = `${displayGerman({ german, article })} — ${translation}`;
    showStatus(t(added ? 'addedWord' : 'duplicateWord', { word: shown }), added ? 'success' : 'error');
    // The translation stays on screen; only the button changes, until a different word is typed.
    justAdded = true;
    addBtn.disabled = true;
    if (added) {
      addBtn.innerHTML = addedLabel();
      addBtn.classList.add('btn-added');
      onWordAdded();
    }
  });
}

function renderKeyForm(container: HTMLElement, listId: string, onWordAdded: () => void): void {
  container.innerHTML = `
    <div class="card">
      <h2>${t('keyTitle')}</h2>
      <p class="subtitle">${t('keyIntro')}</p>
      <form class="row" id="key-form">
        <input type="password" id="key-input" placeholder="sk-ant-…" autocomplete="off" style="flex:1; min-width:200px;" />
        <button class="btn btn-primary" id="key-btn" type="submit">${t('saveKey')}</button>
      </form>
      <div id="key-status" style="margin-top:12px;"></div>
    </div>
  `;

  const keyInput = container.querySelector<HTMLInputElement>('#key-input')!;
  const keyBtn = container.querySelector<HTMLButtonElement>('#key-btn')!;
  const statusEl = container.querySelector<HTMLDivElement>('#key-status')!;
  container.querySelector<HTMLFormElement>('#key-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = keyInput.value.trim();
    if (!key) return;
    keyBtn.disabled = true;
    try {
      await setApiKey(key);
      renderTranslateView(container, listId, onWordAdded);
    } catch (err) {
      statusEl.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'msg msg-error';
      el.textContent = t('keySaveFailed', { error: String(err) });
      statusEl.appendChild(el);
      keyBtn.disabled = false;
    }
  });
}
