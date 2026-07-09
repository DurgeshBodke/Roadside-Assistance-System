// Mechanic Dashboard: see nearby pending requests, accept and update jobs.

import { apiMyRequests, apiNearbyRequests, apiUpdateStatus, type StoredUser } from '../apiClient';
import type { RequestStatus, ServiceRequest } from '../shared/types';
import {
  clear,
  distanceKm,
  el,
  formatPrice,
  formatServiceType,
  formatStatus,
  formatTime,
  Spinner,
  statusClass,
  toast,
} from '../ui';

const MECHANIC_HOME = { lat: 40.7494, lng: -73.9847 };
const ACTIVE_FLOW: RequestStatus[] = ['accepted', 'in-progress', 'completed', 'cancelled'];

export function renderMechanicDashboard(
  root: HTMLElement,
  user: StoredUser,
  onLogout: () => void,
): void {
  clear(root);
  root.appendChild(buildShell(user, onLogout));

  const nearbyHost = document.getElementById('nearby-list')!;
  const jobsHost = document.getElementById('jobs-list')!;

  document.getElementById('refresh-nearby')!.addEventListener('click', () => {
    void refreshNearby(nearbyHost);
  });
  document.getElementById('refresh-jobs')!.addEventListener('click', () => {
    void refreshJobs(jobsHost);
  });

  void refreshNearby(nearbyHost);
  void refreshJobs(jobsHost);
}

function buildShell(user: StoredUser, onLogout: () => void): HTMLElement {
  const wrap = el('div', 'dash');
  wrap.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">RA</span>
        <div class="brand-text">
          <h1>Roadside Assist</h1>
          <p>Mechanic Dashboard</p>
        </div>
      </div>
      <div class="topbar-right">
        <span class="user-chip">${escapeHtml(user.name)} · Mechanic</span>
        <button id="logout" class="btn btn-ghost">Sign out</button>
      </div>
    </header>

    <main class="container mechanic-grid">
      <section class="card">
        <div class="card-head">
          <h2>Nearby requests</h2>
          <button id="refresh-nearby" class="btn btn-ghost btn-sm">Refresh</button>
        </div>
        <p class="muted">Pending breakdowns within 25 km of your location.</p>
        <div id="nearby-list" class="list"></div>
      </section>

      <section class="card">
        <div class="card-head">
          <h2>Your jobs</h2>
          <button id="refresh-jobs" class="btn btn-ghost btn-sm">Refresh</button>
        </div>
        <div id="jobs-list" class="list"></div>
      </section>
    </main>
  `;
  wrap.querySelector('#logout')!.addEventListener('click', onLogout);
  return wrap;
}

type NearbyReq = ServiceRequest & { userName?: string };

async function refreshNearby(host: HTMLElement): Promise<void> {
  clear(host);
  host.appendChild(Spinner(24));
  const res = await apiNearbyRequests(MECHANIC_HOME, 25);
  clear(host);
  if (!res.ok) {
    host.appendChild(el('p', 'muted', res.error));
    return;
  }
  const requests = res.data.requests as NearbyReq[];
  if (requests.length === 0) {
    host.appendChild(emptyState('No nearby requests right now.'));
    return;
  }
  for (const r of requests) host.appendChild(renderNearbyCard(r, () => void onAccept(host, r, r._id)));
}

async function onAccept(host: HTMLElement, _r: NearbyReq, id: string): Promise<void> {
  const res = await apiUpdateStatus(id, 'accepted');
  if (!res.ok) {
    toast(res.error, 'error');
    return;
  }
  toast('Job accepted. Check “Your jobs”.');
  await refreshNearby(host);
  const jobsHost = document.getElementById('jobs-list')!;
  void refreshJobs(jobsHost);
}

function renderNearbyCard(r: NearbyReq, onAcceptCb: () => void): HTMLElement {
  const card = el('article', 'request-card status-pending');
  const top = el('div', 'request-card-top');
  top.appendChild(el('span', 'service-tag', formatServiceType(r.serviceType)));
  const dist = distanceKm(MECHANIC_HOME, r.breakdownLocation);
  top.appendChild(el('span', 'pill status-pending', `${dist.toFixed(1)} km`));
  card.appendChild(top);

  const meta = el('div', 'request-meta');
  meta.appendChild(el('span', undefined, formatPrice(r.estimatedPrice)));
  meta.appendChild(el('span', 'muted', formatTime(r.createdAt)));
  card.appendChild(meta);

  card.appendChild(el('p', 'request-driver', `Driver: ${escapeHtml(r.userName ?? 'Unknown')}`));
  if (r.notes) card.appendChild(el('p', 'request-notes', `“${r.notes}”`));

  const btn = el('button', 'btn btn-primary btn-block', 'Accept job');
  btn.addEventListener('click', onAcceptCb);
  card.appendChild(btn);
  return card;
}

async function refreshJobs(host: HTMLElement): Promise<void> {
  clear(host);
  host.appendChild(Spinner(24));
  const res = await apiMyRequests();
  clear(host);
  if (!res.ok) {
    host.appendChild(el('p', 'muted', res.error));
    return;
  }
  const requests = res.data.requests as ServiceRequest[];
  if (requests.length === 0) {
    host.appendChild(emptyState('No active jobs yet. Accept one from the left.'));
    return;
  }
  for (const r of requests) host.appendChild(renderJobCard(r, () => void refreshJobs(host)));
}

function renderJobCard(r: ServiceRequest, onChanged: () => void): HTMLElement {
  const card = el('article', `request-card ${statusClass(r.status)}`);
  const top = el('div', 'request-card-top');
  top.appendChild(el('span', 'service-tag', formatServiceType(r.serviceType)));
  top.appendChild(el('span', `pill ${statusClass(r.status)}`, formatStatus(r.status)));
  card.appendChild(top);

  const meta = el('div', 'request-meta');
  meta.appendChild(el('span', undefined, formatPrice(r.estimatedPrice)));
  meta.appendChild(el('span', 'muted', formatTime(r.createdAt)));
  card.appendChild(meta);

  if (r.notes) card.appendChild(el('p', 'request-notes', `“${r.notes}”`));

  const controls = el('div', 'job-controls');
  for (const status of ACTIVE_FLOW) {
    if (status === r.status) continue;
    const btn = el('button', `btn btn-sm ${statusBtnClass(status)}`, statusLabel(status, r.status));
    btn.addEventListener('click', async () => {
      const res = await apiUpdateStatus(r._id, status);
      if (!res.ok) {
        toast(res.error, 'error');
        return;
      }
      toast(`Marked ${formatStatus(status)}.`);
      onChanged();
    });
    controls.appendChild(btn);
  }
  card.appendChild(controls);
  return card;
}

function statusBtnClass(status: RequestStatus): string {
  if (status === 'completed') return 'btn-success';
  if (status === 'cancelled') return 'btn-danger';
  return 'btn-secondary';
}

function statusLabel(next: RequestStatus, current: RequestStatus): string {
  if (current === 'accepted' && next === 'in-progress') return 'Start job';
  if (next === 'completed') return 'Complete';
  if (next === 'cancelled') return 'Cancel';
  return formatStatus(next);
}

function emptyState(text: string): HTMLElement {
  const node = el('div', 'empty');
  node.appendChild(el('p', 'muted', text));
  return node;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  );
}
