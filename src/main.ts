import { renderImportView } from './ui/importView';
import { renderQuizView } from './ui/quizView';
import { renderWordsView } from './ui/wordsView';
import { renderStatsView } from './ui/statsView';
import { loadLists, createList, renameList, deleteList, getActiveListId, setActiveListId, getList } from './storage';

// Cross-device account sync (email-link sign-in + Firestore) is disabled for
// now — Firebase's free-tier daily quota for email sign-in got exhausted
// during testing, and delivery reliability needs a custom SMTP relay set up
// first. The app is fully stable and usable locally without it. Flip this
// back to true once that's sorted; nothing else needs to change.
const ACCOUNT_SYNC_ENABLED = false;

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
let accountMenuOpen = false;

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

function getAccountInitials(email: string): string {
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function colorForEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 42%)`;
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

function renderAccountMessage(): string {
  if (!accountMessage) return '';
  return `<div class="msg ${accountMessage.isError ? 'msg-error' : 'msg-success'}" style="margin-top:10px;">${accountMessage.text}</div>`;
}

function renderAccountCorner(): string {
  if (accountEmail) {
    const initials = getAccountInitials(accountEmail);
    const color = colorForEmail(accountEmail);
    return `
      <div class="account-corner" id="account-corner">
        <button class="avatar-circle" id="account-toggle" style="background:${color};" title="${accountEmail}">${initials}</button>
        ${
          accountMenuOpen
            ? `
          <div class="account-dropdown card">
            <div class="muted" style="font-size:12px;">Увійшов як</div>
            <div style="font-weight:600; margin-bottom:10px; word-break:break-all;">${accountEmail}</div>
            <div class="muted" style="font-size:12px; margin-bottom:12px;">
              Списки й прогрес автоматично синхронізуються з усіма твоїми пристроями.
            </div>
            <button class="btn btn-danger" id="sign-out-btn" style="width:100%;" ${accountBusy ? 'disabled' : ''}>Вийти</button>
            ${renderAccountMessage()}
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  return `
    <div class="account-corner" id="account-corner">
      <button class="btn btn-primary" id="account-toggle">Увійти</button>
      ${
        accountMenuOpen
          ? `
        <div class="account-dropdown card">
          <strong style="font-size:14px;">Увійти</strong>
          <div class="muted" style="font-size:12px; margin: 4px 0 10px;">
            Синхронізуй списки й прогрес між своїми пристроями (ноут, телефон).
          </div>
          <input type="text" id="email-input" placeholder="твоя@пошта.com" style="width:100%; margin-bottom:8px; box-sizing:border-box;" />
          <button class="btn btn-primary" id="send-link-btn" style="width:100%;" ${accountBusy ? 'disabled' : ''}>Надіслати посилання</button>
          ${renderAccountMessage()}
        </div>
      `
          : ''
      }
    </div>
  `;
}

function render(): void {
  const activeListId = ensureActiveListId();
  const lists = loadLists();
  const activeList = getList(activeListId)!;
  const tab = currentTab(activeListId);

  app.innerHTML = `
    <div class="row-between" style="align-items:flex-start;">
      <div>
        <h1>Німецькі слова</h1>
        <p class="subtitle">Тренажер лексики: імпортуй слова, грай, відстежуй прогрес.</p>
      </div>
      ${ACCOUNT_SYNC_ENABLED ? renderAccountCorner() : ''}
    </div>

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

    <nav class="tabs">
      ${(Object.keys(TAB_LABELS) as Tab[])
        .map((t) => `<button data-tab="${t}" class="${t === tab ? 'active' : ''}">${TAB_LABELS[t]}</button>`)
        .join('')}
    </nav>
    <div id="view"></div>
  `;

  // Every click inside the account corner re-renders the whole app (via the
  // handlers below), which detaches the original event target from the
  // document — a naive document-level "click outside" check would then see
  // that detached target as "outside" and instantly close what was just
  // opened. Stopping propagation here means the outside-click listener only
  // ever sees clicks that are genuinely outside this corner.
  app.querySelector<HTMLDivElement>('#account-corner')?.addEventListener('click', (e) => e.stopPropagation());

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

  app.querySelector<HTMLButtonElement>('#account-toggle')?.addEventListener('click', () => {
    accountMenuOpen = !accountMenuOpen;
    render();
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

  app.querySelector<HTMLButtonElement>('#sign-out-btn')?.addEventListener('click', async () => {
    if (!confirm('Вийти з акаунта? Дані залишаться на цьому пристрої, але перестануть оновлюватись з інших.')) return;
    accountBusy = true;
    accountMenuOpen = false;
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

document.addEventListener('click', (e) => {
  if (!accountMenuOpen) return;
  const corner = document.getElementById('account-corner');
  if (corner && !corner.contains(e.target as Node)) {
    accountMenuOpen = false;
    render();
  }
});

window.addEventListener('hashchange', render);
render();
if (ACCOUNT_SYNC_ENABLED) initAccount();
