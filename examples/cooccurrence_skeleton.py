"""Sketch for a chart co-occurrence frequency table on the Gene Keys.

This is a structural sketch of the analysis pattern that motivated this repo:
co-occurrence work done privately against a large profile dataset, with the
frequency table as its first step.

The profile dataset is NOT included in this repo. This script shows how a
profile dataset would join against the hexagram structural data once both
exist. It is intentionally minimal: a Counter over a signature tuple, divided
by the total. Real regression work (residuals, expected-vs-observed under a
null model, baseline correction) lives downstream.

Inputs the user supplies:
    profiles.csv  with columns:
        profile_id, type, incarnation_cross, profile_lines
        (plus any chart-sphere columns the user wants to add to the signature)

Output:
    Frequency table over the (type, incarnation_cross, profile_lines) tuple,
    sorted high to low.
"""
import csv
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
    """Surface signature for a profile.

    The motivating analysis used a triple of type, incarnation cross, and
    profile (line pair). Adjust the field names to match your dataset.
    """
    return (row["type"], row["incarnation_cross"], row["profile_lines"])


def cooccurrence_frequency(profiles):
    sigs = Counter(profile_signature(p) for p in profiles)
    total = sum(sigs.values())
    return {sig: count / total for sig, count in sigs.items()}


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print()
        print("usage: python examples/cooccurrence_skeleton.py <profiles.csv>")
        print()
        print(f"hexagrams available: {len(load_hexagrams())}")
        sys.exit(0)

    path = Path(sys.argv[1])
    with path.open() as f:
        rows = list(csv.DictReader(f))

    freqs = cooccurrence_frequency(rows)
    print(f"profiles read:      {len(rows)}")
    print(f"unique signatures:  {len(freqs)}")
    print(f"top 10 by frequency:")
    for sig, freq in sorted(freqs.items(), key=lambda x: -x[1])[:10]:
        print(f"  {freq:.6f}  {sig}")


if __name__ == "__main__":
    main()
