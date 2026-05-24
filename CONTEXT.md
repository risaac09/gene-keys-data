# Context

This repo exists because of a conversation with you, Justin.

You'd run a regression against a roughly one-million-profile dataset and found co-occurrence frequencies near .005 for chart-cross-profile triples. Roughly one in one hundred thousand for the surface combination. The work lived in private files. There was nowhere public to point at for anyone who wanted to do similar work.

This repo is the substrate that conversation was missing.

## Your work and this repo

The pieces that are yours, not here:

- The profile dataset. Yours, and not ours to publish.
- The regression machinery downstream of the frequency table in `examples/cooccurrence_skeleton.py`. The skeleton stops at the count.
- The interpretation of the .005 finding. This holds the join target; the meaning is yours.

What's here is the structural layer you didn't have to build from scratch and didn't want to publish piecemeal: 64 hexagram entries with the I Ching and Human Design cross-references filled, pinyin names so the records are human-recognizable, a JSON Schema that enforces shape and a validator that catches duplicate IDs, the four-sphere Activation Sequence, a viewer for browsing, a frequency-table skeleton that runs against a demo CSV out of the box, CI on every push.

## Where to start

Read `examples/walkthrough.md` first. It walks from clone to the join pattern in six short cells.

Then `viewer/index.html` (serve via `python -m http.server`, visit `/viewer/`) for a quick interactive browse of the 64.

Then `examples/cooccurrence_skeleton.py examples/demo_profiles.csv` to see the skeleton run against synthetic data. Swap the demo CSV for yours when you're ready.

## What this isn't

Not a port of your analysis. Not a claim about the .005 finding. Not a competing artifact. It's the open substrate so the next person doing similar work doesn't have to rebuild the structural layer.

Rudd's text stays Rudd's. Your chart data stays yours. The structure between them is here, under CC0.

## What I'd like back

Nothing required. If something here is wrong, open an issue or a PR. If you publish anything that uses this, a citation back is generous, not obligatory. If the structure is useful and you want to push it further, the codon mapping and the Venus/Pearl sequences are the next canonical fills (see `CONTRIBUTING.md`).

If none of the above, that's fine too. This was worth building either way.

— Isaac
