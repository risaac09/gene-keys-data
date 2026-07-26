// Wall-clock to UTC conversion through the browser's own IANA history via
// Intl, never hand-rolled offset math. Handles DST gaps, ambiguous fall-back
// times, and pre-1970 rules (Intl ships the full tz database, LMT included).

const FORMATTERS = new Map();

function formatter(zone) {
  let f = FORMATTERS.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
    });
    FORMATTERS.set(zone, f);
  }
  return f;
}

function wallAt(ms, zone) {
  // The zone's wall clock at instant ms, re-encoded as if it were UTC.
  const parts = {};
  for (const p of formatter(zone).formatToParts(new Date(ms))) {
    if (p.type !== "literal") parts[p.type] = parseInt(p.value, 10);
  }
  return Date.UTC(
    parts.year, parts.month - 1, parts.day,
    parts.hour === 24 ? 0 : parts.hour, parts.minute, parts.second,
  );
}

// How far either side of an instant to look for a transition. A fold is at
// most this wide in the tz database (Antarctica/Troll drops two hours), and
// the probe below verifies its guess against the wall clock, so a window that
// catches an unrelated transition fails safe rather than inventing ambiguity.
const PROBE_MS = 4 * 3600000;

function ambiguousPartner(t, desired, zone) {
  // If the clock fell back near t, the fold's size is exactly the drop in
  // offset across it, and the duplicate instant sits exactly that far away.
  // Deriving the size beats probing fixed deltas: it catches two-hour folds,
  // the 90-minute 1940s ones, and fractional LMT-era shifts alike.
  const before = zoneOffsetMinutes(t - PROBE_MS, zone);
  const after = zoneOffsetMinutes(t + PROBE_MS, zone);
  const dropMs = (before - after) * 60000;
  if (!(dropMs > 0)) return null; // no fall-back here; a gap is handled above
  for (const candidate of [t + dropMs, t - dropMs]) {
    if (candidate !== t && wallAt(candidate, zone) === desired) return candidate;
  }
  return null;
}

export function zonedToUtc(year, month, day, hour, minute, zone) {
  // Fixed-point iteration: guess the wall time as if UTC, measure the error,
  // subtract. Two rounds converge for every representable time; a residual
  // error after that identifies a spring-forward gap.
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let t = desired;
  for (let i = 0; i < 2; i++) {
    const err = wallAt(t, zone) - desired;
    if (err === 0) break;
    t -= err;
  }
  const wall = wallAt(t, zone);
  if (wall !== desired) {
    // Nonexistent local time: clocks jumped over it. The iteration oscillates
    // between an instant before the gap and one after; pick the one after,
    // the wall clock later than the time asked for.
    const other = t - (wall - desired);
    const pick = wall > desired ? t : other;
    return { utcMs: pick, status: "nonexistent", resolvedWallMs: wallAt(pick, zone) };
  }
  // Exact hit. The iteration lands on whichever instant it lands on, so look
  // for a fall-back duplicate and prefer the earlier one (the pre-transition
  // offset), which is what "the first time the clock read this" means.
  const twin = ambiguousPartner(t, desired, zone);
  if (twin !== null) return { utcMs: Math.min(t, twin), status: "ambiguous-earlier" };
  return { utcMs: t, status: "ok" };
}

export function offsetToUtc(year, month, day, hour, minute, offsetMinutes) {
  return {
    utcMs: Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60000,
    status: "ok",
  };
}

export function zoneOffsetMinutes(ms, zone) {
  return (wallAt(ms, zone) - ms) / 60000;
}

export function ianaZones() {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }
  return [];
}
