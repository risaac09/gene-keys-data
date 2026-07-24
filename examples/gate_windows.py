"""How long a body spends inside a gate, not just which gate it is in right now.

gate_transit.py answers the instant question: given a longitude, which gate. This
answers the interval question: given a body's motion over time, when does it enter
a gate and when does it leave. That is what a transit window is, and it is the step
between the wheel and any practice or study built on it.

No ephemeris here, and no astronomy. The caller supplies `longitude_of(dt)`, a
function returning tropical ecliptic longitude in degrees for a UTC datetime.
Everything below is arithmetic over data/gate-wheel.json. Chart computation stays
downstream, per README and CONTRIBUTING; pass in Swiss Ephemeris output, or the
low-precision solar helper in gate_transit.py, or a synthetic function for testing.

Three things make this less trivial than stepping a loop and recording the gate:

Sampling. A fixed daily step misses fast bodies. The Moon crosses a 5.625 degree
gate in about ten hours, so daily sampling reports a fraction of its windows and
misdates the rest. The step has to stay under the time the body needs to cross one
gate at its fastest. max_step() computes that ceiling from the wheel's own arc width;
the caller supplies the body's fastest apparent motion, which is astronomy and so
belongs to the caller.

Precision. Stepping alone rounds every boundary to the sampling grid. Each gate
change here is bisected to a tolerance, so the reported edges are the crossings
rather than the samples that bracket them.

Retrograde. A body can enter a gate, station, back out, and re-enter. Those are one
passage with several contacts, not several passages. Set passage_gap to fold them
together; leave it None to keep every contact separate.

Run from the project root:
    python examples/gate_windows.py             # the Sun through the anchor gates
    python examples/gate_windows.py --selftest  # synthetic bodies, no ephemeris
"""
import datetime
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WHEEL_PATH = ROOT / "data" / "gate-wheel.json"


def load_wheel():
    with WHEEL_PATH.open() as f:
        return json.load(f)


def gate_of_longitude(lon, wheel):
    """The gate holding a tropical ecliptic longitude. See gate_transit.py."""
    anchor = wheel["anchor"]
    off = (lon - anchor["startLongitude"]) % 360.0
    idx = int(off // anchor["degreesPerGate"])
    return wheel["gates"][idx]["gate"]


def max_step(max_degrees_per_day, wheel=None):
    """The longest sampling step that cannot skip a whole gate.

    A step longer than the time the body needs to cross one arc can carry it in and
    out of a gate between two samples, and the window disappears. The arc width comes
    from the wheel; the body's fastest apparent motion comes from the caller, because
    that is an ephemeris fact and this file holds none.

    Apparent motion, not mean motion. Use the body's fastest, and leave margin.
    """
    if max_degrees_per_day <= 0:
        raise ValueError("max_degrees_per_day must be positive")
    wheel = wheel or load_wheel()
    days = wheel["anchor"]["degreesPerGate"] / max_degrees_per_day
    return datetime.timedelta(days=days)


def _boundary(longitude_of, wheel, lo, hi, tol):
    """Bisect to the instant the gate changes between lo and hi.

    Assumes one change in the bracket, which is what a step under max_step() buys.
    A station landing within microdegrees of an arc edge could in principle cross
    and recross inside one step; at that speed either answer is inside tol.
    """
    gate_lo = gate_of_longitude(longitude_of(lo), wheel)
    while hi - lo > tol:
        mid = lo + (hi - lo) / 2
        if gate_of_longitude(longitude_of(mid), wheel) == gate_lo:
            lo = mid
        else:
            hi = mid
    return hi


def gate_windows(longitude_of, gates, start, end, step, wheel=None,
                 passage_gap=None, tol=datetime.timedelta(seconds=30)):
    """Intervals in [start, end] where the body sits in one of `gates`.

    longitude_of  callable(datetime) -> degrees, tropical ecliptic, UTC
    gates         iterable of gate numbers to watch
    start, end    timezone-aware UTC datetimes
    step          sampling interval; keep it under max_step() for the body
    passage_gap   timedelta, or None. Two windows on the same gate separated by
                  less than this fold into one passage with contacts > 1, which
                  is how a retrograde triple pass should read.
    tol           bisection tolerance for each boundary

    Returns a list of dicts, sorted by start:
        gate, start, end, contacts, clamped_start, clamped_end

    clamped_start or clamped_end mean the window ran past that edge of the range
    and the reported time is the edge, not a crossing.
    """
    wheel = wheel or load_wheel()
    targets = set(gates)
    if start > end:
        raise ValueError("start must not be after end")
    if step <= datetime.timedelta(0):
        raise ValueError("step must be positive")

    out = []
    t = start
    prev = None
    run_gate = None
    run_start = None
    while True:
        gate = gate_of_longitude(longitude_of(t), wheel)
        active = gate if gate in targets else None
        if active != run_gate:
            if run_gate is not None:
                out.append({"gate": run_gate, "start": run_start,
                            "end": _boundary(longitude_of, wheel, prev, t, tol),
                            "contacts": 1, "clamped_start": run_start == start,
                            "clamped_end": False})
            if active is not None:
                run_start = (start if prev is None
                             else _boundary(longitude_of, wheel, prev, t, tol))
            run_gate = active
        prev = t
        if t >= end:
            break
        t = min(t + step, end)
    if run_gate is not None:
        out.append({"gate": run_gate, "start": run_start, "end": end, "contacts": 1,
                    "clamped_start": run_start == start, "clamped_end": True})

    out.sort(key=lambda w: w["start"])
    return _group(out, passage_gap) if passage_gap else out


def _group(windows, gap):
    """Fold re-entries on the same gate within `gap` into one passage."""
    out = []
    for w in windows:
        prev = next((p for p in reversed(out) if p["gate"] == w["gate"]), None)
        if prev is not None and w["start"] - prev["end"] <= gap:
            prev["end"] = w["end"]
            prev["clamped_end"] = w["clamped_end"]
            prev["contacts"] += 1
        else:
            out.append(w)
    return out


def _ramp(rate, origin, epoch):
    """A synthetic body at constant `rate` degrees per day from `origin`."""
    def longitude_of(dt):
        return (origin + rate * ((dt - epoch).total_seconds() / 86400.0)) % 360.0
    return longitude_of


def _selftest():
    """Synthetic bodies with known motion. No ephemeris, no chart, no real data."""
    wheel = load_wheel()
    anchor = wheel["anchor"]
    width = anchor["degreesPerGate"]
    epoch = datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc)
    day = datetime.timedelta(days=1)

    # 1. max_step is the arc width over the speed, in days.
    assert max_step(width, wheel) == day, "one gate per day should give a one-day ceiling"
    assert max_step(width * 2, wheel) == day / 2

    # 2. A body at exactly one gate per day, started at the anchor edge, sits in the
    #    anchor gate for its first full day and nothing longer.
    watch = anchor["gate"]
    win = gate_windows(_ramp(width, anchor["startLongitude"], epoch), [watch],
                       epoch, epoch + 10 * day, step=day / 24, wheel=wheel)
    assert len(win) == 1, f"expected one window, got {len(win)}"
    assert win[0]["clamped_start"] and not win[0]["clamped_end"]
    held = win[0]["end"] - win[0]["start"]
    assert abs(held - day) < datetime.timedelta(minutes=2), f"held {held}, wanted ~1 day"

    # 3. Bisection beats the sampling grid. A coarse step must still land the exit
    #    boundary on the same instant a fine step finds.
    coarse = gate_windows(_ramp(width, anchor["startLongitude"], epoch), [watch],
                          epoch, epoch + 10 * day, step=day / 2, wheel=wheel)
    assert abs(coarse[0]["end"] - win[0]["end"]) < datetime.timedelta(minutes=2)

    # 4. Retrograde. A body that enters the next gate, backs out, and re-enters
    #    makes three contacts. Ungrouped that is three windows; grouped it is one
    #    passage that spans them and counts the contacts.
    nxt = wheel["gates"][1]["gate"]
    edge = anchor["startLongitude"] + width

    def retro(dt):
        d = (dt - epoch).total_seconds() / 86400.0
        # in at day 1, out at 3, in at 5, out at 7, in at 9 and stays
        offset = {0: -1.0, 1: 0.5, 2: 0.5, 3: -0.5, 4: -0.5, 5: 0.5,
                  6: 0.5, 7: -0.5, 8: -0.5}.get(int(d), 1.0)
        return (edge + offset) % 360.0

    loose = gate_windows(retro, [nxt], epoch, epoch + 12 * day,
                         step=datetime.timedelta(hours=1), wheel=wheel)
    assert len(loose) == 3, f"ungrouped retrograde should be 3 windows, got {len(loose)}"
    assert all(w["contacts"] == 1 for w in loose)

    tight = gate_windows(retro, [nxt], epoch, epoch + 12 * day,
                         step=datetime.timedelta(hours=1), wheel=wheel,
                         passage_gap=3 * day)
    assert len(tight) == 1, f"grouped retrograde should be 1 passage, got {len(tight)}"
    assert tight[0]["contacts"] == 3, f"expected 3 contacts, got {tight[0]['contacts']}"
    assert tight[0]["start"] == loose[0]["start"] and tight[0]["end"] == loose[-1]["end"]

    # 5. A gap shorter than the retrograde loop must not fold anything.
    assert len(gate_windows(retro, [nxt], epoch, epoch + 12 * day,
                            step=datetime.timedelta(hours=1), wheel=wheel,
                            passage_gap=datetime.timedelta(hours=6))) == 3

    # 6. Watching no gates finds nothing, and an empty range is not an error.
    assert gate_windows(_ramp(1.0, 0.0, epoch), [], epoch, epoch + day,
                        step=day / 24, wheel=wheel) == []
    assert gate_windows(_ramp(1.0, 0.0, epoch), [watch], epoch, epoch,
                        step=day, wheel=wheel) == []

    print("selftest OK (max_step, window length, bisection, retrograde grouping, edges)")


def main(argv):
    if argv and argv[0] == "--selftest":
        _selftest()
        return
    from gate_transit import sun_longitude

    wheel = load_wheel()
    anchor = wheel["anchor"]
    watch = [anchor["gate"], wheel["gates"][1]["gate"]]
    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    # The Sun never exceeds about 1.02 degrees a day, so that is the ceiling; half
    # of it is a comfortable step.
    step = max_step(1.02, wheel) / 2

    print(f"Sun through gates {watch[0]} and {watch[1]}, "
          f"{now:%Y-%m-%d} plus one year")
    print()
    for w in gate_windows(sun_longitude, watch, now, now + datetime.timedelta(days=366),
                          step=step, wheel=wheel):
        held = w["end"] - w["start"]
        edge = " (clamped)" if w["clamped_start"] or w["clamped_end"] else ""
        print(f"  gate {w['gate']:<3} {w['start']:%Y-%m-%d %H:%M}"
              f" to {w['end']:%Y-%m-%d %H:%M} UTC"
              f"   {held.days}d {held.seconds // 3600}h{edge}")


if __name__ == "__main__":
    main(sys.argv[1:])
