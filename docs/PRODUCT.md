# gene-keys-data

An open structural dataset for the 64 Gene Keys: positions, lines, frequencies, I Ching and Human Design cross-references, and the three sequence derivations, published so data workers can run chart co-occurrence and similar analyses without rebuilding the substrate. Data and schemas are CC0, code is MIT, and Richard Rudd's Shadow, Gift, and Siddhi text is referenced by ID only, never republished. In the estate this repo carries no tier. It is a public dataset outside the personal stack; the spine is stack-data, Tier 1, the operational source of truth, a sibling clone at `../stack-data`.

This file is the map of the repo's documentation plus the connective tissue the other docs do not hold: the consolidated status ledger, the viewer internals, the release record, and the full workflow inventory.

## What it is (technical)

Flat JSON in `data/`, JSON Schemas in `schemas/`, `examples/validate.py` as the correctness gate. That split is a standing guardrail (`CLAUDE.md`). The README's "What's here" section maps every file, the two schemas carry field-by-field descriptions and are the de facto data-shape reference, and `examples/walkthrough.md` shows the record shapes and the join pattern in runnable steps. Start there.

What no other doc covers, the viewer internals. Four single-file vanilla JS pages under `viewer/`, roughly 1,100 lines total, sharing a common top navigation, no build step, all reading `data/hexagrams.json` directly:

- `index.html`: sortable, filterable table with a click-through detail panel.
- `wheel.html`: the 64 hexagrams on a King Wen circle. Programming-partner chords render only when `programming_partner_id` fills; until then the overlay is dormant.
- `graph.html`: 8x8 lattice with toggle overlays for programming partners, codon rings, and the King Wen path. The partner and ring overlays stay dormant until `programming_partner_id` and `codon_ring_id` fill.
- `calculator.html`: in-browser co-occurrence frequency tool over a pasted CSV, with the sample dataset loadable.

Serve locally with `python -m http.server`, then visit `/viewer/`. No deploy target exists for the viewer.

## How it runs (operational)

The README Quickstart covers clone, `pip install -r requirements.txt`, `validate.py`, and the local viewer server. `CONTRIBUTING.md` holds the PR conventions. The full inventory of automated and manual workflows is the Workflows section below.

Release record, from git history, since no CHANGELOG exists:

- v0.1: structural skeleton with viewer (`f829d29`).
- v0.2: cross-entry invariants, CI, honest example naming (`c17ed3b`).
- v0.3: interactive environment, CONTEXT, walkthrough, demo data, pinyin, multi-view viewer (`5386e34`).
- 2026-07-01: Venus and Pearl sequences filled from the official derivation document (`220daa0`).

Gap: no CHANGELOG file; the release record above lives in git history only, and future releases should extend this dated list or a dedicated CHANGELOG.

## Why it exists (intellectual)

`CONTEXT.md` is the origin document, a letter to Justin Taylor, whose regression over roughly one million profiles produced co-occurrence frequencies near .005 and left nowhere public to point a second analyst at. It states what is his, what is Rudd's, and what lives here. The README's "What this is" section argues the structure/content split: the text is Rudd's IP and stays his, the structural facts of the substrate belong to whoever works with them. `data/sequences/README.md` records the reasoning behind the sequence structure, including why Venus carries five spheres and why Brand duplicates Life's Work, with the canonical source named. Note that `CONTEXT.md` predates the 2026-07-01 sequence fill; see Known drift.

## How it works (methodological)

`CONTRIBUTING.md` is the complete method statement for canonical fill: the field-status table, source guidance per field (Rudd's *The Gene Keys* 2013 appendix, *The Codon Rings* 2018, Jovian Archive verification for HD gates), the contested-value protocol (open an issue first), and the new-file proposal process. `data/sequences/README.md` documents the derivation method used for the 2026-07-01 fill: the official Gene Keys Publishing document cross-checked against three independent references. `examples/walkthrough.md` demonstrates the analysis method, a frequency table followed by observed-versus-expected under independence, which is where the .005 finding becomes interpretable. `LICENSE.md` explains the dual-license reasoning as the method for holding the open/proprietary boundary.

## How it speaks (marketing and comms)

A CC0 dataset with no funnel, no pricing, and no comms cadence, so most of this dimension does not apply. The whole appropriate surface exists already: the README's "Who this is for" names the audience (people doing data work with the system) and the positioning (the open substrate, with chart calculation and Rudd's content both living elsewhere), and the Acknowledgments section states the reputational stance toward Rudd's authorship. `CONTEXT.md` is the founding comms artifact, written to an audience of one. Estate voice rules apply to any copy written here. If the site at rubinsteinproductions.com ever links this repo, that linkage belongs in that repo's docs.

## Where it goes (strategic)

Consolidated fill ledger. This is the single current-status source; README "v0 status", the CONTRIBUTING table, and `data/sequences/README.md` each carry a partial copy that updates at its own speed.

| Item | State | Source |
|---|---|---|
| `id`, `line_count`, `frequencies` | filled, invariant | structure itself |
| `i_ching_number`, `human_design_gate` | filled 64/64 | shared King Wen numbering, Jovian Archive verification per CONTRIBUTING.md |
| `i_ching_name_pinyin` | filled 64/64 | public-domain transliteration |
| `name` | null, held | awaits Gene Keys Publishing permission (CONTRIBUTING.md) |
| `codon`, `amino_acid` | null | needs canonical fill from Rudd 2013 appendix plus genetic code tables |
| `programming_partner_id` | null | needs canonical fill from *The Codon Rings* (2018) |
| `codon_ring_id` | null | needs canonical fill from *The Codon Rings* (2018) |
| `sequences/activation.json` | filled at v0 | astronomical derivations |
| `sequences/venus.json`, `sequences/pearl.json` | filled 2026-07-01 | Gene Keys Publishing derivation document, cited in data/sequences/README.md |

Open decisions:

- The `name` field permission path with Gene Keys Publishing. CONTRIBUTING.md names the condition.
  Gap: no issue or dated record tracks whether a permission request to Gene Keys Publishing has been made or answered; the answer would come from Isaac or from an issue opened on the repo.
- The codon and amino-acid fill, the programming partners, and the codon rings, each waiting on a contributor working from the sources CONTRIBUTING.md names.
- What constitutes v1.
  Gap: no stated trigger for calling the dataset v1; the decision is Isaac's, and a plausible shape (every canonical field filled with citations, or explicitly declared permanently null) sits in the audit outline awaiting his ruling.
- Hosting for the viewer.
  Gap: no deploy target is documented for the four viewer pages; whether they ever get published (GitHub Pages or otherwise) is an undecided call for Isaac.

## Workflows

Automated:

- `.github/workflows/validate.yml`, on push to main and on every PR: `pip install -r requirements.txt`, then `python examples/validate.py`. Runs JSON Schema validation plus cross-entry invariants (unique ids, sphere-count match, unique sphere positions) over `hexagrams.json` and the three sequence files. No secrets.
- `.claude/settings.json` UserPromptSubmit hook, `.claude/hooks/phase-zero-trigger.sh`: injects the phase-zero awareness core on the six trigger phrases and the retrospective prompt on "log learnings", "retro this chat", or "session retrospective". No secrets.

Manual:

- `python examples/validate.py` before every commit and PR. Good looks like one OK line per validated file (four files today: hexagrams plus the three sequences). CI runs the identical check.
- `python -m http.server`, then `/viewer/`, whenever a data or viewer change needs eyeballing. Good looks like all four pages loading and the table reflecting the data.
- `python examples/load_hexagrams.py` after any data change, for a fill-rate snapshot.
- `python examples/generate_demo_profiles.py` when the demo CSV needs regenerating; the output is seeded, so a clean run reproduces `examples/demo_profiles.csv`.
- Canonical-fill SOP (CONTRIBUTING.md): one PR per data category, citation in the PR description, contested values go to an issue before any data lands.
- Kit redeploy ritual: files under `.claude/` are installed from `rubinstein-productions-toolkit/phase-zero/install.sh` and are never edited in place here; edit the kit source and redeploy. This rule lived only in the hook header and the toolkit's CLAUDE.md before this doc.
- Session close: "log learnings" runs the retrospective from the kit and logs via stack-data's `sd-retro`.

## Known drift

Found by audit on 2026-07-02, listed for Isaac to rule on, not fixed here:

- `CONTEXT.md` line 35 still says the codon mapping and the Venus/Pearl sequences are the next canonical fills; Venus and Pearl were filled 2026-07-01. Line 17 likewise describes only the four-sphere Activation Sequence and a viewer. A dated postscript would keep the letter honest without rewriting it.
- `examples/walkthrough.md` step 0 says "Two OK lines means schema + cross-entry invariants pass"; validate.py now checks four files and prints four OK lines.
- `LICENSE.md` scopes the MIT clause to "everything under `examples/`"; the four `viewer/` pages fall under neither the data clause nor the code clause, while README line 60 says "Code: MIT" generally.
- `schemas/hexagram.schema.json` descriptions for `i_ching_number` and `human_design_gate` still read "Null until contributed"; both are filled 64/64.
- `CLAUDE.md` line 4 says the repo holds "codon mappings"; every codon, amino_acid, programming_partner_id, and codon_ring_id value is currently null. Minor: it describes intended scope as present content.
