import { getList, updateWordInList, deleteWordFromList, clearListWords } from '../storage';
import { ALL_POS, accuracy, displayGerman, type PartOfSpeech } from '../types';
import { t } from '../i18n';

export function renderWordsView(container: HTMLElement, listId: string): void {
  let search = '';
  let posFilter: PartOfSpeech | 'all' = 'all';
  let learnedFilter: 'all' | 'learned' | 'not-learned' = 'all';

  render();

  function render(): void {
    const words = getList(listId)?.words ?? [];

    const filtered = words.filter((w) => {
      if (posFilter !== 'all' && w.partOfSpeech !== posFilter) return false;
      if (learnedFilter === 'learned' && !w.learned) return false;
      if (learnedFilter === 'not-learned' && w.learned) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!w.german.toLowerCase().includes(q) && !w.translation.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    container.innerHTML = `
      <div class="card">
        <div class="row-between">
          <h2 style="margin:0;">${t('wordsTitle', { count: words.length })}</h2>
          ${words.length > 0 ? `<button class="btn btn-danger" id="clear-btn">${t('clearAll')}</button>` : ''}
        </div>
        ${
          words.length === 0
            ? `<div class="empty-state">${t('wordsEmpty')}</div>`
            : `
          <div class="row" style="margin: 14px 0;">
            <input type="search" id="search-input" placeholder="${t('search')}" value="${search}" />
            <select id="pos-filter">
              <option value="all">${t('allPos')}</option>
              ${ALL_POS.map((p) => `<option value="${p}" ${posFilter === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
            <select id="learned-filter">
              <option value="all" ${learnedFilter === 'all' ? 'selected' : ''}>${t('filterAll')}</option>
              <option value="not-learned" ${learnedFilter === 'not-learned' ? 'selected' : ''}>${t('filterNotLearned')}</option>
              <option value="learned" ${learnedFilter === 'learned' ? 'selected' : ''}>${t('filterLearned')}</option>
            </select>
          </div>
          <div class="table-scroll"><table>
            <thead>
              <tr>
                <th>${t('colWord')}</th>
                <th>${t('translation')}</th>
                <th>${t('partOfSpeech')}</th>
                <th>${t('colAccuracy')}</th>
                <th>${t('colLearned')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map((w) => {
                  const acc = accuracy(w);
                  return `
                <tr data-id="${w.id}">
                  <td>${displayGerman(w)}</td>
                  <td>${w.translation}</td>
                  <td><span class="badge badge-${w.partOfSpeech}">${w.partOfSpeech}</span></td>
                  <td class="muted">${acc === null ? '—' : `${acc}% (${w.correct}/${w.correct + w.incorrect})`}</td>
                  <td><input type="checkbox" class="learned-checkbox" ${w.learned ? 'checked' : ''} /></td>
                  <td><button class="btn btn-danger delete-btn" style="padding:4px 10px;">✕</button></td>
                </tr>`;
                })
                .join('')}
            </tbody>
          </table></div>
          ${filtered.length === 0 ? `<p class="muted" style="margin-top:12px;">${t('nothingFound')}</p>` : ''}
          `
        }
      </div>
    `;

    if (words.length === 0) return;

    container.querySelector<HTMLInputElement>('#search-input')!.addEventListener('input', (e) => {
      search = (e.target as HTMLInputElement).value;
      render();
    });
    container.querySelector<HTMLSelectElement>('#pos-filter')!.addEventListener('change', (e) => {
      posFilter = (e.target as HTMLSelectElement).value as PartOfSpeech | 'all';
      render();
    });
    container.querySelector<HTMLSelectElement>('#learned-filter')!.addEventListener('change', (e) => {
      learnedFilter = (e.target as HTMLSelectElement).value as 'all' | 'learned' | 'not-learned';
      render();
    });
    container.querySelector<HTMLButtonElement>('#clear-btn')?.addEventListener('click', () => {
      if (confirm(t('confirmClear'))) {
        clearListWords(listId);
        render();
      }
    });

    container.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((row) => {
      const id = row.dataset.id!;
      row.querySelector<HTMLInputElement>('.learned-checkbox')!.addEventListener('change', (e) => {
        updateWordInList(listId, id, { learned: (e.target as HTMLInputElement).checked });
      });
      row.querySelector<HTMLButtonElement>('.delete-btn')!.addEventListener('click', () => {
        deleteWordFromList(listId, id);
        render();
      });
    });
  }
}
