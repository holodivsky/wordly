import { renderImportView } from './ui/importView';
import { renderQuizView } from './ui/quizView';
import { renderWordsView } from './ui/wordsView';
import { renderStatsView } from './ui/statsView';
import { loadLists, createList, renameList, deleteList, getActiveListId, setActiveListId, getList } from './storage';

const HAS_SIGNED_IN_KEY = 'gvt.hasSignedInBefore.v1';

// The firebase SDK is sizeable, so it's only loaded on demand: when the user
// actually interacts with the account panel, or on boot if this device was
// previously signed in (to restore the session), or if the current URL is
// an email sign-in link.
function loadSyncModule() {
  return import('./sync');
}

let accountEmail: string | null = null;
let accountBusy = false;
let accountMessage: { text: string; isError: boolean } | null = null;
let accountListenerStarted = false;

/** Idempotent: wires up the auth-state listener at most once per page load. */
async function ensureAccountListenerStarted(): Promise<void> {
  if (accountListenerStarted) return;
  accountListenerStarted = true;
  const { initAccountSync } = await loadSyncModule();
  initAccountSync((status) => {
    accountEmail = status.email;
    if (status.email) {
      localStorage.setItem(HAS_SIGNED_IN_KEY, '1');
      accountMessage = null;
    } else {
      localStorage.removeItem(HAS_SIGNED_IN_KEY);
    }
    render();
  });
}

type Tab = 'play' | 'import' | 'words' | 'stats';

const TAB_LABELS: Record<Tab, string> = {
  play: 'Гра',
  import: 'Імпорт',
  words: 'Слова',
  stats: 'Статистика',
};

const app = document.querySelector<HTMLDivElement>('#app')!;

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

function validTab(hash: string): Tab | null {
  const t = hash.replace('#', '');
  return t === 'play' || t === 'import' || t === 'words' || t === 'stats' ? t : null;
}

function currentTab(activeListId: string): Tab {
  const fromHash = validTab(location.hash);
  if (fromHash) return fromHash;
  const list = getList(activeListId);
  return !list || list.words.length === 0 ? 'import' : 'play';
}

function navigate(tab: Tab): void {
  location.hash = tab;
}

function renderAccountPanel(): string {
  const messageHtml = accountMessage
    ? `<div class="msg ${accountMessage.isError ? 'msg-error' : 'msg-success'}" style="margin-top:10px;">${accountMessage.text}</div>`
    : '';

  if (accountEmail) {
    return `
      <div class="card" style="margin-bottom:20px;">
        <div class="row-between">
          <div>
            <strong>Акаунт</strong>
            <div class="muted" style="font-size:13px; margin-top:2px;">
              Увійшов як ${accountEmail} — списки й прогрес автоматично синхронізуються з усіма твоїми пристроями.
            </div>
          </div>
          <button class="btn btn-danger" id="sign-out-btn" ${accountBusy ? 'disabled' : ''}>Вийти</button>
        </div>
        ${messageHtml}
      </div>
    `;
  }

  return `
    <div class="card" style="margin-bottom:20px;">
      <strong>Акаунт</strong>
      <div class="muted" style="font-size:13px; margin: 2px 0 10px;">
        Увійди своєю поштою, щоб автоматично синхронізувати списки й прогрес між усіма своїми пристроями (ноут, телефон).
      </div>
      <div class="row">
        <input type="text" id="email-input" placeholder="твоя@пошта.com" style="min-width:220px;" />
        <button class="btn btn-primary" id="send-link-btn" ${accountBusy ? 'disabled' : ''}>Надіслати посилання для входу</button>
      </div>
      <div class="row" style="margin-top:10px;">
        <span class="muted" style="font-size:13px;">або</span>
        <button class="btn" id="google-signin-btn" ${accountBusy ? 'disabled' : ''}>Увійти через Google</button>
      </div>
      ${messageHtml}
    </div>
  `;
}

function render(): void {
  const activeListId = ensureActiveListId();
  const lists = loadLists();
  const activeList = getList(activeListId)!;
  const tab = currentTab(activeListId);

  app.innerHTML = `
    <h1>Німецькі слова</h1>
    <p class="subtitle">Тренажер лексики: імпортуй слова, грай, відстежуй прогрес.</p>

    <div class="card" style="margin-bottom:20px;">
      <div class="row-between">
        <div class="row">
          <label class="muted" for="list-select">Список:</label>
          <select id="list-select">
            ${lists.map((l) => `<option value="${l.id}" ${l.id === activeListId ? 'selected' : ''}>${l.name} (${l.words.length})</option>`).join('')}
          </select>
        </div>
        <div class="row">
          <button class="btn" id="new-list-btn">+ Новий список</button>
          <button class="btn" id="rename-list-btn">Перейменувати</button>
          <button class="btn btn-danger" id="delete-list-btn">Видалити список</button>
        </div>
      </div>
    </div>

    ${renderAccountPanel()}

    <nav class="tabs">
      ${(Object.keys(TAB_LABELS) as Tab[])
        .map((t) => `<button data-tab="${t}" class="${t === tab ? 'active' : ''}">${TAB_LABELS[t]}</button>`)
        .join('')}
    </nav>
    <div id="view"></div>
  `;

  app.querySelectorAll<HTMLButtonElement>('nav.tabs button').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.tab as Tab));
  });

  app.querySelector<HTMLSelectElement>('#list-select')!.addEventListener('change', (e) => {
    setActiveListId((e.target as HTMLSelectElement).value);
    render();
  });

  app.querySelector<HTMLButtonElement>('#new-list-btn')!.addEventListener('click', () => {
    const name = prompt('Назва нового списку (наприклад: Список дружини):');
    if (name && name.trim()) {
      createList(name);
      render();
    }
  });

  app.querySelector<HTMLButtonElement>('#rename-list-btn')!.addEventListener('click', () => {
    const name = prompt('Нова назва списку:', activeList.name);
    if (name && name.trim()) {
      renameList(activeListId, name);
      render();
    }
  });

  app.querySelector<HTMLButtonElement>('#delete-list-btn')!.addEventListener('click', () => {
    if (confirm(`Видалити список "${activeList.name}" і всі слова та статистику в ньому? Дію не можна скасувати.`)) {
      deleteList(activeListId);
      render();
    }
  });

  app.querySelector<HTMLButtonElement>('#send-link-btn')?.addEventListener('click', async () => {
    const emailInput = app.querySelector<HTMLInputElement>('#email-input')!;
    const email = emailInput.value.trim();
    if (!email) return;
    accountBusy = true;
    accountMessage = null;
    render();
    try {
      const [{ sendSignInLink }] = await Promise.all([loadSyncModule(), ensureAccountListenerStarted()]);
      await sendSignInLink(email);
      accountMessage = { text: `Перевір пошту ${email} і натисни посилання для входу.`, isError: false };
    } catch (err) {
      accountMessage = { text: `Не вдалося надіслати посилання: ${String(err)}`, isError: true };
    } finally {
      accountBusy = false;
      render();
    }
  });

  app.querySelector<HTMLButtonElement>('#google-signin-btn')?.addEventListener('click', async () => {
    accountBusy = true;
    accountMessage = null;
    render();
    try {
      const [{ signInWithGoogle }] = await Promise.all([loadSyncModule(), ensureAccountListenerStarted()]);
      await signInWithGoogle();
      // accountEmail/render() are updated by the auth-state-change listener once sign-in resolves.
    } catch (err) {
      accountMessage = { text: `Не вдалося увійти через Google: ${String(err)}`, isError: true };
      accountBusy = false;
      render();
    }
  });

  app.querySelector<HTMLButtonElement>('#sign-out-btn')?.addEventListener('click', async () => {
    if (!confirm('Вийти з акаунта? Дані залишаться на цьому пристрої, але перестануть оновлюватись з інших.')) return;
    accountBusy = true;
    render();
    const { signOutOfAccount } = await loadSyncModule();
    await signOutOfAccount();
    accountBusy = false;
    // render() fires again via the auth-state-change callback set up in initAccountSync
  });

  const view = app.querySelector<HTMLDivElement>('#view')!;

  switch (tab) {
    case 'import':
      renderImportView(view, activeListId, () => navigate('play'));
      break;
    case 'play':
      renderQuizView(view, activeListId);
      break;
    case 'words':
      renderWordsView(view, activeListId);
      break;
    case 'stats':
      renderStatsView(view, activeListId);
      break;
  }
}

async function initAccount(): Promise<void> {
  const looksLikeSignInLink = new URLSearchParams(location.search).has('oobCode');
  const hasSignedInBefore = localStorage.getItem(HAS_SIGNED_IN_KEY) === '1';
  if (!looksLikeSignInLink && !hasSignedInBefore) return;

  const { completeSignInFromLink } = await loadSyncModule();
  await ensureAccountListenerStarted();

  if (looksLikeSignInLink) {
    const result = await completeSignInFromLink(() => prompt('Підтверди свою пошту для завершення входу:'));
    if (result === 'no-email') {
      accountMessage = { text: 'Вхід скасовано — пошту не підтверджено.', isError: true };
      render();
    }
  }
}

window.addEventListener('hashchange', render);
render();
initAccount();
