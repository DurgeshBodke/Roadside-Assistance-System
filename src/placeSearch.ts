// Google-Maps-style place search backed by OpenStreetMap Nominatim.
// Free, no API key required. Returns autocomplete suggestions as the user
// types and resolves a selected place to lat/lng coordinates.

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const MIN_QUERY = 3;

export function isSearchSupported(): boolean {
  return typeof fetch === 'function';
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY) return [];

  const url = `${ENDPOINT}?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
  return data.map((d) => ({
    label: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }));
}

// Attaches autocomplete behaviour to a text input. Returns a handle to read
// the currently selected place (or null if nothing chosen yet).
export interface PlaceSearchHandle {
  getSelected: () => PlaceResult | null;
  setSelected: (p: PlaceResult | null) => void;
  destroy: () => void;
}

export function attachPlaceSearch(
  input: HTMLInputElement,
  listEl: HTMLElement,
  onSelect: (p: PlaceResult) => void,
): PlaceSearchHandle {
  let selected: PlaceResult | null = null;
  let debounce: number | undefined;
  let lastToken = 0;

  const runSearch = (query: string) => {
    if (query.trim().length < MIN_QUERY) {
      renderResults([]);
      return;
    }
    const token = ++lastToken;
    searchPlaces(query)
      .then((results) => {
        if (token !== lastToken) return; // stale response
        renderResults(results);
      })
      .catch(() => renderResults([]));
  };

  const renderResults = (results: PlaceResult[]) => {
    listEl.innerHTML = '';
    if (results.length === 0) {
      listEl.hidden = true;
      return;
    }
    listEl.hidden = false;
    for (const r of results) {
      const item = document.createElement('div');
      item.className = 'ac-item';
      item.textContent = r.label;
      item.addEventListener('mousedown', (ev) => {
        // mousedown fires before the input's blur, keeping focus stable.
        ev.preventDefault();
        choose(r);
      });
      listEl.appendChild(item);
    }
  };

  const choose = (p: PlaceResult) => {
    selected = p;
    input.value = p.label;
    listEl.hidden = true;
    listEl.innerHTML = '';
    onSelect(p);
  };

  input.addEventListener('input', () => {
    selected = null;
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => runSearch(input.value), 300);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      // If exactly one result, pick it.
      const items = listEl.querySelectorAll('.ac-item');
      if (items.length === 1) {
        e.preventDefault();
        (items[0] as HTMLElement).click();
      }
    }
    if (e.key === 'Escape') {
      listEl.hidden = true;
    }
  });
  input.addEventListener('blur', () => {
    // slight delay so a click on an item registers first
    setTimeout(() => {
      listEl.hidden = true;
    }, 150);
  });
  input.addEventListener('focus', () => {
    if (listEl.children.length > 0) listEl.hidden = false;
  });

  return {
    getSelected: () => selected,
    setSelected: (p) => {
      selected = p;
      if (p) input.value = p.label;
    },
    destroy: () => {
      window.clearTimeout(debounce);
      listEl.innerHTML = '';
    },
  };
}
