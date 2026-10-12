import { signIn } from '../account';

function describeSignInError(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Невірний логін або пароль.';
    case 'auth/too-many-requests':
      return 'Забагато невдалих спроб. Зачекай кілька хвилин і спробуй ще раз.';
    case 'auth/network-request-failed':
      return 'Немає з’єднання. Перевір інтернет.';
    default:
      return `Не вдалося увійти: ${code || String(err)}`;
  }
}

export function renderLoginView(container: HTMLElement, notice: string | null): void {
  container.innerHTML = `
    <h1>Wordly</h1>
    <p class="subtitle">Тренажер німецької лексики. Увійди, щоб побачити свої слова.</p>
    <div class="card" style="max-width:360px;">
      <form id="login-form" style="display:flex; flex-direction:column; gap:10px;">
        <input type="text" id="login-input" placeholder="Логін" autocomplete="username" autocapitalize="none" required />
        <input type="password" id="password-input" placeholder="Пароль" autocomplete="current-password" required />
        <button class="btn btn-primary" id="login-btn" type="submit">Увійти</button>
      </form>
      <div id="login-status" style="margin-top:12px;"></div>
    </div>
  `;

  const form = container.querySelector<HTMLFormElement>('#login-form')!;
  const loginInput = container.querySelector<HTMLInputElement>('#login-input')!;
  const passwordInput = container.querySelector<HTMLInputElement>('#password-input')!;
  const button = container.querySelector<HTMLButtonElement>('#login-btn')!;
  const statusEl = container.querySelector<HTMLDivElement>('#login-status')!;

  function showError(text: string): void {
    statusEl.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'msg msg-error';
    el.textContent = text;
    statusEl.appendChild(el);
  }

  if (notice) showError(notice);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    button.disabled = true;
    statusEl.innerHTML = '';
    try {
      // On success the auth listener in main.ts replaces this view.
      await signIn(loginInput.value, passwordInput.value);
    } catch (err) {
      showError(describeSignInError(err));
      button.disabled = false;
    }
  });
}
