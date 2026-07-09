import './style.css';
import { clearSession, getStoredUser } from './apiClient';
import { logout as authLogout } from './views/auth';
import { renderAuthView } from './views/auth';
import { renderDriverDashboard } from './views/driver';
import { renderMechanicDashboard } from './views/mechanic';
import { renderAdminDashboard } from './views/admin';
import type { StoredUser } from './apiClient';

const app = document.querySelector<HTMLDivElement>('#app')!;

function route(user: StoredUser): void {
  switch (user.role) {
    case 'driver':
      renderDriverDashboard(app, user, doLogout);
      break;
    case 'mechanic':
      renderMechanicDashboard(app, user, doLogout);
      break;
    case 'admin':
      renderAdminDashboard(app, user, doLogout);
      break;
    default:
      doLogout();
  }
}

function doLogout(): void {
  authLogout();
  clearSession();
  renderAuthView(app, route);
}

// Toast host (created once, appended to body).
const toastHost = document.createElement('div');
toastHost.id = 'toast-host';
toastHost.className = 'toast-host';
document.body.appendChild(toastHost);

const existing = getStoredUser();
if (existing) {
  route(existing);
} else {
  renderAuthView(app, route);
}
