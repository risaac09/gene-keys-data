# gene-keys-data

An open, structural dataset for the 64 Gene Keys.

## What this is

The Gene Keys, Richard Rudd's contemplative system built on the I Ching, the human genetic code, and the Human Design lineage, are usually encountered as text. 64 hexagrams, three frequencies each (Shadow, Gift, Siddhi), three sequences (Activation, Venus, Pearl). The text is Rudd's intellectual property and stays his.

What is not his is the *structure*: 64 positions, six lines per position, three frequencies per line, codon-to-hexagram mappings derived from the universal genetic code, cross-reference to I Ching and Human Design numbering, programming-partner pairs, codon ring groupings. Those are facts of the substrate. They belong to whoever wants to work with them.

This repo holds the structure as data files, with JSON Schemas, in formats a data scientist can load, query, and join. The proprietary content is referenced (by ID) and not republished.

## Who this is for

People who want to do data work with the Gene Keys. Chart co-occurrence regressions, transit pattern studies, longitudinal hexagram tracking across a community, anything where the system needs to be data rather than prose.

The repo exists because a conversation surfaced co-occurrence work done against a private profile dataset, in private files, with nowhere public to point at for someone else who wanted to run a similar analysis.

## Quickstart

```bash
git clone https://github.com/risaac09/gene-keys-data.git
cd gene-keys-data
pip install -r requirements.txt
python examples/validate.py
python -m http.server          # then visit http://localhost:8000/viewer/
```

`examples/walkthrough.md` walks from clone to the join pattern in six short steps. `CONTEXT.md` is the relational origin of the repo.

## What's here

- `data/hexagrams.json` — 64 hexagram entries. `i_ching_number`, `human_design_gate`, `i_ching_name_pinyin`, and `programming_partner_id` are filled (a programming partner is the line-inverted hexagram, a computable fact of the structure, cross-checked against the published pair list); `name` (the canonical Gene Keys name from Rudd), `codon`, `amino_acid`, and `codon_ring_id` are `null` pending canonical contribution.
- `data/sequences/activation.json` — the four-sphere Activation Sequence (Life's Work, Evolution, Radiance, Purpose) with astronomical derivations.
- `data/sequences/venus.json` + `data/sequences/pearl.json` — the Venus Sequence (five spheres) and Pearl Sequence (four spheres) with astronomical derivations, filled 2026-07-01 from Gene Keys Publishing's official derivation document (citation in `data/sequences/README.md`).
- `data/human-design.json` — the Human Design bodygraph wiring as structural fact: nine centers, each gate's center membership, and the 36 channels as gate pairs with their center pairs. Gate numbers are the shared King Wen numbering, so this joins `hexagrams.json` directly. Channel keynote names (Ra Uru Hu's published material) stay `null` pending canonical contribution, the same precedent as the hexagram `name` field.
- `data/gate-wheel.json` — the 64 gates arranged around the tropical zodiac (the Human Design / Gene Keys mandala). Each gate holds a 5.625 degree arc of ecliptic longitude, anchored with gate 41 at 2 degrees Aquarius, in zodiacal order. This is what makes transits computable: the gate an ecliptic longitude falls in is a lookup, and the Sun crossing a gate's arc is what activates that gene key. Gate numbers share the King Wen numbering, so it joins `hexagrams.json` directly.
- `schemas/hexagram.schema.json`, `schemas/sequence.schema.json`, `schemas/human-design.schema.json`, and `schemas/gate-wheel.schema.json` — JSON Schemas. `examples/validate.py` runs schema + cross-entry invariant checks (id uniqueness, sphere-count match, position uniqueness, gate partition, the wheel's arc contiguity and anchor math, and the partner-opposition join: every gate's programming partner sits exactly 32 wheel positions away, so hexagram structure and zodiac geometry state the same 32 pairings) on every push and PR via GitHub Actions.
- `examples/load_hexagrams.py` — minimal loader that prints fill-rate statistics.
- `examples/gate_transit.py` — the wheel in use. `gate_of_longitude(lon)` is a pure lookup against `gate-wheel.json` returning the gate and line; a low-precision Sun-position helper is included so the example runs out of the box (`python examples/gate_transit.py` prints the gate the Sun is transiting now). The lookup and the wheel are body-agnostic: hand either one the longitude of the Moon, Venus or Jupiter and it answers the same way, which is what the six bodies named across `data/sequences/*.json` need. The Sun carries the worked example only because its position computes without an ephemeris. Real chart computation stays downstream, see below.
- `examples/gate_windows.py` — the interval question rather than the instant one: when a body enters a gate and when it leaves. The caller supplies a `longitude_of(dt)` function, so this file holds no ephemeris and no astronomy either. It handles the three things a plain loop gets wrong: sampling steps sized so a fast body cannot cross a gate between samples (`max_step()` derives the ceiling from the wheel's arc width), bisection so a boundary is the crossing instead of the sample that brackets it, and retrograde re-entries folded into one passage with a contact count. `--selftest` runs synthetic bodies with known motion, so it needs no ephemeris and no chart.
- `examples/slow_seasons.py` — the arithmetic for a low-noise transit practice, no ephemeris. Three facts computed from the wheel: mean dwell per gate scales with a body's circuit (Moon about ten hours, Pluto about 3.9 years); coverage saturates fast (a 20-gate chart watching conjunctions and oppositions can pass half the wheel, at which point an alert says nothing, and `coverage()` computes the exact fraction before you build); and the opposition gate IS the programming partner (`partner_of()` reads it from the geometry, `validate.py` cross-checks it against `hexagrams.json` on all 64). Windows rare enough to be seasons come from Jupiter outward; feed `gate_windows.gate_windows()` an ephemeris-backed longitude function for those.
- `examples/cooccurrence_skeleton.py` — structural sketch of a chart co-occurrence frequency table. Reads `profiles.csv` and prints top signatures by frequency. Regression work on real data lives downstream, in private files.
- `examples/generate_demo_profiles.py` + `examples/demo_profiles.csv` — seeded synthetic 100-profile dataset so the skeleton runs out of the box. Not real chart data.
- `examples/walkthrough.md` — clone-to-join walkthrough.
- `viewer/index.html` — table view. Sortable, filterable, click any row for a detail panel.
- `viewer/wheel.html` — circular visualization. 64 hexagrams in King Wen sequence, hover or click any position. Programming-partner chords render when those fields fill.
- `viewer/graph.html` — 8×8 lattice with toggle overlays for programming partners, codon rings, and the King Wen sequence path.
- `viewer/calculator.html` — in-browser co-occurrence frequency tool. Paste a CSV (or load the sample), see the long-tail distribution and the expected uniform baseline.
- The four viewer pages share top navigation. Single-file vanilla JS, no build step.
- `app/` — the transit explorer, an installable PWA built on this dataset. See below.

## The app

`app/` is a client-side transit explorer over the dataset: enter a birth moment, see the Golden Path spheres structurally (gate and line by number, joined from `data/sequences/*.json`), watch the Sun's annual windows and the slow outer-body seasons over those gates, and export the recommended cut as calendar events. Vanilla JS, no build step, installable, fully offline after first load. Serve the repo root and visit `/app/`; `app/selftest.html` is its correctness gate, the JS sibling of the Python `--selftest` suites.

What it computes: natal positions at the birth instant and at the design moment (the Sun 88 degrees of solar arc earlier), the sphere join, transit windows with bisected boundaries and retrograde passages grouped, coverage arithmetic. Three of those are faithful ports, cross-validated against their Python originals: the wheel lookup (`examples/gate_transit.py`), transit windows (`gate_windows.py`), and slow seasons (`slow_seasons.py`). The design-moment solver, the true-node computation, and wall-clock-to-UTC timezone conversion have no Python counterpart here; they are new code, and `app/selftest.html` is what covers them. Positions come from a vendored ephemeris (`astronomy-engine`, MIT, `app/vendor/astronomy-engine/`).

What it refuses to compute: meaning. The app shows numbers, lines, spheres, partners, and tempo, and links to genekeys.com for Rudd's material. No Shadow, Gift, or Siddhi text or names appear anywhere in it.

Privacy: birth data never leaves the device. All computation is client-side; there is no server, no account, no analytics, and no telemetry. Nothing is sent anywhere on its own: no network call after first load. The one exception is opt-in and per-event, the Google Calendar links in the export preview, which open only when clicked and carry that event's text in the URL. State lives in localStorage with JSON export and import.

IP: the app carries the same guardrail as the dataset. Gene keys are referenced by number only. The city list for timezone lookup is a vendored GeoNames extract (CC BY 4.0, attribution in `app/vendor/cities/`).

## What's not here

- Rudd's text. The Shadow, Gift, and Siddhi descriptions are his work. This repo does not republish them.
- Birth-chart computation in the dataset. `data/` and `examples/` stay ephemeris-free: `gate_transit.py` carries a low-precision solar helper only to make the wheel lookup runnable, and `gate_windows.py` takes positions from the caller. Chart computation lives in exactly one place, the client-side `app/`, which vendors its own ephemeris; anything beyond it (arc-second work, research pipelines) belongs downstream with Swiss Ephemeris or equivalent.
- Personal birth data. No chart, no birth moment, no individual belongs in this repo, including in a test fixture. `CONTRIBUTING.md` says so and the selftests hold to it: `gate_transit.py` checks the wheel's anchor, all 64 arc midpoints, the six line divisions, and the solar series against the J2000.0 epoch, while `gate_windows.py` checks synthetic bodies with known motion.
- Personal profiles. The repo is for the system, not for individuals.

## v0 status

This is a first build. The structure is honest and the substance is partial. The hexagram entries carry IDs 1 through 64, the invariant fields (line count, frequencies), the I Ching / Human Design cross-references (filled with confidence since all three systems share King Wen numbering), and pinyin transliterations (factual romanization of ancient Chinese, public domain). All three sequences are filled (the Venus and Pearl derivations against Gene Keys Publishing's official derivation document, 2026-07-01). The canonical Gene Keys `name` field stays null pending Gene Keys Publishing's blessing (see `CONTRIBUTING.md`). Programming partners are filled: each hexagram pairs with its line-inverted opposite, computed from the trigram structure and matching the published list exactly (2026-07-01). Codons, amino acids, and codon rings are `null`, waiting for canonical contribution. Validation passes against the schemas today, which is the only correctness claim v0 makes.

## License

- Data files: [CC0 1.0 Universal](LICENSE.md). Public-domain dedication.
- Code: [MIT](LICENSE.md).

## Acknowledgments

The Gene Keys system is Richard Rudd's work, published through Gene Keys Publishing (genekeys.com). This dataset honors that authorship by structuring the substrate without reproducing the content.
