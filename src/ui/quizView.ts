import { getList, recordAnswerInList, updateWordInList } from '../storage';
import { buildRound, type Question } from '../quiz';
import { accuracy, displayGerman, type Word } from '../types';

type Filter = 'all' | 'not-learned' | 'learned';

function filterWords(listId: string, filter: Filter): Word[] {
  const words = getList(listId)?.words ?? [];
  if (filter === 'not-learned') return words.filter((w) => !w.learned);
  if (filter === 'learned') return words.filter((w) => w.learned);
  return words;
}

export function renderQuizView(container: HTMLElement, listId: string): void {
  let filter: Filter = 'not-learned';
  renderStart();

  function renderStart(): void {
    const pool = filterWords(listId, filter);
    const totalWords = getList(listId)?.words.length ?? 0;

    if (totalWords === 0) {
      container.innerHTML = `
        <div class="card empty-state">
          У цьому списку ще немає слів. Перейди на вкладку "Імпорт", щоб додати слова або завантажити приклад.
        </div>
      `;
      return;
    }

    const notEnough = pool.length < 2;

    container.innerHTML = `
      <div class="card">
        <h2>Гра: вгадай переклад</h2>
        <p class="subtitle">Раунд по 10 слів. Обери правильний переклад із 4 варіантів.</p>
        <div class="row-between">
          <div class="row">
            <label class="muted" for="filter-select">Слова:</label>
            <select id="filter-select">
              <option value="not-learned" ${filter === 'not-learned' ? 'selected' : ''}>Ще не вивчені</option>
              <option value="all" ${filter === 'all' ? 'selected' : ''}>Усі</option>
              <option value="learned" ${filter === 'learned' ? 'selected' : ''}>Вивчені</option>
            </select>
          </div>
          <span class="muted">Доступно: ${pool.length}</span>
        </div>
        ${
          notEnough
            ? `<div class="msg msg-error" style="margin-top:14px;">Потрібно щонайменше 2 слова в цій вибірці, щоб почати гру.</div>`
            : `<div class="row" style="margin-top:16px;"><button class="btn btn-primary" id="start-btn">Почати раунд</button></div>`
        }
      </div>
    `;

    const select = container.querySelector<HTMLSelectElement>('#filter-select')!;
    select.addEventListener('change', () => {
      filter = select.value as Filter;
      renderStart();
    });

    const startBtn = container.querySelector<HTMLButtonElement>('#start-btn');
    startBtn?.addEventListener('click', () => {
      const round = buildRound(pool, 10);
      runRound(round);
    });
  }

  function runRound(round: Question[]): void {
    let index = 0;
    let correctCount = 0;
    const missed: { word: Question['word']; picked: string }[] = [];

    showQuestion();

    function showQuestion(): void {
      const q = round[index];
      const total = round.length;
      let learned = q.word.learned;

      container.innerHTML = `
        <div class="card">
          <div class="quiz-progress">Питання ${index + 1} з ${total} · Правильно: ${correctCount}</div>
          <div class="quiz-word">${displayGerman(q.word)}</div>
          <span class="badge badge-${q.word.partOfSpeech}">${q.word.partOfSpeech}</span>
          <div class="quiz-options" style="margin-top:20px;">
            ${q.options
              .map((opt, i) => `<button class="quiz-option" data-index="${i}">${opt}</button>`)
              .join('')}
          </div>
          <div id="feedback-holder" style="margin-top:16px;"></div>
        </div>
      `;

      const optionButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.quiz-option'));
      optionButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const chosenIndex = Number(btn.dataset.index);
          const isCorrect = chosenIndex === q.correctIndex;
          recordAnswerInList(listId, q.word.id, isCorrect);

          optionButtons.forEach((b, i) => {
            b.disabled = true;
            if (i === q.correctIndex) b.classList.add('correct');
            else if (i === chosenIndex) b.classList.add('incorrect');
          });

          if (isCorrect) {
            correctCount++;
          } else {
            missed.push({ word: q.word, picked: q.options[chosenIndex] });
          }

          const isLast = index === total - 1;
          const feedbackHolder = container.querySelector<HTMLDivElement>('#feedback-holder')!;
          feedbackHolder.innerHTML = `
            <div class="quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}">
              ${isCorrect ? '✓ Правильно!' : `✗ Неправильно. Правильна відповідь: ${q.word.translation}`}
            </div>
            <div class="row-between" style="margin-top:12px;">
              <button class="btn ${learned ? 'btn-learned-active' : ''}" id="learned-toggle">
                ${learned ? '✓ Вивчено' : 'Позначити як вивчене'}
              </button>
              <button class="btn btn-primary" id="next-btn">${isLast ? 'Підсумок' : 'Далі'}</button>
            </div>
          `;

          container.querySelector<HTMLButtonElement>('#learned-toggle')!.addEventListener('click', (e) => {
            learned = !learned;
            q.word.learned = learned;
            updateWordInList(listId, q.word.id, { learned });
            const btnEl = e.currentTarget as HTMLButtonElement;
            btnEl.textContent = learned ? '✓ Вивчено' : 'Позначити як вивчене';
            btnEl.classList.toggle('btn-learned-active', learned);
          });

          container.querySelector<HTMLButtonElement>('#next-btn')!.addEventListener('click', () => {
            if (isLast) {
              showSummary();
            } else {
              index++;
              showQuestion();
            }
          });
        });
      });
    }

    function showSummary(): void {
      const total = round.length;
      const latestWords = getList(listId)?.words ?? [];
      container.innerHTML = `
        <div class="card">
          <h2>Підсумок раунду</h2>
          <p style="font-size:18px;">${correctCount} / ${total} правильно</p>
          ${
            missed.length > 0
              ? `<div style="margin-top:14px;">
                  <div class="muted" style="margin-bottom:6px;">Слова, де були помилки:</div>
                  ${missed
                    .map((m) => {
                      const fresh = latestWords.find((w) => w.id === m.word.id) ?? m.word;
                      const acc = accuracy(fresh);
                      const accText =
                        acc === null ? '' : ` · загальна точність: ${acc}% (${fresh.correct}/${fresh.correct + fresh.incorrect})`;
                      return `
                    <div class="quiz-summary-row">
                      <span>${displayGerman(m.word)} — <strong>${m.word.translation}</strong></span>
                      <span class="muted">твоя відповідь: ${m.picked}${accText}</span>
                    </div>`;
                    })
                    .join('')}
                </div>`
              : `<p class="muted">Жодної помилки, чудово!</p>`
          }
          <div class="row" style="margin-top:20px;">
            <button class="btn btn-primary" id="again-btn">Ще раз</button>
          </div>
        </div>
      `;
      container.querySelector<HTMLButtonElement>('#again-btn')!.addEventListener('click', renderStart);
    }
  }
}
