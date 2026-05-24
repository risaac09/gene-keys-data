"""Validate all data files against their schemas.

Run from the project root:
    python examples/validate.py

Requires: pip install jsonschema
"""
import json
import sys
from collections import Counter
from pathlib import Path

try:
    import jsonschema
except ImportError:
    print("jsonschema not installed. Run: pip install -r requirements.txt")
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
SCHEMAS = ROOT / "schemas"
DATA = ROOT / "data"


def unique_ids(items):
    dupes = [k for k, c in Counter(it["id"] for it in items).items() if c > 1]
    return f"duplicate ids: {sorted(dupes)}" if dupes else None


def sphere_count_matches(seq):
    declared, actual = seq["sphere_count"], len(seq["spheres"])
    if declared != actual:
        return f"sphere_count {declared} != len(spheres) {actual}"
    return None


def unique_sphere_positions(seq):
    dupes = [p for p, c in Counter(s["position"] for s in seq["spheres"]).items() if c > 1]
    return f"duplicate sphere positions: {sorted(dupes)}" if dupes else None


def validate_array(data_path, schema_path, invariants=()):
    with data_path.open() as f:
        data = json.load(f)
    with schema_path.open() as f:
        schema = json.load(f)

    if not isinstance(data, list):
        print(f"  FAIL {data_path.name}: expected JSON array")
        return False

    errors = []
    for i, item in enumerate(data):
        try:
            jsonschema.validate(item, schema)
        except jsonschema.ValidationError as e:
            errors.append((i, e.message))

    if errors:
        print(f"  FAIL {data_path.name}: {len(errors)} schema error(s)")
        for i, msg in errors[:5]:
            print(f"    [{i}] {msg}")
        if len(errors) > 5:
            print(f"    ... and {len(errors) - 5} more")
        return False

    for inv in invariants:
        msg = inv(data)
        if msg:
            print(f"  FAIL {data_path.name}: {msg}")
            return False

    print(f"  OK   {data_path.name} ({len(data)} entries)")
    return True


def validate_object(data_path, schema_path, invariants=()):
    with data_path.open() as f:
        data = json.load(f)
    with schema_path.open() as f:
        schema = json.load(f)

    try:
        jsonschema.validate(data, schema)
    except jsonschema.ValidationError as e:
        print(f"  FAIL {data_path.name}: {e.message}")
        return False

    for inv in invariants:
        msg = inv(data)
        if msg:
            print(f"  FAIL {data_path.name}: {msg}")
            return False

    print(f"  OK   {data_path.name}")
    return True


def main():
    array_targets = [
        (DATA / "hexagrams.json", SCHEMAS / "hexagram.schema.json", [unique_ids]),
    ]
    object_targets = [
        (
            DATA / "sequences" / "activation.json",
            SCHEMAS / "sequence.schema.json",
            [sphere_count_matches, unique_sphere_positions],
        ),
    ]
    results = [validate_array(d, s, inv) for d, s, inv in array_targets]
    results += [validate_object(d, s, inv) for d, s, inv in object_targets]
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
