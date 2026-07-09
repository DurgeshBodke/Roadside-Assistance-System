// Auth view: login + register. Renders into #app.

import { apiLogin, apiRegister, clearSession, type StoredUser } from '../apiClient';
import { clear, el, Spinner, toast } from '../ui';

export type OnAuthed = (user: StoredUser) => void;

export function renderAuthView(root: HTMLElement, onAuthed: OnAuthed): void {
  clear(root);
  root.appendChild(buildShell());

  const card = document.getElementById('auth-card')!;
  showLogin(card, onAuthed);
}

function buildShell(): HTMLElement {
  const wrap = el('div', 'auth-wrap');
  wrap.innerHTML = `
    <header class="auth-header">
      <div class="brand">
        <span class="brand-mark">RA</span>
        <div class="brand-text">
          <h1>Roadside Assist</h1>
          <p>Verified mechanics, dispatched fast.</p>
        </div>
      </div>
    </header>
    <div id="auth-card" class="auth-card"></div>
    <p class="auth-foot">Demo accounts: driver@roadside.test · mechanic@roadside.test · admin@roadside.test — password <code>demo123</code></p>
  `;
  return wrap;
}

function showLogin(card: HTMLElement, onAuthed: OnAuthed): void {
  clear(card);
  card.innerHTML = `
    <h2>Welcome back</h2>
    <p class="muted">Sign in to your Roadside Assist account.</p>
    <form id="login-form" class="form" novalidate>
      <label class="field">
        <span>Email</span>
        <input name="email" type="email" required placeholder="you@example.com" />
      </label>
      <label class="field">
        <span>Password</span>
        <input name="password" type="password" required placeholder="••••••••" />
      </label>
      <div id="login-error" class="form-error"></div>
      <button type="submit" class="btn btn-primary btn-block">Sign in</button>
    </form>
    <div class="switch-mode">
      No account? <button type="button" id="go-register" class="link-btn">Create one</button>
    </div>
  `;

  card.querySelector('#login-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const errBox = card.querySelector('#login-error') as HTMLElement;
    errBox.textContent = '';

    const btn = form.querySelector('button[type=submit]') as HTMLButtonElement;
    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = '';
    btn.appendChild(Spinner(20));

    // Demo fallback: accept seeded accounts with any non-empty password.
    const res = await apiLogin({ email, password });
    btn.disabled = false;
    btn.textContent = prev;
    if (!res.ok) {
      errBox.textContent = res.error;
      return;
    }
    onAuthed(res.user);
  });

  card.querySelector('#go-register')!.addEventListener('click', () => {
    showRegister(card, onAuthed);
  });
}

function showRegister(card: HTMLElement, onAuthed: OnAuthed): void {
  clear(card);
  card.innerHTML = `
    <h2>Create account</h2>
    <p class="muted">Join as a driver or mechanic partner.</p>
    <form id="register-form" class="form" novalidate>
      <label class="field">
        <span>Name</span>
        <input name="name" type="text" required placeholder="Your name" />
      </label>
      <label class="field">
        <span>Email</span>
        <input name="email" type="email" required placeholder="you@example.com" />
      </label>
      <label class="field">
        <span>Password</span>
        <input name="password" type="password" required placeholder="min 6 characters" />
      </label>
      <label class="field">
        <span>I am a…</span>
        <select name="role" required>
          <option value="driver">Driver (request help)</option>
          <option value="mechanic">Mechanic (accept jobs)</option>
        </select>
      </label>
      <div id="register-error" class="form-error"></div>
      <button type="submit" class="btn btn-primary btn-block">Create account</button>
    </form>
    <div class="switch-mode">
      Already have an account? <button type="button" id="go-login" class="link-btn">Sign in</button>
    </div>
  `;

  card.querySelector('#register-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const role = String(data.get('role') || '') as 'driver' | 'mechanic';
    const errBox = card.querySelector('#register-error') as HTMLElement;
    errBox.textContent = '';

    const btn = form.querySelector('button[type=submit]') as HTMLButtonElement;
    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = '';
    btn.appendChild(Spinner(20));

    const res = await apiRegister({ name, email, password, role });
    btn.disabled = false;
    btn.textContent = prev;
    if (!res.ok) {
      errBox.textContent = res.error;
      return;
    }
    toast(`Welcome, ${res.user.name}!`);
    onAuthed(res.user);
  });

  card.querySelector('#go-login')!.addEventListener('click', () => {
    showLogin(card, onAuthed);
  });
}

export function logout(): void {
  clearSession();
}
