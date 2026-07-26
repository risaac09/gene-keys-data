// Transit windows, ported from examples/gate_windows.py. No astronomy here:
// the caller supplies longitudeOf(ms) -> degrees. Times are epoch ms UTC.

import { gateOfLongitude } from "./wheel.js";

const HOUR = 3600000;
const DAY = 86400000;

// Sampling steps sized under each body's fastest gate-crossing time. The Moon
// crosses a 5.625-degree gate in about 8.8 hours at its fastest, so it needs
// the 2-hour step; everything else has margin to spare.
export const SAMPLING_STEP_MS = {
  Sun: 12 * HOUR, Moon: 2 * HOUR, Mercury: 12 * HOUR, Venus: 12 * HOUR,
  Mars: 24 * HOUR, Jupiter: 5 * DAY, Saturn: 10 * DAY, Uranus: 20 * DAY,
  Neptune: 30 * DAY, Pluto: 30 * DAY, TrueNode: 4 * DAY,
};

// Retrograde re-entries closer together than these gaps fold into one passage.
export const GROUP_GAP_MS = {
  Mercury: 120 * DAY, Venus: 200 * DAY, Mars: 300 * DAY, Jupiter: 500 * DAY,
  Saturn: 500 * DAY, Uranus: 700 * DAY, Neptune: 900 * DAY, Pluto: 900 * DAY,
  TrueNode: 200 * DAY,
};

export function maxStep(maxDegreesPerDay, wheel) {
  // The longest sampling step that cannot skip a whole gate.
  // Written as !(x > 0) so undefined and NaN throw here rather than sailing
  // through into an endless loop downstream.
  if (!(maxDegreesPerDay > 0)) throw new Error("maxDegreesPerDay must be positive");
  return (wheel.degreesPerGate / maxDegreesPerDay) * DAY;
}

function boundary(longitudeOf, wheel, lo, hi, tol) {
  // Bisect to the instant the gate changes between lo and hi. Assumes one
  // change in the bracket, which a step under maxStep() buys. Returns hi:
  // the first instant known to sit in the new gate.
  const gateLo = gateOfLongitude(longitudeOf(lo), wheel).gate;
  while (hi - lo > tol) {
    const mid = lo + (hi - lo) / 2;
    if (gateOfLongitude(longitudeOf(mid), wheel).gate === gateLo) lo = mid;
    else hi = mid;
  }
  return hi;
}

export function gateWindows(longitudeOf, gates, startMs, endMs, stepMs, wheel, opts = {}) {
  // Intervals in [startMs, endMs] where the body sits in one of `gates`.
  // Returns [{gate, start, end, contacts, clamped_start, clamped_end}] sorted
  // by start. clamped_* mean the window ran past that edge of the range.
  const { passageGapMs = null, tolMs = 30000 } = opts;
  const targets = new Set(gates);
  if (startMs > endMs) throw new Error("start must not be after end");
  if (!(stepMs > 0)) throw new Error("step must be positive");

  const out = [];
  let t = startMs;
  let prev = null;
  let runGate = null;
  let runStart = null;
  for (;;) {
    const gate = gateOfLongitude(longitudeOf(t), wheel).gate;
    const active = targets.has(gate) ? gate : null;
    if (active !== runGate) {
      if (runGate !== null) {
        out.push({
          gate: runGate, start: runStart,
          end: boundary(longitudeOf, wheel, prev, t, tolMs),
          contacts: 1, clamped_start: runStart === startMs, clamped_end: false,
        });
      }
      if (active !== null) {
        runStart = prev === null ? startMs : boundary(longitudeOf, wheel, prev, t, tolMs);
      }
      runGate = active;
    }
    prev = t;
    if (t >= endMs) break;
    t = Math.min(t + stepMs, endMs);
  }
  if (runGate !== null) {
    out.push({
      gate: runGate, start: runStart, end: endMs, contacts: 1,
      clamped_start: runStart === startMs, clamped_end: true,
    });
  }

  out.sort((a, b) => a.start - b.start);
  return passageGapMs ? groupPassages(out, passageGapMs) : out;
}

export function nextGateChange(longitudeOf, wheel, fromMs, stepMs, opts = {}) {
  // The instant the body leaves its current gate: walk forward until the gate
  // differs, then bisect the bracket. Null if no change within maxSteps.
  const { tolMs = 30000, maxSteps = 5000 } = opts;
  const g0 = gateOfLongitude(longitudeOf(fromMs), wheel).gate;
  let prev = fromMs;
  for (let i = 0; i < maxSteps; i++) {
    const t = prev + stepMs;
    if (gateOfLongitude(longitudeOf(t), wheel).gate !== g0) {
      return boundary(longitudeOf, wheel, prev, t, tolMs);
    }
    prev = t;
  }
  return null;
}

export function groupPassages(windows, gapMs) {
  // Fold re-entries on the same gate within gapMs into one passage.
  const out = [];
  for (const w of windows) {
    let prev = null;
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].gate === w.gate) { prev = out[i]; break; }
    }
    if (prev !== null && w.start - prev.end <= gapMs) {
      prev.end = w.end;
      prev.clamped_end = w.clamped_end;
      prev.contacts += 1;
    } else {
      out.push({ ...w });
    }
  }
  return out;
}
