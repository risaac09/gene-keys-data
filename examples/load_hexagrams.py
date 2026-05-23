"""Load the hexagrams dataset and print fill-rate statistics.

Run from the project root:
    python examples/load_hexagrams.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEXAGRAMS = ROOT / "data" / "hexagrams.json"


def main():
    with HEXAGRAMS.open() as f:
        hexagrams = json.load(f)

    total = len(hexagrams)
    fields = [
        "name",
        "codon",
        "amino_acid",
        "i_ching_number",
        "human_design_gate",
        "programming_partner_id",
        "codon_ring_id",
    ]

    print(f"hexagrams loaded: {total}")
    print("fill rate by field:")
    for field in fields:
        filled = sum(1 for h in hexagrams if h.get(field) is not None)
        print(f"  {field:30s} {filled:>3d}/{total}")


if __name__ == "__main__":
    main()
