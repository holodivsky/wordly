import { accuracy, displayGerman, type Word } from '../types';
import { t } from '../i18n';

function accuracyColor(acc: number): string {
  if (acc >= 80) return 'var(--good)';
  if (acc >= 50) return 'var(--warn)';
  return 'var(--bad)';
}

/** The four summary tiles: total, learned, answers given, overall accuracy. */
export function statCardsHtml(words: Word[]): string {
  const learnedCount = words.filter((w) => w.learned).length;
  const totalCorrect = words.reduce((s, w) => s + w.correct, 0);
  const totalIncorrect = words.reduce((s, w) => s + w.incorrect, 0);
  const totalAttempts = totalCorrect + totalIncorrect;
  const overallAccuracy = totalAttempts === 0 ? null : Math.round((totalCorrect / totalAttempts) * 100);

  return `
    <div class="stat-cards">
      <div class="stat-card">
        <div class="value">${words.length}</div>
        <div class="label">${t('statTotal')}</div>
      </div>
      <div class="stat-card">
        <div class="value">${learnedCount}</div>
        <div class="label">${t('colLearned')}</div>
      </div>
      <div class="stat-card">
        <div class="value">${totalAttempts}</div>
        <div class="label">${t('statAttempts')}</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color:${overallAccuracy === null ? 'inherit' : accuracyColor(overallAccuracy)}">${
    overallAccuracy === null ? '—' : `${overallAccuracy}%`
  }</div>
        <div class="label">${t('statAccuracy')}</div>
      </div>
    </div>
  `;
}

export function renderStatsView(container: HTMLElement, words: Word[]): void {
  if (words.length === 0) {
    container.innerHTML = `<div class="card empty-state">${t('statsEmpty')}</div>`;
    return;
  }

  const withAttempts = words
    .filter((w) => w.correct + w.incorrect > 0)
    .sort((a, b) => (accuracy(a) ?? 0) - (accuracy(b) ?? 0));

  container.innerHTML = `
    ${statCardsHtml(words)}

    <div class="card">
      <h2>${t('perWord')} ${withAttempts.length ? t('weakestFirst') : ''}</h2>
      ${
        withAttempts.length === 0
          ? `<p class="muted">${t('noAttempts')}</p>`
          : `<div class="table-scroll"><table>
              <thead>
                <tr>
                  <th>${t('colWord')}</th>
                  <th>${t('translation')}</th>
                  <th>${t('colAttempts')}</th>
                  <th>${t('colAccuracy')}</th>
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
    </div>
  `;
}
