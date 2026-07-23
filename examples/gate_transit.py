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
    python examples/gate_transit.py 1996-03-22T15:10:00Z
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
    wheel = load_wheel()
    # Isaac Rubinstein's birth moment (public in the downstream stack) lands the
    # personality Sun in gate 25 line 5, a fixed check that the wheel + formula agree.
    birth = datetime(1996, 3, 22, 15, 10, tzinfo=timezone.utc)
    gate, line = gate_of_longitude(sun_longitude(birth), wheel)
    assert (gate, line) == (25, 5), f"selftest failed: got {gate}/{line}, expected 25/5"
    # Design Sun, 88 degrees of solar arc earlier, lands in gate 58 line 1.
    design = datetime(1995, 12, 26, 13, 5, tzinfo=timezone.utc)
    assert gate_of_longitude(sun_longitude(design), wheel)[0] == 58
    print("selftest OK (birth Sun -> gate 25 line 5)")


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
