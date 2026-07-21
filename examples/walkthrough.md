# walkthrough

From clone to the join pattern in six short steps. The motivating analysis (a collaborator's regression against a large private profile dataset) lives downstream of step 4. This walkthrough stops at the join.

## 0. setup

```bash
git clone https://github.com/risaac09/gene-keys-data.git
cd gene-keys-data
pip install -r requirements.txt
python examples/validate.py
```

Two OK lines means schema + cross-entry invariants pass.

## 1. load the structure

```python
import json
from pathlib import Path

hexagrams = json.loads(Path("data/hexagrams.json").read_text())
print(f"loaded {len(hexagrams)} hexagrams")
print(hexagrams[0])
```

```
loaded 64 hexagrams
{'id': 1, 'line_count': 6, 'frequencies': ['shadow', 'gift', 'siddhi'], 'name': None, 'i_ching_name_pinyin': 'Qián', ...}
```

The structural fields are filled. The Gene Keys `name` field is null pending Gene Keys Publishing's blessing (see `CONTRIBUTING.md`). Pinyin is filled because it's ancient Chinese, public domain.

## 2. fill-rate snapshot

```bash
python examples/load_hexagrams.py
```

```
hexagrams loaded: 64
fill rate by field:
  name                             0/64
  i_ching_name_pinyin             64/64
  codon                            0/64
  amino_acid                       0/64
  i_ching_number                  64/64
  human_design_gate               64/64
  programming_partner_id           0/64
  codon_ring_id                    0/64
```

Three structural fields filled, five awaiting canonical contribution.

## 3. load the demo profiles

```python
import csv
profiles = list(csv.DictReader(open("examples/demo_profiles.csv")))
print(f"loaded {len(profiles)} profiles")
print(profiles[0])
```

100 synthetic rows. Realistic cardinalities (type weighted to population, 64 incarnation crosses, 12 standard profiles). Not real chart data. Regenerate or modify with `python examples/generate_demo_profiles.py`.

## 4. baseline frequency table

```bash
python examples/cooccurrence_skeleton.py examples/demo_profiles.csv
```

```
profiles read:      100
unique signatures:  99
top 10 by frequency:
  0.020000  ('Manifesting Generator', 'LAX-2', '2/4')
  0.010000  ...
```

A Counter over the (type, incarnation_cross, profile_lines) triple, divided by total. On 100 rows the top signature lands at .02 because the sample is small relative to the signature space. On a real dataset at scale the baseline drops by orders of magnitude because the denominator outscales the numerator.

The skeleton stops here. The analysis begins on the next line.

## 5. where the analysis begins

The skeleton doesn't compute expected frequencies under a null model. It doesn't subtract a baseline. It doesn't surface signatures that occur more or less often than chance predicts.

If you'd want to extend it:

```python
# baseline expectation under independence
from collections import Counter
import csv

profiles = list(csv.DictReader(open("examples/demo_profiles.csv")))

p_type = Counter(p["type"] for p in profiles)
p_cross = Counter(p["incarnation_cross"] for p in profiles)
p_prof = Counter(p["profile_lines"] for p in profiles)
n = len(profiles)

# expected frequency of (type, cross, profile) under independence
def expected(t, c, pr):
    return (p_type[t] / n) * (p_cross[c] / n) * (p_prof[pr] / n)

# observed vs expected, with deviation
from examples.cooccurrence_skeleton import cooccurrence_frequency
freqs = cooccurrence_frequency(profiles)
for sig, obs in sorted(freqs.items(), key=lambda x: -x[1])[:10]:
    exp = expected(*sig)
    ratio = obs / exp if exp > 0 else float("inf")
    print(f"  obs={obs:.4f}  exp={exp:.4f}  ratio={ratio:.2f}  {sig}")
```

Now you can see which signatures occur more (ratio > 1) or less (ratio < 1) than independence predicts. That's where a raw frequency becomes interpretable.

## 6. the viewer

```bash
python -m http.server
```

Visit [http://localhost:8000/viewer/](http://localhost:8000/viewer/). Sort the 64 by pinyin, by ID, by HD gate. Click a row for the full record. The viewer reads the same `data/hexagrams.json`; whatever you fill canonically shows up there.
