"""Validate all data files against their schemas.

Run from the project root:
    python examples/validate.py

Requires: pip install jsonschema
"""
import json
import sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    print("jsonschema not installed. Run: pip install jsonschema")
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
SCHEMAS = ROOT / "schemas"
DATA = ROOT / "data"


def validate_array(data_path, schema_path):
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
        print(f"  FAIL {data_path.name}: {len(errors)} error(s)")
        for i, msg in errors[:5]:
            print(f"    [{i}] {msg}")
        if len(errors) > 5:
            print(f"    ... and {len(errors) - 5} more")
        return False

    print(f"  OK   {data_path.name} ({len(data)} entries)")
    return True


def validate_object(data_path, schema_path):
    with data_path.open() as f:
        data = json.load(f)
    with schema_path.open() as f:
        schema = json.load(f)

    try:
        jsonschema.validate(data, schema)
    except jsonschema.ValidationError as e:
        print(f"  FAIL {data_path.name}: {e.message}")
        return False

    print(f"  OK   {data_path.name}")
    return True


def main():
    array_pairs = [
        (DATA / "hexagrams.json", SCHEMAS / "hexagram.schema.json"),
    ]
    object_pairs = [
        (DATA / "sequences" / "activation.json", SCHEMAS / "sequence.schema.json"),
    ]
    results = [validate_array(d, s) for d, s in array_pairs]
    results += [validate_object(d, s) for d, s in object_pairs]
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
