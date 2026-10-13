import { signIn } from '../account';
import { LOGO } from '../logo';
import { getLang, setLang, t } from '../i18n';

function describeSignInError(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return t('loginInvalid');
    case 'auth/too-many-requests':
      return t('loginTooMany');
    case 'auth/network-request-failed':
      return t('loginNoNetwork');
    default:
      return t('loginFailed', { error: code || String(err) });
  }
}

export function renderLoginView(container: HTMLElement, notice: string | null): void {
  container.innerHTML = `
    <div class="row-between" style="margin-bottom:8px;">
      <h1>${LOGO}Wordly</h1>
      <button class="btn-link" id="lang-btn" type="button" title="${t('switchLangTitle')}">${t('switchLang')}</button>
    </div>
    <p class="subtitle">${t('loginSubtitle')}</p>
    <div class="card" style="max-width:360px;">
      <form id="login-form" style="display:flex; flex-direction:column; gap:10px;">
        <input type="email" id="login-input" placeholder="${t('email')}" autocomplete="username" autocapitalize="none" required />
        <input type="password" id="password-input" placeholder="${t('password')}" autocomplete="current-password" required />
        <button class="btn btn-primary" id="login-btn" type="submit">${t('signIn')}</button>
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

  container.querySelector<HTMLButtonElement>('#lang-btn')!.addEventListener('click', () => {
    setLang(getLang() === 'uk' ? 'en' : 'uk');
    renderLoginView(container, null);
  });

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
