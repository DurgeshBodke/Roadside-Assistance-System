// Small DOM + UI helpers shared by all views.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function formatStatus(status: string): string {
  return status.replace(/-/g, ' ');
}

export function formatServiceType(s: string): string {
  const map: Record<string, string> = {
    towing: 'Towing',
    'flat-tire': 'Flat Tire',
    fuel: 'Fuel Delivery',
    battery: 'Jump Start / Battery',
    lockout: 'Lockout',
    other: 'Other',
  };
  return map[s] ?? s;
}

export function formatPrice(n: number): string {
  // Indian-style grouping (e.g. 1,200) + rupee symbol.
  const grouped = n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return `₹${grouped}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function statusClass(status: string): string {
  return `status-${status}`;
}

export function toast(message: string, kind: 'info' | 'error' = 'info'): void {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const t = el('div', `toast toast-${kind}`, message);
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast-show'));
  setTimeout(() => {
    t.classList.remove('toast-show');
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function Spinner(size = 28): HTMLDivElement {
  const wrap = el('div', 'spinner-wrap');
  const s = el('div', 'spinner');
  s.style.width = `${size}px`;
  s.style.height = `${size}px`;
  s.style.borderWidth = `${Math.max(3, Math.round(size / 9))}px`;
  wrap.appendChild(s);
  return wrap;
}
