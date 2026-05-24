# gene-keys-data

An open, structural dataset for the 64 Gene Keys.

## What this is

The Gene Keys, Richard Rudd's contemplative system built on the I Ching, the human genetic code, and the Human Design lineage, are usually encountered as text. 64 hexagrams, three frequencies each (Shadow, Gift, Siddhi), three sequences (Activation, Venus, Pearl). The text is Rudd's intellectual property and stays his.

What is not his is the *structure*: 64 positions, six lines per position, three frequencies per line, codon-to-hexagram mappings derived from the universal genetic code, cross-reference to I Ching and Human Design numbering, programming-partner pairs, codon ring groupings. Those are facts of the substrate. They belong to whoever wants to work with them.

This repo holds the structure as data files, with JSON Schemas, in formats a data scientist can load, query, and join. The proprietary content is referenced (by ID) and not republished.

## Who this is for

People who want to do data work with the Gene Keys. Chart co-occurrence regressions, transit pattern studies, longitudinal hexagram tracking across a community, anything where the system needs to be data rather than prose.

The repo exists because a conversation surfaced a regression on a roughly one-million-profile dataset that produced co-occurrence frequencies near .005 for chart-cross-profile triples. The work was done in private files. There was nowhere public to point at for someone else who wanted to run a similar analysis.

## What's here

- `data/hexagrams.json` — 64 hexagram entries with structural fields. `i_ching_number` and `human_design_gate` are filled (both equal `id`, since Gene Keys, the King Wen I Ching sequence, and Human Design gates share the same 64-position numbering). Names, codons, amino acids, programming-partner pairs, and codon-ring assignments are `null` pending canonical contribution; see `CONTRIBUTING.md`.
- `data/sequences/activation.json` — the four-sphere Activation Sequence (Life's Work, Evolution, Radiance, Purpose) with astronomical derivations.
- `data/sequences/README.md` — status of the Venus and Pearl sequences, pending canonical verification.
- `schemas/hexagram.schema.json` — JSON Schema validating each hexagram entry.
- `schemas/sequence.schema.json` — JSON Schema validating any sequence file.
- `examples/load_hexagrams.py` — minimal loader that prints fill-rate statistics.
- `examples/cooccurrence_skeleton.py` — structural sketch of a chart co-occurrence frequency table. Reads a `profiles.csv` and prints the top signatures by frequency; the regression work that produced the .005 baseline lives downstream of this skeleton.
- `examples/validate.py` — validates all data files against their schemas. Run before any PR.
- `viewer/index.html` — single-file vanilla-JS viewer for the hexagram data. No build step. Run `python -m http.server` from the project root and visit `/viewer/`.

## What's not here

- Rudd's text. The Shadow, Gift, and Siddhi descriptions are his work. This repo does not republish them.
- Birth-chart computation. Calculating someone's spheres from their birth data is downstream of this dataset; Swiss Ephemeris and adjacent libraries handle that. This repo is the substrate.
- Personal profiles. The repo is for the system, not for individuals.

## v0 status

This is a first build. The structure is honest and the substance is partial. The hexagram entries carry IDs 1 through 64, the invariant fields (line count, frequencies), and the I Ching / Human Design cross-references (filled with confidence since all three systems share King Wen numbering). The Activation Sequence is filled. Names, codons, amino acids, programming-partner pairs, codon rings, and the Venus and Pearl sequences are `null` or forthcoming, waiting for canonical contribution. Validation passes against the schemas today, which is the only correctness claim v0 makes.

## License

- Data files: [CC0 1.0 Universal](LICENSE.md). Public-domain dedication.
- Code: [MIT](LICENSE.md).

## Acknowledgments

The Gene Keys system is Richard Rudd's work, published through Gene Keys Publishing (genekeys.com). This dataset honors that authorship by structuring the substrate without reproducing the content.
