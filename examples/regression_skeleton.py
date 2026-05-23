"""Skeleton for a chart co-occurrence regression on the Gene Keys.

This is a structural sketch of the analysis pattern that motivated this repo:
a regression against a roughly one-million-profile dataset that found
co-occurrence frequencies near .005 for chart-cross-profile triples (roughly
one in one hundred thousand for the surface combination).

The profile dataset is NOT included in this repo. This script shows how a
profile dataset would join against the hexagram structural data once both
exist. It is intentionally incomplete and clearly marked.

Inputs the user would need:
    profiles.csv  with columns like:
        profile_id, type, incarnation_cross, profile_lines,
        life_work_gk, evolution_gk, radiance_gk, purpose_gk

    hexagrams.json  (in this repo)

Output: co-occurrence frequency table.
"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEXAGRAMS = ROOT / "data" / "hexagrams.json"


def load_hexagrams():
    with HEXAGRAMS.open() as f:
        return json.load(f)


def profile_signature(row):
    """Return the surface signature for a profile.

    Adjust to match the columns in your dataset. This signature uses the
    three fields that produced the .005 baseline frequency in the original
    regression: type, incarnation cross, profile (line pair).
    """
    return (row["type"], row["incarnation_cross"], row["profile_lines"])


def cooccurrence_frequency(profiles):
    """Frequency of each unique surface signature across a dataset."""
    sigs = Counter(profile_signature(p) for p in profiles)
    total = sum(sigs.values())
    return {sig: count / total for sig, count in sigs.items()}


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print()
        print("usage: python examples/regression_skeleton.py <profiles.csv>")
        print()
        print("v0 is a structural sketch. Supply your own profile dataset.")
        print()
        print(f"hexagrams available: {len(load_hexagrams())}")
        sys.exit(0)

    # The reader of this file is responsible for loading their own dataset
    # in whatever format it lives in. The pattern above is the join target.
    print("see comments in this file for the regression pattern")


if __name__ == "__main__":
    main()
