// All state lives in localStorage under one key. Nothing leaves the device.

export const KEY = "gene-keys-app";
export const VERSION = 1;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state || typeof state !== "object" || state.version !== VERSION) return null;
    if (state.birth && typeof state.birth.utcMs !== "number") return null;
    return state;
  } catch {
    return null;
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, version: VERSION }));
  } catch (e) {
    // Private browsing and a full quota both land here. The caller has usually
    // already mutated in-memory state, so it needs to hear about this.
    throw new Error(
      `Could not save to this browser's storage: ${e.message}. Private browsing or a full storage quota can cause this.`,
    );
  }
}

export function clear() {
  localStorage.removeItem(KEY);
}

export function emptyState() {
  return { version: VERSION, birth: null, prefs: { view: "rhythm" } };
}

export function exportJSON(state) {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const state = JSON.parse(text);
  if (!state || typeof state !== "object") throw new Error("not an export file");
  if (state.version !== VERSION) throw new Error(`unsupported version: ${state.version}`);
  if (state.birth !== null && typeof state.birth?.utcMs !== "number") {
    throw new Error("missing birth.utcMs");
  }
  return state;
}
