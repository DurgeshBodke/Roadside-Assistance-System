// Driver Dashboard: request roadside help and track active requests.

import {
  apiCreateRequest,
  apiMyRequests,
  type StoredUser,
} from "../apiClient";
import { attachPlaceSearch, isSearchSupported, type PlaceResult } from '../placeSearch';
import type { ServiceRequest, ServiceType } from '../shared/types';
import {
  clear,
  el,
  formatPrice,
  formatServiceType,
  formatStatus,
  formatTime,
  Spinner,
  statusClass,
  toast,
} from '../ui';

const SERVICE_OPTIONS: { value: ServiceType; label: string; price: number }[] = [
  { value: 'towing', label: 'Towing', price: 1200 },
  { value: 'flat-tire', label: 'Flat Tire', price: 300 },
  { value: 'fuel', label: 'Fuel Delivery', price: 400 },
  { value: 'battery', label: 'Jump Start / Battery', price: 500 },
  { value: 'lockout', label: 'Lockout', price: 350 },
  { value: 'other', label: 'Other', price: 450 },
];

export function renderDriverDashboard(
  root: HTMLElement,
  user: StoredUser,
  onLogout: () => void,
): void {
  clear(root);
  root.appendChild(buildShell(user, onLogout));

  const form = document.getElementById('request-form') as HTMLFormElement;
  const serviceSelect = form.querySelector('#service-type') as HTMLSelectElement;
  const priceOut = form.querySelector('#est-price') as HTMLElement;
  const locInput = form.querySelector('#location-input') as HTMLInputElement;
  const acList = form.querySelector('#location-ac') as HTMLElement;
  const latOut = form.querySelector('#loc-lat') as HTMLElement;
  const lngOut = form.querySelector('#loc-lng') as HTMLElement;
  const listHost = document.getElementById('requests-list')!;

  let chosenPlace: PlaceResult | null = null;

  const updatePrice = () => {
    const opt = SERVICE_OPTIONS.find((o) => o.value === serviceSelect.value);
    priceOut.textContent = opt ? `Est. ${formatPrice(opt.price)}` : '';
  };
  serviceSelect.addEventListener('change', updatePrice);
  updatePrice();

  const placeSearch = isSearchSupported()
    ? attachPlaceSearch(locInput, acList, (p) => {
        chosenPlace = p;
        latOut.textContent = p.lat.toFixed(4);
        lngOut.textContent = p.lng.toFixed(4);
      })
    : null;

  if (!placeSearch) {
    locInput.placeholder = 'Search unavailable — use GPS below';
    locInput.disabled = true;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const notes = (form.querySelector('#notes') as HTMLTextAreaElement).value.trim();
    const serviceType = serviceSelect.value as ServiceType;
    const btn = form.querySelector('button[type=submit]') as HTMLButtonElement;

    if (!chosenPlace) {
      toast('Please select a location from the search results.', 'error');
      return;
    }

    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = 'Requesting…';
    btn.appendChild(Spinner(16));

    const res = await apiCreateRequest({
      serviceType,
      breakdownLocation: { lat: chosenPlace.lat, lng: chosenPlace.lng },
      notes,
    });

    btn.disabled = false;
    btn.textContent = prev;

    if (!res.ok) {
      toast(res.error, 'error');
      return;
    }
    toast("Service request created successfully.");
    await refreshList(listHost);
     
  });

  document.getElementById('use-gps')!.addEventListener('click', async () => {
    const gpsBtn = document.getElementById('use-gps') as HTMLButtonElement;
    if (!('geolocation' in navigator)) {
      toast('Geolocation unavailable in this browser.', 'error');
      return;
    }
    gpsBtn.disabled = true;
    const prev = gpsBtn.textContent;
    gpsBtn.textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        latOut.textContent = latitude.toFixed(4);
        lngOut.textContent = longitude.toFixed(4);
        chosenPlace = { label: `Current GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, lat: latitude, lng: longitude };
        locInput.value = chosenPlace.label;
        gpsBtn.disabled = false;
        gpsBtn.textContent = prev;
        toast('GPS location captured.');
      },
      () => {
        gpsBtn.disabled = false;
        gpsBtn.textContent = prev;
        toast("Unable to fetch GPS location.", "error");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });

  document.getElementById('refresh-list')!.addEventListener('click', () => {
    void refreshList(listHost);
  });

  void refreshList(listHost);
}

function buildShell(user: StoredUser, onLogout: () => void): HTMLElement {
  const wrap = el('div', 'dash');
  wrap.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">RA</span>
        <div class="brand-text">
          <h1>Roadside Assist</h1>
          <p>Driver Dashboard</p>
        </div>
      </div>
      <div class="topbar-right">
        <span class="user-chip">${escapeHtml(user.name)} · Driver</span>
        <button id="logout" class="btn btn-ghost">Sign out</button>
      </div>
    </header>

    <main class="container driver-grid">
      <section class="card">
        <h2>Request help</h2>
        <p class="muted">Tell us what happened and where you are.</p>
        <form id="request-form" class="form" novalidate>
          <label class="field">
            <span>Service type</span>
            <select id="service-type" required>
              ${SERVICE_OPTIONS.map((o) => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
          </label>
          <div class="field-row">
            <span class="field-hint" id="est-price"></span>
          </div>
          <label class="field">
            <span>Your location</span>
            <div class="ac-wrap">
              <input id="location-input" type="text" autocomplete="off"
                placeholder="Search for a place, like Google Maps…" required />
              <div id="location-ac" class="ac-list" hidden></div>
            </div>
          </label>
          <div class="coords">
            <span>Lat: <b id="loc-lat">—</b></span>
            <span>Lng: <b id="loc-lng">—</b></span>
            <button type="button" id="use-gps" class="btn btn-ghost btn-sm">Use my GPS</button>
          </div>
          <label class="field">
            <span>Notes (optional)</span>
            <textarea id="notes" rows="2" placeholder="e.g. front-right tire flat, on the shoulder"></textarea>
          </label>
          <button type="submit" class="btn btn-primary btn-block btn-lg">Request Help</button>
        </form>
      </section>

      <section class="card">
        <div class="card-head">
          <h2>Your requests</h2>
          <button id="refresh-list" class="btn btn-ghost btn-sm">Refresh</button>
        </div>
        <div id="requests-list" class="list"></div>
      </section>
    </main>
  `;
  wrap.querySelector('#logout')!.addEventListener('click', onLogout);
  return wrap;
}

async function refreshList(host: HTMLElement): Promise<void> {
  clear(host);
  host.appendChild(Spinner(24));
  const res = await apiMyRequests();
  clear(host);
  if (!res.ok) {
    host.appendChild(el('p', 'muted', res.error));
    return;
  }
  const requests = res.data.requests as (ServiceRequest & {
    mechanicName?: string | null;
  })[];
  if (requests.length === 0) {
    host.appendChild(emptyState('"No service requests found."'));
    return;
  }
  for (const r of requests) host.appendChild(renderRequestCard(r));
}

function renderRequestCard(
  r: ServiceRequest & { mechanicName?: string | null },
): HTMLElement {
  const card = el('article', `request-card ${statusClass(r.status)}`);
  const top = el('div', 'request-card-top');
  top.appendChild(el('span', 'service-tag', formatServiceType(r.serviceType)));
  top.appendChild(el('span', `pill ${statusClass(r.status)}`, formatStatus(r.status)));
  card.appendChild(top);

  const meta = el('div', 'request-meta');
  meta.appendChild(el('span', undefined, formatPrice(r.estimatedPrice)));
  meta.appendChild(el('span', 'muted', formatTime(r.createdAt)));
  card.appendChild(meta);

  if (r.notes) {
    card.appendChild(el('p', 'request-notes', `“${r.notes}”`));
  }

  if (r.status === 'accepted' || r.status === 'in-progress') {
    const enroute = el('div', 'enroute');
    enroute.innerHTML = `
      <span class="enroute-dot"></span>
      <span>${escapeHtml(r.mechanicName ?? 'Assigned mechanic')} is en route.</span>
    `;
    card.appendChild(enroute);
  } else if (r.status === 'completed') {
    card.appendChild(el('p', 'muted', 'Service completed successfully.'));
  } else if (r.status === 'pending') {
    card.appendChild(el('p', 'muted', 'Waiting for a mechanic to accept your request...'));
  }
  return card;
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
