"""Slow seasons: the arithmetic for building a low-noise transit practice.

gate_transit.py answers which gate a longitude is in. gate_windows.py answers
when a body enters and leaves. This file holds the third piece: the wheel
arithmetic that decides WHICH windows are worth watching at all, so a transit
practice does not drown in its own alerts.

Three facts, all computable from this repo's data with no ephemeris:

1. Dwell scales with the circuit. A gate is 5.625 degrees, so a body's mean
   stay in one gate is its circuit time over 64. The Moon holds a gate about
   ten hours; Pluto holds one about 3.9 years. mean_dwell() is that one line.

2. Coverage saturates fast. A natal chart activates gates; each covers 5.625
   degrees. Twenty gates is 31 percent of the wheel, and adding oppositions
   pushes a typical chart past 50 percent, at which point "a slow body is in
   relation to the chart" is true about half of all days by construction and
   an alert on it says nothing. coverage() computes the exact fraction for
   any gate set, so the saturation check runs before the practice is built.

3. Opposition IS the programming partner. The gate 180 degrees across the
   wheel, 32 positions away, is the same gate hexagrams.json names as the
   programming partner (validate.py now checks all 64). So the opposition
   relation in transit work is not a new structure; it is the partner axis
   the system already teaches, and partner_of() reads it from the wheel.

What stays out, on purpose: ephemeris calls, body constants, and anyone's
chart. Circuit lengths are astronomy, so they are the caller's input; the
docstring of demo() shows the standard values as documentation. For real
windows, feed gate_windows.gate_windows() a longitude function from Swiss
Ephemeris or equivalent, per the README's downstream rule.

Run from the project root:
    python examples/slow_seasons.py             # the arithmetic on a demo gate set
    python examples/slow_seasons.py --selftest
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WHEEL_PATH = ROOT / "data" / "gate-wheel.json"
HEXAGRAMS_PATH = ROOT / "data" / "hexagrams.json"


def load_wheel():
    with WHEEL_PATH.open() as f:
        return json.load(f)


def mean_dwell(circuit_days, wheel=None):
    """Mean days a body spends in one gate: circuit time over 64.

    An average over the whole circuit. Real dwell swings wide for anything
    that retrogrades; a body can sit in one gate across several contacts for
    much longer than the mean. gate_windows.py measures the real intervals.
    """
    if circuit_days <= 0:
        raise ValueError("circuit_days must be positive")
    wheel = wheel or load_wheel()
    return circuit_days * wheel["anchor"]["degreesPerGate"] / 360.0


def partner_of(gate, wheel=None):
    """The gate opposite `gate` on the wheel: 32 positions, 180 degrees.

    Identical to the programming_partner_id in hexagrams.json; validate.py
    holds the cross-check. Reading it from the wheel keeps this file joined
    to the geometry the transit examples use.
    """
    wheel = wheel or load_wheel()
    order = [g["gate"] for g in sorted(wheel["gates"], key=lambda g: g["wheelPosition"])]
    idx = {g: i for i, g in enumerate(order)}
    return order[(idx[gate] + len(order) // 2) % len(order)]


def coverage(gates, wheel=None, include_partners=False):
    """The fraction of the wheel a gate set watches.

    The saturation check. Pass include_partners=True to add the opposition
    (programming partner) of every gate, which is what watching both
    relations costs. Above about half, an "in relation" alert carries almost
    no information; curate the set down or split it by tempo instead.
    """
    wheel = wheel or load_wheel()
    watched = set(gates)
    if include_partners:
        watched |= {partner_of(g, wheel) for g in gates}
    unknown = watched - {g["gate"] for g in wheel["gates"]}
    if unknown:
        raise ValueError(f"not gates on this wheel: {sorted(unknown)}")
    return len(watched) * wheel["anchor"]["degreesPerGate"] / 360.0


def _selftest():
    wheel = load_wheel()
    # Dwell: one full circuit spread over 64 gates.
    assert mean_dwell(64.0, wheel) == 1.0
    assert abs(mean_dwell(27.32, wheel) * 24 - 10.245) < 0.01   # the Moon, in hours
    # Partner: symmetric, never self, and matches hexagrams.json on all 64.
    with HEXAGRAMS_PATH.open() as f:
        partner_field = {h["id"]: h.get("programming_partner_id") for h in json.load(f)}
    for g in range(1, 65):
        p = partner_of(g, wheel)
        assert p != g and partner_of(p, wheel) == g
        if partner_field.get(g) is not None:
            assert partner_field[g] == p, f"gate {g}: field {partner_field[g]}, wheel {p}"
    # Coverage: exact fractions, and the saturation shape.
    assert coverage([41], wheel) == 5.625 / 360.0
    assert coverage(range(1, 65), wheel) == 1.0
    twenty = list(range(1, 21))
    assert abs(coverage(twenty, wheel) - 20 * 5.625 / 360.0) < 1e-12
    both = coverage(twenty, wheel, include_partners=True)
    assert coverage(twenty, wheel) < both <= 2 * coverage(twenty, wheel)
    # A set that already contains a partner pair must not double-count it.
    pair = [41, partner_of(41, wheel)]
    assert coverage(pair, wheel, include_partners=True) == coverage(pair, wheel)
    print("selftest OK (dwell, partner symmetry + field agreement on 64, coverage)")


def demo():
    """The arithmetic on a ten-gate demo set.

    Standard circuit lengths, supplied here as the caller's input, not the
    module's knowledge (mean values, days): Moon 27.32, Sun 365.25, Mars
    686.98, Jupiter 4332.6, Saturn 10759, Uranus 30688, Neptune 60182,
    Pluto 90560, lunar nodes 6798.
    """
    wheel = load_wheel()
    # An arbitrary ten-gate set. A Golden Path profile yields ten or eleven
    # distinct gates, but per CONTRIBUTING.md no real chart belongs here, so
    # the demo uses the first ten ids. The arithmetic is the same for any set;
    # note gates 1 and 2 are a partner pair, so the partner-axis coverage
    # below is less than double, which is the overlap the check exists to catch.
    demo_gates = list(range(1, 11))
    print("Ten-gate demo set (arbitrary):", demo_gates)
    print(f"  coverage, conjunction only:      {coverage(demo_gates, wheel):5.1%}")
    print(f"  coverage, with partner axis:     "
          f"{coverage(demo_gates, wheel, include_partners=True):5.1%}")
    print()
    print("Mean dwell per gate (circuit supplied by caller):")
    for name, circuit in [("Moon", 27.32), ("Sun", 365.25), ("Mars", 686.98),
                          ("Jupiter", 4332.6), ("Saturn", 10759),
                          ("Uranus", 30688), ("Pluto", 90560)]:
        d = mean_dwell(circuit, wheel)
        label = f"{d * 24:.0f} hours" if d < 2 else (
            f"{d:.0f} days" if d < 400 else f"{d / 365.25:.1f} years")
        print(f"  {name:8} {label}")
    print()
    print("The slow-season shape: windows rare enough to be seasons come from")
    print("Jupiter outward. Feed gate_windows.gate_windows() an ephemeris-backed")
    print("longitude function for those bodies and this gate set; everything")
    print("faster saturates, as the coverage numbers above predict.")


def main(argv):
    if argv and argv[0] == "--selftest":
        _selftest()
        return
    demo()


if __name__ == "__main__":
    main(sys.argv[1:])
