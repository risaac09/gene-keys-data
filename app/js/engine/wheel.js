// Wheel lookup, ported from examples/gate_transit.py (gate_of_longitude) and
// examples/slow_seasons.py (partner_of). Pure arithmetic over the parsed
// data/gate-wheel.json document; no astronomy, no fetch.

export function loadWheel(doc) {
  const anchor = doc.anchor;
  const gates = [...doc.gates].sort((a, b) => a.wheelPosition - b.wheelPosition);
  if (gates.length !== 64) throw new Error(`wheel has ${gates.length} gates, wanted 64`);
  const order = gates.map((g) => g.gate);
  if (new Set(order).size !== 64) throw new Error("wheel gates are not unique");
  const indexOf = new Map(order.map((g, i) => [g, i]));
  return Object.freeze({
    startLongitude: anchor.startLongitude,
    degreesPerGate: anchor.degreesPerGate,
    degreesPerLine: anchor.degreesPerLine,
    anchorGate: anchor.gate,
    order,
    indexOf,
  });
}

export function norm360(deg) {
  // Python's % is non-negative; JS's is not. Every angle passes through here.
  return ((deg % 360) + 360) % 360;
}

export function gateOfLongitude(lon, wheel) {
  const off = norm360(lon - wheel.startLongitude);
  const idx = Math.min(Math.floor(off / wheel.degreesPerGate), 63);
  const line = Math.min(
    Math.floor((off % wheel.degreesPerGate) / wheel.degreesPerLine) + 1,
    6,
  );
  return { gate: wheel.order[idx], line };
}

export function partnerOf(gate, wheel) {
  const idx = wheel.indexOf.get(gate);
  if (idx === undefined) throw new Error(`not a gate on this wheel: ${gate}`);
  return wheel.order[(idx + 32) % 64];
}
