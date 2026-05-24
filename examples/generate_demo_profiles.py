"""Generate a synthetic demo profile dataset for cooccurrence_skeleton.py.

This is NOT real chart data. It's 100 seeded random rows with realistic field
cardinalities so cooccurrence_skeleton.py has something to run against on
first clone. Deterministic: same seed, same output.

Run from the project root:
    python examples/generate_demo_profiles.py

Writes:
    examples/demo_profiles.csv
"""
import csv
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "examples" / "demo_profiles.csv"

TYPES = [
    "Generator",
    "Manifesting Generator",
    "Manifestor",
    "Projector",
    "Reflector",
]
TYPE_WEIGHTS = [0.37, 0.33, 0.09, 0.20, 0.01]

INCARNATION_CROSSES = (
    [f"RAX-{i}" for i in range(1, 33)]
    + [f"LAX-{i}" for i in range(1, 33)]
)

PROFILES = [
    "1/3", "1/4",
    "2/4", "2/5",
    "3/5", "3/6",
    "4/6", "4/1",
    "5/1", "5/2",
    "6/2", "6/3",
]

N_PROFILES = 100
SEED = 42


def generate():
    rng = random.Random(SEED)
    rows = []
    for i in range(1, N_PROFILES + 1):
        rows.append({
            "profile_id": f"demo-{i:04d}",
            "type": rng.choices(TYPES, weights=TYPE_WEIGHTS)[0],
            "incarnation_cross": rng.choice(INCARNATION_CROSSES),
            "profile_lines": rng.choice(PROFILES),
        })
    return rows


def main():
    rows = generate()
    fields = ["profile_id", "type", "incarnation_cross", "profile_lines"]
    with OUT.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {len(rows)} synthetic profiles to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
