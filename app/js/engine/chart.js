// Natal chart and Golden Path sphere join.
//
// Personality = the birth instant, UTC. Design = the instant the Sun sat
// exactly 88.0 degrees of solar arc earlier, found by bisection on solar
// longitude. Sphere derivations come from data/sequences/*.json ("Personality
// Sun", "Design Moon", ...), joined here, never hardcoded.

import { gateOfLongitude, norm360 } from "./wheel.js";
import { bodyLongitude } from "./astro.js";

const DAY_MS = 86400000;
export const DESIGN_ARC_DEG = 88.0;

// The design moment sits inside [birth - 100 days, birth - 80 days], so a
// birth instant needs this much ephemeris behind it to be computable at all.
// The extra day is margin on the bracket.
export const DESIGN_LOOKBACK_MS = 101 * DAY_MS;

// The 13 placements per moment: 11 computed + 2 aliases = 26 in a chart.
const CHART_BODIES = [
  "Sun", "Earth", "Moon", "Mercury", "Venus", "Mars", "Jupiter",
  "Saturn", "Uranus", "Neptune", "Pluto", "TrueNode", "SouthNode",
];

export function designMoment(birthMs, sunAt = (ms) => bodyLongitude("Sun", ms)) {
  // Backward solar arc from birth; inside the bracket [birth-100d, birth-80d]
  // the arc sits in roughly (76, 102) degrees, far from the 0/360 wrap, and
  // decreases strictly as t rises (the Sun's apparent rate stays between
  // 0.953 and 1.019 degrees a day). Bisect g(t) = arc(t) - 88 to one second.
  const birthLon = sunAt(birthMs);
  const arc = (ms) => norm360(birthLon - sunAt(ms));
  let lo = birthMs - 100 * DAY_MS;
  let hi = birthMs - 80 * DAY_MS;
  if (!(arc(lo) - DESIGN_ARC_DEG > 0 && arc(hi) - DESIGN_ARC_DEG < 0)) {
    throw new Error("design-moment bracket failed to straddle 88 degrees");
  }
  while (hi - lo > 1000) {
    const mid = lo + (hi - lo) / 2;
    if (arc(mid) - DESIGN_ARC_DEG > 0) lo = mid;
    else hi = mid;
  }
  return hi;
}

function placements(ms, wheel) {
  return CHART_BODIES.map((body) => {
    const lon = bodyLongitude(body, ms);
    const { gate, line } = gateOfLongitude(lon, wheel);
    return { body, lon, gate, line };
  });
}

export function natalChart(birthMs, wheel) {
  const designMs = designMoment(birthMs);
  return {
    birthMs,
    designMs,
    personality: placements(birthMs, wheel),
    design: placements(designMs, wheel),
  };
}

export function parseDerivation(derivation) {
  // "Personality Sun" -> {moment: "personality", body: "Sun"};
  // "Design Moon" -> {moment: "design", body: "Moon"}.
  const m = derivation.match(/^(Personality|Design)\s+(.+)$/);
  if (!m) throw new Error(`unrecognized sphere derivation: ${derivation}`);
  return { moment: m[1].toLowerCase(), body: m[2].replace(/\s+/g, "") };
}

export function sphereJoin(chart, sequences) {
  // sequences: parsed data/sequences/{activation,venus,pearl}.json documents.
  const out = [];
  for (const seq of sequences) {
    for (const sphere of seq.spheres) {
      const { moment, body } = parseDerivation(sphere.derivation);
      const placement = chart[moment].find((p) => p.body === body);
      if (!placement) throw new Error(`no placement for ${sphere.derivation}`);
      out.push({
        sequenceId: seq.id,
        sequenceName: seq.name,
        position: sphere.position,
        sphereName: sphere.name,
        moment,
        body,
        gate: placement.gate,
        line: placement.line,
        lon: placement.lon,
      });
    }
  }
  return out;
}

export function sphereGates(spheres) {
  return [...new Set(spheres.map((s) => s.gate))];
}
