// The only file that touches the vendored astronomy-engine global.
// Everything leaves here as apparent geocentric ecliptic longitude of date
// (true equinox), tropical, degrees in [0, 360). Time is epoch milliseconds UTC.
//
// Vendored: astronomy-engine 2.1.19 (see ../../vendor/astronomy-engine/).
// Frame notes: SunPosition and EclipticGeoMoon return true-ecliptic-of-date
// directly. For planets, GeoVector(body, t, true) gives light-time-corrected
// J2000 equatorial with aberration, and Ecliptic() converts that to true
// ecliptic of date. Rotation_EQJ_ECL would be J2000 mean ecliptic: wrong frame.

import { norm360 } from "./wheel.js";

function A() {
  if (typeof window === "undefined" || !window.Astronomy) {
    throw new Error("astronomy-engine is not loaded");
  }
  return window.Astronomy;
}

// The 11 computed transit streams. Earth and South Node are labels on the
// Sun and True Node streams (+180 degrees), never separate computations.
export const TRANSIT_BODIES = [
  "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter",
  "Saturn", "Uranus", "Neptune", "Pluto", "TrueNode",
];
export const ALIASES = { Earth: "Sun", SouthNode: "TrueNode" };

// astronomy-engine's Pluto model has a bounded validity range; the UI clamps
// dates to this window and says so.
export const DATE_MIN_MS = Date.UTC(1900, 0, 1);
export const DATE_MAX_MS = Date.UTC(2100, 0, 1);

function timeOf(ms) {
  return A().MakeTime(new Date(ms));
}

export function trueNodeLongitude(ms) {
  // Osculating ascending node of the Moon's geocentric orbit, the same
  // definition Swiss Ephemeris calls "True Node". Rotate the Moon's state
  // vector into the true ecliptic of date, take the orbit normal h = r x v;
  // the ascending node direction is z-hat x h = (-hy, hx, 0).
  const astro = A();
  const t = timeOf(ms);
  const s = astro.RotateState(astro.Rotation_EQJ_ECT(t), astro.GeoMoonState(t));
  const hx = s.y * s.vz - s.z * s.vy;
  const hy = s.z * s.vx - s.x * s.vz;
  return norm360((Math.atan2(hx, -hy) * 180) / Math.PI);
}

export function bodyLongitude(body, ms) {
  const astro = A();
  const t = timeOf(ms);
  switch (body) {
    case "Sun":
      return norm360(astro.SunPosition(t).elon);
    case "Moon":
      return norm360(astro.EclipticGeoMoon(t).lon);
    case "TrueNode":
      return trueNodeLongitude(ms);
    case "Earth":
      return norm360(astro.SunPosition(t).elon + 180);
    case "SouthNode":
      return norm360(trueNodeLongitude(ms) + 180);
    default:
      return norm360(astro.Ecliptic(astro.GeoVector(astro.Body[body], t, true)).elon);
  }
}

export function longitudeFn(body) {
  return (ms) => bodyLongitude(body, ms);
}

export function meeusSunLongitude(ms) {
  // Exact port of sun_longitude() in examples/gate_transit.py: Meeus'
  // simplified solar series, about 0.01 degree.
  const jd = ms / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = norm360(280.460 + 0.9856474 * n);
  const g = (norm360(357.528 + 0.9856003 * n) * Math.PI) / 180;
  const lam = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
  return norm360(lam);
}

export function meanNodeLongitude(ms) {
  // Meeus mean-node polynomial (Astronomical Algorithms ch. 47). Fallback and
  // sanity band only: the osculating node swings about 1.75 degrees around it.
  const jd = ms / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  const omega =
    125.0445479 -
    1934.1362891 * T +
    0.0020754 * T * T +
    (T * T * T) / 467441 -
    (T * T * T * T) / 60616000;
  return norm360(omega);
}

export function verifyEphemeris(nowMs) {
  // Two checks before any chart math; either failure blocks rendering.
  // 1. J2000 anchor: same figure the Python selftest pins. TT-UTC was 64 s at
  //    J2000, which moves the Sun ~0.0007 degrees, well inside the tolerance.
  // 2. A modern instant against the ported Meeus series, which catches a
  //    wrong frame, wrong units, or a swapped vendor build cold.
  const checks = [];
  const j2000 = Date.UTC(2000, 0, 1, 12);
  const sunJ2000 = bodyLongitude("Sun", j2000);
  checks.push({
    name: "J2000 solar longitude",
    expected: 280.376, actual: sunJ2000, tol: 0.01,
    pass: Math.abs(sunJ2000 - 280.376) <= 0.01,
  });
  const engineNow = bodyLongitude("Sun", nowMs);
  const meeusNow = meeusSunLongitude(nowMs);
  const diff = Math.abs(norm360(engineNow - meeusNow + 180) - 180);
  checks.push({
    name: "Sun vs Meeus series, now",
    expected: meeusNow, actual: engineNow, tol: 0.05,
    pass: diff <= 0.05,
  });
  return { ok: checks.every((c) => c.pass), checks };
}
