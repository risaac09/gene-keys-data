# Contributing

This dataset is structurally honest and substantively incomplete. The structure is solid; the substance needs canonical contribution from people who hold the system at depth.

## What needs canonical fill in v0

Each entry in `data/hexagrams.json` has these fields. Status of each:

| Field | Status |
|---|---|
| `id` | confident (1 to 64) |
| `line_count` | confident (always 6) |
| `frequencies` | confident (always `["shadow", "gift", "siddhi"]`) |
| `i_ching_number` | filled (equal to `id`; Gene Keys uses King Wen sequence) |
| `human_design_gate` | filled (equal to `id`; HD gates use the same 64-position King Wen numbering) |
| `name` | needs canonical fill |
| `codon` | needs canonical fill |
| `amino_acid` | needs canonical fill |
| `programming_partner_id` | needs canonical fill |
| `codon_ring_id` | needs canonical fill |

## Source guidance

- **Hexagram names.** The official Gene Keys Publishing list at genekeys.com. The names are descriptive, not proprietary phrasing, but cite the source in the PR.
- **Codon and amino acid mappings.** Cross-reference Rudd's *The Gene Keys* (2013) appendix material against canonical genetic code tables. The codon mapping follows the I Ching to DNA correspondence specific to the Gene Keys system; arbitrary genetic code tables do not produce the same mapping.
- **I Ching number cross-reference.** The King Wen sequence is the standard. Note whether the Gene Keys numbering follows King Wen directly or applies a transformation; cite the source.
- **Human Design gate cross-reference.** Standard mapping is GK number equals HD gate number. Verify against Jovian Archive before committing.
- **Programming partner pairs.** 32 pairs across the 64 hexagrams. Defined in the Gene Keys 21-day Activation course material and in *The Codon Rings* (Rudd, 2018).
- **Codon rings.** 22 rings, defined in *The Codon Rings* (Rudd, 2018).

## PR conventions

- One PR per data category. Do not mix hexagram names and codon assignments in the same PR.
- Include the source citation in the PR description.
- Install dependencies with `pip install -r requirements.txt`, then run `python examples/validate.py` before submitting. Validation must pass; CI runs the same check on every PR.
- If a value is contested across sources, open an issue first and resolve the contention before submitting data.

## What does not belong in PRs

- Shadow, Gift, or Siddhi text descriptions. That is Rudd's IP.
- Personal birth-chart data. The repo is for the system; individual charts go elsewhere.
- Astrological computation code. Use Swiss Ephemeris or equivalent in a separate project.

## Adding new data files

If you want to add a new structural file (a sequence, a transit cycle, an additional cross-reference), open an issue first describing:

- What the file holds
- The schema you propose
- Where the canonical source lives
- Why it belongs in this repo rather than a downstream one

Approved proposals become PRs that include both the data file and its schema.
