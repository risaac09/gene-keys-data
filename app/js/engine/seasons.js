// Saturation arithmetic, ported from examples/slow_seasons.py. Decides which
// windows are worth watching so the practice does not drown in its own alerts.

import { partnerOf } from "./wheel.js";

// Mean circuit lengths in days, the caller-supplied astronomy facts from the
// Python demo's docstring.
export const CIRCUIT_DAYS = {
  Moon: 27.32, Sun: 365.25, Mercury: 365.25, Venus: 365.25, Mars: 686.98,
  Jupiter: 4332.6, Saturn: 10759, Uranus: 30688, Neptune: 60182,
  Pluto: 90560, TrueNode: 6798,
};

export const SLOW_BODIES = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "TrueNode"];

export function meanDwell(circuitDays, wheel) {
  // Mean days a body spends in one gate: circuit time over 64.
  if (circuitDays <= 0) throw new Error("circuitDays must be positive");
  return (circuitDays * wheel.degreesPerGate) / 360.0;
}

export function coverage(gates, wheel, includePartners = false) {
  // The fraction of the wheel a gate set watches. The set union is what keeps
  // an already-paired set from double-counting its partner.
  const watched = new Set(gates);
  if (includePartners) {
    for (const g of gates) watched.add(partnerOf(g, wheel));
  }
  const unknown = [...watched].filter((g) => !wheel.indexOf.has(g));
  if (unknown.length) {
    throw new Error(`not gates on this wheel: ${unknown.sort((a, b) => a - b)}`);
  }
  return (watched.size * wheel.degreesPerGate) / 360.0;
}
