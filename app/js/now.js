// What each body lights at this instant.
//
// The split here is the whole point of the module. The exit search walks the
// ephemeris and is the expensive call, so it is cached until the body actually
// crosses. Gate and line are one longitude lookup each and are recomputed on
// every tick, because a line changes six times inside one gate: caching the
// position alongside the exit instant latched the line for a whole gate dwell,
// which is days for the Sun and over a year for Pluto.

import { gateOfLongitude } from "./engine/wheel.js";
import { nextGateChange, SAMPLING_STEP_MS } from "./engine/windows.js";

// Earth and the South Node are labels on the Sun and True Node streams, never
// separate computations. Each sits 180 degrees away, so it leaves its gate at
// the same instant and never needs its own exit search.
export const ALIAS_OF = { Sun: "Earth", TrueNode: "SouthNode" };
export const ALIAS_NOTE = {
  Earth: "mirrors the Sun",
  SouthNode: "mirrors the North Node",
};

export function makeNowStates(wheel, bodies, longitudeOf, clock = Date.now) {
  // longitudeOf(body) -> (ms) -> degrees. clock is injected so the selftest can
  // advance time without waiting for the sky.
  const exits = new Map();

  return function nowStates() {
    const now = clock();
    const out = [];
    for (const body of bodies) {
      // undefined means never searched; null means the search found no change
      // inside its horizon, which is itself a stable answer worth keeping.
      let exitMs = exits.get(body);
      if (exitMs === undefined || (exitMs !== null && now >= exitMs)) {
        exitMs = nextGateChange(longitudeOf(body), wheel, now, SAMPLING_STEP_MS[body]);
        exits.set(body, exitMs);
      }
      const here = gateOfLongitude(longitudeOf(body)(now), wheel);
      out.push({ body, gate: here.gate, line: here.line, exitMs });

      const alias = ALIAS_OF[body];
      if (alias) {
        const there = gateOfLongitude(longitudeOf(alias)(now), wheel);
        out.push({
          body: alias, gate: there.gate, line: there.line, exitMs,
          alias: ALIAS_NOTE[alias],
        });
      }
    }
    return out;
  };
}
