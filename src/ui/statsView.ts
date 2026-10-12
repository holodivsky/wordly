import { getList } from '../storage';
import { accuracy, displayGerman } from '../types';

function accuracyColor(acc: number): string {
  if (acc >= 80) return 'var(--good)';
  if (acc >= 50) return 'var(--warn)';
  return 'var(--bad)';
}

export function renderStatsView(container: HTMLElement, listId: string): void {
  const words = getList(listId)?.words ?? [];

  if (words.length === 0) {
    container.innerHTML = `<div class="card empty-state">Ще немає даних. Додай слова і зіграй кілька раундів.</div>`;
    return;
  }

  const learnedCount = words.filter((w) => w.learned).length;
  const totalCorrect = words.reduce((s, w) => s + w.correct, 0);
  const totalIncorrect = words.reduce((s, w) => s + w.incorrect, 0);
  const totalAttempts = totalCorrect + totalIncorrect;
  const overallAccuracy = totalAttempts === 0 ? null : Math.round((totalCorrect / totalAttempts) * 100);

  const withAttempts = words
    .filter((w) => w.correct + w.incorrect > 0)
    .sort((a, b) => (accuracy(a) ?? 0) - (accuracy(b) ?? 0));
  const withoutAttempts = words.filter((w) => w.correct + w.incorrect === 0);

  container.innerHTML = `
    <div class="stat-cards">
      <div class="stat-card">
        <div class="value">${words.length}</div>
        <div class="label">Усього слів</div>
      </div>
      <div class="stat-card">
        <div class="value">${learnedCount}</div>
        <div class="label">Вивчено</div>
      </div>
      <div class="stat-card">
        <div class="value">${totalAttempts}</div>
        <div class="label">Спроб відповіді</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color:${overallAccuracy === null ? 'inherit' : accuracyColor(overallAccuracy)}">${
    overallAccuracy === null ? '—' : `${overallAccuracy}%`
  }</div>
        <div class="label">Загальна точність</div>
      </div>
    </div>

    <div class="card">
      <h2>Точність по словах ${withAttempts.length ? '(найслабші зверху)' : ''}</h2>
      ${
        withAttempts.length === 0
          ? `<p class="muted">Ще немає спроб — зіграй раунд, щоб побачити статистику по кожному слову.</p>`
          : `<div class="table-scroll"><table>
              <thead>
                <tr>
                  <th>Слово</th>
                  <th>Переклад</th>
                  <th>Спроб</th>
                  <th>Точність</th>
                </tr>
              </thead>
              <tbody>
                ${withAttempts
                  .map((w) => {
                    const acc = accuracy(w)!;
                    const total = w.correct + w.incorrect;
                    return `
                  <tr>
                    <td>${displayGerman(w)}</td>
                    <td>${w.translation}</td>
                    <td class="muted">${total}</td>
                    <td>
                      <div class="row" style="gap:8px;">
                        <div class="accuracy-bar" style="flex:1;">
                          <div class="accuracy-bar-fill" style="width:${acc}%; background:${accuracyColor(acc)};"></div>
                        </div>
                        <span style="min-width:36px; color:${accuracyColor(acc)};">${acc}%</span>
                      </div>
                    </td>
                  </tr>`;
                  })
                  .join('')}
              </tbody>
            </table></div>`
      }
      ${
        withoutAttempts.length > 0
          ? `<p class="muted" style="margin-top:12px;">Ще не тренувались (${withoutAttempts.length}): ${withoutAttempts
              .map((w) => displayGerman(w))
              .join(', ')}</p>`
          : ''
      }
    </div>
  `;
}
