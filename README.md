# gene-keys-data

An open, structural dataset for the 64 Gene Keys.

## What this is

The Gene Keys, Richard Rudd's contemplative system built on the I Ching, the human genetic code, and the Human Design lineage, are usually encountered as text. 64 hexagrams, three frequencies each (Shadow, Gift, Siddhi), three sequences (Activation, Venus, Pearl). The text is Rudd's intellectual property and stays his.

What is not his is the *structure*: 64 positions, six lines per position, three frequencies per line, codon-to-hexagram mappings derived from the universal genetic code, cross-reference to I Ching and Human Design numbering, programming-partner pairs, codon ring groupings. Those are facts of the substrate. They belong to whoever wants to work with them.

This repo holds the structure as data files, with JSON Schemas, in formats a data scientist can load, query, and join. The proprietary content is referenced (by ID) and not republished.

## Who this is for

People who want to do data work with the Gene Keys. Chart co-occurrence regressions, transit pattern studies, longitudinal hexagram tracking across a community, anything where the system needs to be data rather than prose.

The repo exists because a conversation surfaced a regression on a roughly one-million-profile dataset that produced co-occurrence frequencies near .005 for chart-cross-profile triples. The work was done in private files. There was nowhere public to point at for someone else who wanted to run a similar analysis.

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
- `schemas/hexagram.schema.json` and `schemas/sequence.schema.json` — JSON Schemas. `examples/validate.py` runs schema + cross-entry invariant checks (id uniqueness, sphere-count match, position uniqueness) on every push and PR via GitHub Actions.
- `examples/load_hexagrams.py` — minimal loader that prints fill-rate statistics.
- `examples/cooccurrence_skeleton.py` — structural sketch of a chart co-occurrence frequency table. Reads `profiles.csv` and prints top signatures by frequency. Regression work that produced the .005 baseline lives downstream.
- `examples/generate_demo_profiles.py` + `examples/demo_profiles.csv` — seeded synthetic 100-profile dataset so the skeleton runs out of the box. Not real chart data.
- `examples/walkthrough.md` — clone-to-join walkthrough.
- `viewer/index.html` — table view. Sortable, filterable, click any row for a detail panel.
- `viewer/wheel.html` — circular visualization. 64 hexagrams in King Wen sequence, hover or click any position. Programming-partner chords render when those fields fill.
- `viewer/graph.html` — 8×8 lattice with toggle overlays for programming partners, codon rings, and the King Wen sequence path.
- `viewer/calculator.html` — in-browser co-occurrence frequency tool. Paste a CSV (or load the sample), see the long-tail distribution and the expected uniform baseline.
- The four viewer pages share top navigation. Single-file vanilla JS, no build step.

## What's not here

- Rudd's text. The Shadow, Gift, and Siddhi descriptions are his work. This repo does not republish them.
- Birth-chart computation. Calculating someone's spheres from their birth data is downstream of this dataset; Swiss Ephemeris and adjacent libraries handle that. This repo is the substrate.
- Personal profiles. The repo is for the system, not for individuals.

## v0 status

This is a first build. The structure is honest and the substance is partial. The hexagram entries carry IDs 1 through 64, the invariant fields (line count, frequencies), the I Ching / Human Design cross-references (filled with confidence since all three systems share King Wen numbering), and pinyin transliterations (factual romanization of ancient Chinese, public domain). All three sequences are filled (the Venus and Pearl derivations against Gene Keys Publishing's official derivation document, 2026-07-01). The canonical Gene Keys `name` field stays null pending Gene Keys Publishing's blessing (see `CONTRIBUTING.md`). Programming partners are filled: each hexagram pairs with its line-inverted opposite, computed from the trigram structure and matching the published list exactly (2026-07-01). Codons, amino acids, and codon rings are `null`, waiting for canonical contribution. Validation passes against the schemas today, which is the only correctness claim v0 makes.

## License

- Data files: [CC0 1.0 Universal](LICENSE.md). Public-domain dedication.
- Code: [MIT](LICENSE.md).

## Acknowledgments

The Gene Keys system is Richard Rudd's work, published through Gene Keys Publishing (genekeys.com). This dataset honors that authorship by structuring the substrate without reproducing the content.
