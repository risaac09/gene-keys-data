// Formatting and tempo copy. The app explains when and how long, not what;
// short sentences, concrete nouns, no em-dashes.

const MIN = 60000;
const HOUR = 3600000;
const DAY = 86400000;

export function gateLineLabel(gate, line) {
  return `gate ${gate} line ${line}`;
}

export function gateDotLine(gate, line) {
  return `${gate}.${line}`;
}

export function utcStamp(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

export function yyyymmddUTC(ms) {
  // Basic-format UTC date, the one spelling used by ICS DTSTART, Google
  // template links, and the UIDs derived from them. One copy, since a UID
  // that changes shape stops updating events in place.
  const d = new Date(ms);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
}

export function localStamp(ms) {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function dayStamp(ms) {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  });
}

export function duration(ms) {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MIN))} minutes`;
  if (ms < 2 * DAY) return `${Math.round(ms / HOUR)} hours`;
  if (ms < 400 * DAY) return `${Math.round(ms / DAY)} days`;
  return `${(ms / (365.25 * DAY)).toFixed(1)} years`;
}

export function timeLeft(ms) {
  if (ms <= 0) return "ending now";
  return `${duration(ms)} left`;
}

export function contactsPhrase(n) {
  if (n <= 1) return "one touch";
  if (n === 2) return "touches twice";
  if (n === 3) return "touches 3 times: direct, retrograde, direct";
  return `touches ${n} times across retrograde loops`;
}

export function percent(fraction) {
  return `${Math.round(fraction * 100)}%`;
}

export const GENEKEYS_URL = "https://genekeys.com";
