import { renderImportView } from './ui/importView';
import { renderQuizView } from './ui/quizView';
import { renderWordsView } from './ui/wordsView';
import { renderStatsView } from './ui/statsView';
import { loadLists, createList, renameList, deleteList, getActiveListId, setActiveListId, getList } from './storage';

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

window.addEventListener('hashchange', render);
render();
