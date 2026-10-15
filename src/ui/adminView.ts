import { listAccounts, saveAccountWords, watchAccount, type Account } from '../admin';
import { getLang, t } from '../i18n';
import type { Word } from '../types';
import { statCardsHtml } from './statsView';
import { renderWordsView, type WordStore } from './wordsView';

function accountLabel(account: Pick<Account, 'uid' | 'email'>): string {
  return account.email || t('adminNoEmail', { id: account.uid.slice(0, 6) });
}

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString(getLang() === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function overallAccuracy(words: Word[]): string {
  const correct = words.reduce((s, w) => s + w.correct, 0);
  const total = correct + words.reduce((s, w) => s + w.incorrect, 0);
  return total === 0 ? '—' : `${Math.round((correct / total) * 100)}%`;
}

function showError(container: HTMLElement, text: string): void {
  const el = document.createElement('div');
  el.className = 'msg msg-error reveal';
  el.textContent = text;
  container.replaceChildren(el);
}

/** The admin tab: every account at "#admin", one account's words at "#admin/<uid>". Returns a cleanup for when the view is left. */
export function renderAdminView(container: HTMLElement, myUid: string): () => void {
  const uid = location.hash.split('/')[1];
  if (uid) return renderAccount(container, uid, myUid);
  renderAccountList(container, myUid);
  return () => {};
}

async function renderAccountList(container: HTMLElement, myUid: string): Promise<void> {
  container.innerHTML = `<div class="card"><h2>${t('adminTitle')}</h2><p class="muted">${t('loading')}</p></div>`;
  let accounts: Account[];
  try {
    accounts = await listAccounts();
  } catch (err) {
    showError(container, t('adminLoadFailed', { error: String(err) }));
    return;
  }
  accounts.sort((a, b) => accountLabel(a).localeCompare(accountLabel(b)));

  container.innerHTML = `
    <div class="card">
      <h2>${t('adminTitle')}</h2>
      <p class="subtitle">${t('adminIntro')}</p>
      ${accounts.length === 0 ? `<p class="muted">${t('adminEmpty')}</p>` : '<div class="account-list"></div>'}
    </div>
  `;

  // One tappable row per account: who it is, then its numbers on a second line — fits a phone without a wide table.
  const listEl = container.querySelector<HTMLDivElement>('.account-list');
  for (const account of accounts) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'account-row';
    const name = document.createElement('strong');
    name.textContent = accountLabel(account) + (account.uid === myUid ? ` ${t('adminYou')}` : '');
    const details = document.createElement('span');
    details.className = 'muted';
    details.textContent = [
      t('adminWords', { count: account.words.length }),
      t('adminLearned', { count: account.words.filter((w) => w.learned).length }),
      t('adminAccuracy', { value: overallAccuracy(account.words) }),
      formatDate(account.updatedAt),
    ].join(' · ');
    row.append(name, details);
    row.addEventListener('click', () => {
      location.hash = `admin/${account.uid}`;
    });
    listEl?.appendChild(row);
  }
}

function renderAccount(container: HTMLElement, uid: string, myUid: string): () => void {
  container.innerHTML = `
    <p style="margin:0 0 12px;"><a class="btn-link" href="#admin" style="padding-left:0;">${t('adminBack')}</a></p>
    <h2 id="account-title"></h2>
    <p class="muted" id="account-active" style="margin:-6px 0 16px; font-size:13px;"></p>
    <div id="account-status"></div>
    <div id="account-stats"><p class="muted">${t('loading')}</p></div>
    <div id="account-words"></div>
  `;
  const titleEl = container.querySelector<HTMLHeadingElement>('#account-title')!;
  const activeEl = container.querySelector<HTMLParagraphElement>('#account-active')!;
  const statusEl = container.querySelector<HTMLDivElement>('#account-status')!;
  const statsEl = container.querySelector<HTMLDivElement>('#account-stats')!;
  const wordsEl = container.querySelector<HTMLDivElement>('#account-words')!;

  let words: Word[] = [];

  function refreshStats(): void {
    statsEl.innerHTML = statCardsHtml(words);
  }

  function save(): void {
    refreshStats();
    saveAccountWords(uid, words).catch((err) => showError(statusEl, t('adminSaveFailed', { error: String(err) })));
  }

  // Edits here go straight to the account's list in the cloud.
  const store: WordStore = {
    words: () => words,
    update: (id, patch) => {
      words = words.map((w) => (w.id === id ? { ...w, ...patch } : w));
      save();
    },
    remove: (id) => {
      words = words.filter((w) => w.id !== id);
      save();
    },
    clear: () => {
      words = [];
      save();
    },
  };

  const unsubscribe = watchAccount(uid, (account) => {
    titleEl.textContent = accountLabel(account) + (uid === myUid ? ` ${t('adminYou')}` : '');
    activeEl.textContent = t('adminLastActive', { date: formatDate(account.updatedAt) });
    words = account.words;
    refreshStats();
    renderWordsView(wordsEl, store);
  });
  return unsubscribe;
}
