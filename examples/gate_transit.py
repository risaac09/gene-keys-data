"""Which gate is a given ecliptic longitude in, and which gate is the Sun transiting.

The dataset's job is the wheel: data/gate-wheel.json maps each King Wen gate to its
arc of tropical ecliptic longitude. The core function here, gate_of_longitude(lon),
is a pure lookup against that file. Given any longitude it returns the gate and line.

Computing a chart from birth data stays downstream of this repo (Swiss Ephemeris and
adjacent libraries), as the README says. The sun_longitude() helper below is a
low-precision convenience (Meeus' simplified solar position, good to about 0.01 degree)
so the example runs out of the box; each gate arc is 5.625 degrees wide, so that
precision resolves the gate and line without an ephemeris dependency. For anything
that needs arc-second accuracy, swap it for a real ephemeris.

Run from the project root:
    python examples/gate_transit.py                 # the gate the Sun is in now (UTC)
    python examples/gate_transit.py 2026-03-22T15:10:00Z
"""
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WHEEL_PATH = ROOT / "data" / "gate-wheel.json"


def load_wheel():
    with WHEEL_PATH.open() as f:
        return json.load(f)


def gate_of_longitude(lon, wheel=None):
    """Return (gate, line) for a tropical ecliptic longitude in degrees.

    Pure lookup against data/gate-wheel.json. Line is 1 to 6 within the gate,
    counted from the arc start (0.9375 degrees per line).
    """
    wheel = wheel or load_wheel()
    anchor = wheel["anchor"]
    off = (lon - anchor["startLongitude"]) % 360.0
    idx = int(off // anchor["degreesPerGate"])
    gate = wheel["gates"][idx]["gate"]
    line = int((off % anchor["degreesPerGate"]) // anchor["degreesPerLine"]) + 1
    return gate, line


def sun_longitude(dt):
    """Low-precision apparent solar longitude (degrees) for a UTC datetime.

    Meeus' simplified formula, about 0.01 degree. Illustrative only; production
    chart work uses a real ephemeris. See module docstring.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    jd = dt.timestamp() / 86400.0 + 2440587.5
    n = jd - 2451545.0
    L = (280.460 + 0.9856474 * n) % 360.0
    g = math.radians((357.528 + 0.9856003 * n) % 360.0)
    lam = L + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g)
    return lam % 360.0


def _selftest():
    """Check the lookup against the wheel's own invariants.

    Everything here is a fact about the structure, so no birth chart is needed and
    none is used. CONTRIBUTING.md rules personal birth-chart data out of this repo,
    and a fixture built from someone's chart would be exactly that; the wheel's
    anchor and arc arithmetic make a stronger check anyway, because they test all
    64 gates instead of one.
    """
    wheel = load_wheel()
    anchor = wheel["anchor"]

    # 1. The anchor lands where the file says: gate 41 opens at 2 Aquarius.
    start = anchor["startLongitude"]
    assert gate_of_longitude(start, wheel) == (anchor["gate"], 1), "anchor is off"
    # A hair before the anchor belongs to the last gate on the wheel, not the first.
    assert gate_of_longitude(start - 0.001, wheel)[0] == wheel["gates"][-1]["gate"]

    # 2. Every gate's arc midpoint maps back to that gate. 64 for 64, or the wheel
    #    and the lookup disagree somewhere around the circle.
    half = anchor["degreesPerGate"] / 2
    for g in wheel["gates"]:
        mid = (g["startLongitude"] + half) % 360.0
        got = gate_of_longitude(mid, wheel)[0]
        assert got == g["gate"], f"midpoint of gate {g['gate']} resolved to {got}"

    # 3. The six lines divide one gate evenly, in order.
    per_line = anchor["degreesPerLine"]
    for k in range(6):
        lon = start + per_line * k + per_line / 2
        assert gate_of_longitude(lon, wheel) == (anchor["gate"], k + 1)

    # 4. The solar helper agrees with its own reference epoch. At J2000.0
    #    (2000-01-01 12:00 UTC) Meeus' simplified series puts the Sun at about
    #    280.376 degrees. This pins the formula, not the wheel.
    j2000 = datetime(2000, 1, 1, 12, 0, tzinfo=timezone.utc)
    lon = sun_longitude(j2000)
    assert abs(lon - 280.376) < 0.01, f"J2000 solar longitude drifted: {lon:.4f}"

    print(f"selftest OK (anchor, all {len(wheel['gates'])} gate midpoints, "
          f"6 lines, J2000 solar reference)")


def main(argv):
    if argv and argv[0] == "--selftest":
        _selftest()
        return
    if argv:
        raw = argv[0].replace("Z", "+00:00")
        dt = datetime.fromisoformat(raw)
    else:
        dt = datetime.now(timezone.utc)
    lon = sun_longitude(dt)
    gate, line = gate_of_longitude(lon)
    print(f"{dt.isoformat()}  Sun at {lon:.3f} deg  ->  gate {gate} line {line}")


if __name__ == "__main__":
    main(sys.argv[1:])
