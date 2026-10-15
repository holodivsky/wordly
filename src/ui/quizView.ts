import { getList, recordAnswerInList, updateWordInList } from '../storage';
import { buildRound, type Direction, type Question } from '../quiz';
import { accuracy, displayGerman, type Word } from '../types';
import { t } from '../i18n';

type Filter = 'all' | 'not-learned' | 'learned';

const DIRECTION_KEY = 'gvt.quizDirection.v1';

// The chosen direction is a per-browser preference; storage can be unavailable (private mode), so it falls back.
function loadDirection(): Direction {
  try {
    return localStorage.getItem(DIRECTION_KEY) === 'uk-de' ? 'uk-de' : 'de-uk';
  } catch {
    return 'de-uk';
  }
}

function saveDirection(direction: Direction): void {
  try {
    localStorage.setItem(DIRECTION_KEY, direction);
  } catch {
    // Only the preference is lost.
  }
}

function filterWords(listId: string, filter: Filter): Word[] {
  const words = getList(listId)?.words ?? [];
  if (filter === 'not-learned') return words.filter((w) => !w.learned);
  if (filter === 'learned') return words.filter((w) => w.learned);
  return words;
}

export function renderQuizView(container: HTMLElement, listId: string): void {
  let filter: Filter = 'not-learned';
  let direction: Direction = loadDirection();
  renderStart();

  function renderStart(): void {
    const allWords = getList(listId)?.words ?? [];

    if (allWords.length === 0) {
      container.innerHTML = `
        <div class="card empty-state">
          <p>${t('quizEmpty')}</p>
          <a class="btn btn-primary" href="#translate">${t('addWords')}</a>
        </div>
      `;
      return;
    }

    const learnedCount = allWords.filter((w) => w.learned).length;
    const groups: { filter: Filter; label: string; count: number }[] = [
      { filter: 'not-learned', label: t('filterNotLearned'), count: allWords.length - learnedCount },
      { filter: 'all', label: t('filterAll'), count: allWords.length },
      { filter: 'learned', label: t('filterLearned'), count: learnedCount },
    ];
    const pool = filterWords(listId, filter);

    container.innerHTML = `
      <div class="card game-start">
        <div class="direction-toggle" role="group" aria-label="${t('directionLabel')}">
          <button type="button" data-direction="de-uk" class="${direction === 'de-uk' ? 'active' : ''}" aria-pressed="${direction === 'de-uk'}">DE → UA</button>
          <button type="button" data-direction="uk-de" class="${direction === 'uk-de' ? 'active' : ''}" aria-pressed="${direction === 'uk-de'}">UA → DE</button>
        </div>
        <h2>${t(direction === 'de-uk' ? 'quizTitle' : 'quizTitleReverse')}</h2>
        <p class="subtitle">${t('quizIntro')}</p>
        <div class="game-progress">
          <div class="row-between">
            <span class="muted">${t('colLearned')}</span>
            <strong>${learnedCount} / ${allWords.length}</strong>
          </div>
          <div class="accuracy-bar">
            <div class="accuracy-bar-fill" style="width:${Math.round((learnedCount / allWords.length) * 100)}%; background:var(--good);"></div>
          </div>
        </div>
        <div class="segmented" role="group" aria-label="${t('wordsLabel')}">
          ${groups
            .map(
              (g) => `
            <button type="button" data-filter="${g.filter}" class="${g.filter === filter ? 'active' : ''}" aria-pressed="${g.filter === filter}">
              <strong>${g.count}</strong>
              <span>${g.label}</span>
            </button>`
            )
            .join('')}
        </div>
        ${
          pool.length < 2
            ? `<div class="msg msg-error" style="margin:0;">${t('needTwo')}</div>`
            : `<button class="btn btn-primary btn-big" id="start-btn">${t('startRound')}</button>`
        }
      </div>
    `;

    container.querySelectorAll<HTMLButtonElement>('.direction-toggle button').forEach((btn) => {
      btn.addEventListener('click', () => {
        direction = btn.dataset.direction as Direction;
        saveDirection(direction);
        renderStart();
      });
    });

    container.querySelectorAll<HTMLButtonElement>('.segmented button').forEach((btn) => {
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter as Filter;
        renderStart();
      });
    });

    container.querySelector<HTMLButtonElement>('#start-btn')?.addEventListener('click', () => {
      runRound(buildRound(pool, 10, direction));
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
          <div class="quiz-progress">${t('progress', { n: index + 1, total, correct: correctCount })}</div>
          <div class="accuracy-bar">
            <div class="accuracy-bar-fill" style="width:${Math.round((index / total) * 100)}%; background:var(--accent);"></div>
          </div>
          <div class="quiz-word">${q.prompt}</div>
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
              ${isCorrect ? t('answerCorrect') : t('answerWrong', { answer: q.answer })}
            </div>
            <div class="row-between" style="margin-top:12px;">
              <button class="btn ${learned ? 'btn-learned-active' : ''}" id="learned-toggle">
                ${learned ? t('learnedOn') : t('markLearned')}
              </button>
              <button class="btn btn-primary" id="next-btn">${isLast ? t('summaryBtn') : t('next')}</button>
            </div>
          `;

          container.querySelector<HTMLButtonElement>('#learned-toggle')!.addEventListener('click', (e) => {
            learned = !learned;
            q.word.learned = learned;
            updateWordInList(listId, q.word.id, { learned });
            const btnEl = e.currentTarget as HTMLButtonElement;
            btnEl.textContent = learned ? t('learnedOn') : t('markLearned');
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
          <h2>${t('summaryTitle')}</h2>
          <p class="game-score">${t('summaryScore', { correct: correctCount, total })}</p>
          ${
            missed.length > 0
              ? `<div style="margin-top:14px;">
                  <div class="muted" style="margin-bottom:6px;">${t('missedTitle')}</div>
                  ${missed
                    .map((m) => {
                      const fresh = latestWords.find((w) => w.id === m.word.id) ?? m.word;
                      const acc = accuracy(fresh);
                      const accText =
                        acc === null
                          ? ''
                          : t('overallAcc', { acc, ratio: `${fresh.correct}/${fresh.correct + fresh.incorrect}` });
                      return `
                    <div class="quiz-summary-row">
                      <span>${displayGerman(m.word)} — <strong>${m.word.translation}</strong></span>
                      <span class="muted">${t('yourAnswer', { answer: m.picked })}${accText}</span>
                    </div>`;
                    })
                    .join('')}
                </div>`
              : `<p class="muted">${t('noMistakes')}</p>`
          }
          <div class="row" style="margin-top:20px;">
            <button class="btn btn-primary btn-big" id="again-btn">${t('again')}</button>
          </div>
        </div>
      `;
      container.querySelector<HTMLButtonElement>('#again-btn')!.addEventListener('click', renderStart);
    }
  }
}
