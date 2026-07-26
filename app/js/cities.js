// The vendored city list: load once, search by normalized prefix. Rows are
// [asciiName, countryCode, admin1Name, ianaTimezone, lat, lon], population
// descending, so result order is a ranking for free.

let CITIES = null;
let NAMES = null; // normalized row[0], same index, computed once at load
let LOADING = null;

function normalize(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export async function loadCities() {
  if (CITIES) return CITIES;
  if (!LOADING) {
    // Hold the promise, not the value: keystrokes arrive faster than the
    // fetch resolves, and each one used to start its own download.
    LOADING = fetch("vendor/cities/cities.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        NAMES = rows.map((row) => normalize(row[0]));
        CITIES = rows;
        return CITIES;
      })
      .catch((e) => {
        LOADING = null; // let a later keystroke retry
        throw e;
      });
  }
  return LOADING;
}

export function searchCities(query, limit = 8) {
  if (!CITIES) return [];
  const q = normalize(query.trim());
  if (!q) return [];
  const out = [];
  for (let i = 0; i < CITIES.length; i++) {
    if (NAMES[i].startsWith(q)) {
      out.push(CITIES[i]);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function cityLabel(row) {
  const [name, country, admin1, tz] = row;
  const where = admin1 && admin1 !== name ? `${admin1}, ${country}` : country;
  return `${name}, ${where} · ${tz}`;
}
