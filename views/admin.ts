// Admin Dashboard: overview of all users and service requests.

import { apiAdminOverview, type StoredUser } from '../apiClient';
import type { PublicUser, ServiceRequest } from '../shared/types';
import {
  clear,
  el,
  formatPrice,
  formatServiceType,
  formatStatus,
  formatTime,
  Spinner,
  statusClass,
} from '../ui';

export function renderAdminDashboard(
  root: HTMLElement,
  user: StoredUser,
  onLogout: () => void,
): void {
  clear(root);
  root.appendChild(buildShell(user, onLogout));

  document.getElementById('refresh-admin')!.addEventListener('click', () => {
    void refresh(document.getElementById('admin-content')!);
  });

  void refresh(document.getElementById('admin-content')!);
}

function buildShell(user: StoredUser, onLogout: () => void): HTMLElement {
  const wrap = el('div', 'dash');
  wrap.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">RA</span>
        <div class="brand-text">
          <h1>Roadside Assist</h1>
          <p>Admin Dashboard</p>
        </div>
      </div>
      <div class="topbar-right">
        <span class="user-chip">${escapeHtml(user.name)} · Admin</span>
        <button id="logout" class="btn btn-ghost">Sign out</button>
      </div>
    </header>

    <main class="container">
      <section class="card">
        <div class="card-head">
          <h2>Overview</h2>
          <button id="refresh-admin" class="btn btn-ghost btn-sm">Refresh</button>
        </div>
        <div id="admin-content"></div>
      </section>
    </main>
  `;
  wrap.querySelector('#logout')!.addEventListener('click', onLogout);
  return wrap;
}

async function refresh(host: HTMLElement): Promise<void> {
  clear(host);
  host.appendChild(Spinner(24));
  const res = await apiAdminOverview();
  clear(host);
  if (!res.ok) {
    host.appendChild(el('p', 'muted', res.error));
    return;
  }
  const { users, requests, counts } = res.data;

  host.appendChild(statsRow(counts, users.length, requests.length));
  host.appendChild(usersTable(users as PublicUser[]));
  host.appendChild(requestsTable(requests as (ServiceRequest & { userName?: string; mechanicName?: string | null })[]));
}

function statsRow(
  counts: Record<string, number>,
  userCount: number,
  reqCount: number,
): HTMLElement {
  const row = el('div', 'stats-row');
  const stats: { label: string; value: number; cls: string }[] = [
    { label: 'Users', value: userCount, cls: 'stat-neutral' },
    { label: 'Total requests', value: reqCount, cls: 'stat-neutral' },
    { label: 'Pending', value: counts.pending ?? 0, cls: 'stat-pending' },
    { label: 'Accepted', value: counts.accepted ?? 0, cls: 'stat-accepted' },
    { label: 'In progress', value: counts['in-progress'] ?? 0, cls: 'stat-progress' },
    { label: 'Completed', value: counts.completed ?? 0, cls: 'stat-completed' },
  ];
  for (const s of stats) {
    const card = el('div', `stat ${s.cls}`);
    card.appendChild(el('span', 'stat-value', String(s.value)));
    card.appendChild(el('span', 'stat-label', s.label));
    row.appendChild(card);
  }
  return row;
}

function usersTable(users: PublicUser[]): HTMLElement {
  const wrap = el('div', 'table-wrap');
  wrap.appendChild(el('h3', 'section-title', `Users (${users.length})`));
  const table = el('table', 'data-table');
  table.innerHTML = `
    <thead>
      <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr>
    </thead>
  `;
  const tbody = el('tbody');
  for (const u of users) {
    const tr = el('tr');
    tr.innerHTML = `
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td><span class="pill role-${u.role}">${u.role}</span></td>
      <td><span class="pill ${u.status === 'active' ? 'status-completed' : 'status-cancelled'}">${u.status}</span></td>
      <td>${formatTime(u.createdAt)}</td>
    `;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function requestsTable(
  requests: (ServiceRequest & { userName?: string; mechanicName?: string | null })[],
): HTMLElement {
  const wrap = el('div', 'table-wrap');
  wrap.appendChild(el('h3', 'section-title', `Service requests (${requests.length})`));
  const table = el('table', 'data-table');
  table.innerHTML = `
    <thead>
      <tr><th>Service</th><th>Driver</th><th>Mechanic</th><th>Status</th><th>Price</th><th>Created</th></tr>
    </thead>
  `;
  const tbody = el('tbody');
  for (const r of requests) {
    const tr = el('tr');
    tr.innerHTML = `
      <td>${escapeHtml(formatServiceType(r.serviceType))}</td>
      <td>${escapeHtml(r.userName ?? '—')}</td>
      <td>${escapeHtml(r.mechanicName ?? '—')}</td>
      <td><span class="pill ${statusClass(r.status)}">${formatStatus(r.status)}</span></td>
      <td>${formatPrice(r.estimatedPrice)}</td>
      <td>${formatTime(r.createdAt)}</td>
    `;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  );
}
