import type { User } from 'firebase/auth';
import { renderImportView } from './ui/importView';
import { renderQuizView } from './ui/quizView';
import { localWordStore, renderWordsView } from './ui/wordsView';
import { renderAdminView } from './ui/adminView';
import { isAdmin } from './admin';
import { renderStatsView } from './ui/statsView';
import { renderLoginView } from './ui/loginView';
import { renderTranslateView } from './ui/translateView';
import { loadLists, createList, getActiveListId, getList } from './storage';
import { displayLogin, signOutAccount, startAccountSync, watchAuth } from './account';
import { forgetApiKey, loadApiKey } from './apiKey';
import { LOGO } from './logo';
import { getLang, setLang, t, type MessageKey } from './i18n';

// Inside loops over tabs the loop variable is also called `t`.
const translate = t;

type Tab = 'translate' | 'game' | 'words' | 'admin';
type WordsSection = 'list' | 'import' | 'stats';

const TAB_LABELS: Record<Tab, MessageKey> = {
  translate: 'tabTranslate',
  game: 'tabGame',
  words: 'tabWords',
  admin: 'tabAdmin',
};

const SECTION_LABELS: Record<WordsSection, MessageKey> = {
  list: 'sectionList',
  import: 'sectionImport',
  stats: 'sectionStats',
};

const app = document.querySelector<HTMLDivElement>('#app')!;

let currentUser: User | null = null;

function ensureActiveListId(): string {
  let lists = loadLists();
  if (lists.length === 0) {
    createList('Мої слова');
    lists = loadLists();
  }
  const activeId = getActiveListId();
  if (activeId) return activeId;
  return lists[0].id;
}

// The hash is "#<tab>", or "#words/<section>" inside Words, or "#admin/<uid>" for one account in Admin.
function currentTab(): Tab {
  const tab = location.hash.replace('#', '').split('/')[0];
  if (tab === 'admin') return isAdmin(currentUser) ? 'admin' : 'translate';
  return tab === 'game' || tab === 'words' ? tab : 'translate';
}

function visibleTabs(): Tab[] {
  return (Object.keys(TAB_LABELS) as Tab[]).filter((tab) => tab !== 'admin' || isAdmin(currentUser));
}

// Views that keep a live connection (the admin's account editor) hand back a cleanup, run before the next render.
let disposeView: (() => void) | null = null;

function currentSection(): WordsSection {
  const section = location.hash.split('/')[1];
  return section === 'import' || section === 'stats' ? section : 'list';
}

function navigate(target: Tab | `words/${WordsSection}`): void {
  location.hash = target;
}

function renderWordsTab(view: HTMLElement, listId: string): void {
  const section = currentSection();
  view.innerHTML = `
    <div class="row" style="margin-bottom:16px;">
      ${(Object.keys(SECTION_LABELS) as WordsSection[])
        .map((s) => `<button data-section="${s}" class="btn ${s === section ? 'btn-primary' : ''}">${t(SECTION_LABELS[s])}</button>`)
        .join('')}
    </div>
    <div id="section"></div>
  `;
  view.querySelectorAll<HTMLButtonElement>('button[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(`words/${btn.dataset.section as WordsSection}`));
  });

  const container = view.querySelector<HTMLDivElement>('#section')!;
  switch (section) {
    case 'list':
      renderWordsView(container, localWordStore(listId));
      break;
    case 'import':
      renderImportView(container, listId, refreshWordCount);
      break;
    case 'stats':
      renderStatsView(container, getList(listId)?.words ?? []);
      break;
  }
}

/** Updates the word count on the Words tab without re-rendering (and so resetting) the current view. */
function refreshWordCount(): void {
  const el = app.querySelector<HTMLSpanElement>('#word-count');
  const list = getList(ensureActiveListId());
  if (el && list) el.textContent = String(list.words.length);
}

function render(): void {
  disposeView?.();
  disposeView = null;
  if (!currentUser) return;
  const activeListId = ensureActiveListId();
  const activeList = getList(activeListId)!;
  const tab = currentTab();

  app.innerHTML = `
    <div class="row-between" style="margin-bottom:8px;">
      <h1>${LOGO}Wordly</h1>
      <div class="row" style="gap:4px;">
        <span class="muted" id="account-login" style="font-size:13px;"></span>
        <button class="btn-link" id="lang-btn" title="${t('switchLangTitle')}">${t('switchLang')}</button>
        <button class="btn-link" id="sign-out-btn">${t('signOut')}</button>
      </div>
    </div>

    <nav class="tabs">
      ${visibleTabs()
        .map(
          (t) =>
            `<button data-tab="${t}" class="${t === tab ? 'active' : ''}">${translate(TAB_LABELS[t])}${
              t === 'words' ? ` <span class="muted" id="word-count">${activeList.words.length}</span>` : ''
            }</button>`
        )
        .join('')}
    </nav>
    <div id="view"></div>
  `;

  app.querySelector<HTMLSpanElement>('#account-login')!.textContent = displayLogin(currentUser);
  app.querySelector<HTMLButtonElement>('#lang-btn')!.addEventListener('click', () => {
    setLang(getLang() === 'uk' ? 'en' : 'uk');
    render();
  });
  app.querySelector<HTMLButtonElement>('#sign-out-btn')!.addEventListener('click', async () => {
    forgetApiKey();
    await signOutAccount(true);
  });

  app.querySelectorAll<HTMLButtonElement>('nav.tabs button').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.tab as Tab));
  });

  const view = app.querySelector<HTMLDivElement>('#view')!;

  switch (tab) {
    case 'translate':
      renderTranslateView(view, activeListId, refreshWordCount);
      break;
    case 'game':
      renderQuizView(view, activeListId);
      break;
    case 'words':
      renderWordsTab(view, activeListId);
      break;
    case 'admin':
      disposeView = renderAdminView(view, currentUser.uid);
      break;
  }
}

function showLoading(): void {
  app.innerHTML = `<h1>${LOGO}Wordly</h1><p class="subtitle">${t('loading')}</p>`;
}

window.addEventListener('hashchange', render);

showLoading();
watchAuth(async (user) => {
  if (!user) {
    const wasSignedIn = currentUser !== null;
    currentUser = null;
    // An account that isn't allowed in firestore.rules is signed out below with its own notice.
    if (wasSignedIn || !app.querySelector('#login-form')) renderLoginView(app, null);
    return;
  }
  showLoading();
  try {
    await startAccountSync(user, render);
  } catch (err) {
    const denied = (err as { code?: string }).code === 'permission-denied';
    // Words already on this device are left alone: they may not be saved anywhere else yet.
    await signOutAccount(false);
    renderLoginView(
      app,
      denied ? t('noAccess') : t('loadFailed', { error: String(err) })
    );
    return;
  }
  // Without the key only translating is unavailable; the rest of the app works (e.g. offline).
  await loadApiKey().catch(() => {});
  currentUser = user;
  render();
});
