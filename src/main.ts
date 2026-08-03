import { renderImportView } from './ui/importView';
import { renderQuizView } from './ui/quizView';
import { renderWordsView } from './ui/wordsView';
import { renderStatsView } from './ui/statsView';
import { loadWords } from './storage';

type Tab = 'play' | 'import' | 'words' | 'stats';

const TAB_LABELS: Record<Tab, string> = {
  play: 'Гра',
  import: 'Імпорт',
  words: 'Слова',
  stats: 'Статистика',
};

const app = document.querySelector<HTMLDivElement>('#app')!;

function validTab(hash: string): Tab | null {
  const t = hash.replace('#', '');
  return t === 'play' || t === 'import' || t === 'words' || t === 'stats' ? t : null;
}

function currentTab(): Tab {
  const fromHash = validTab(location.hash);
  if (fromHash) return fromHash;
  return loadWords().length === 0 ? 'import' : 'play';
}

function navigate(tab: Tab): void {
  location.hash = tab;
}

function render(): void {
  const tab = currentTab();

  app.innerHTML = `
    <h1>Німецькі слова</h1>
    <p class="subtitle">Тренажер лексики: імпортуй слова, грай, відстежуй прогрес.</p>
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

  const view = app.querySelector<HTMLDivElement>('#view')!;

  switch (tab) {
    case 'import':
      renderImportView(view, () => navigate('play'));
      break;
    case 'play':
      renderQuizView(view);
      break;
    case 'words':
      renderWordsView(view);
      break;
    case 'stats':
      renderStatsView(view);
      break;
  }
}

window.addEventListener('hashchange', render);
render();
