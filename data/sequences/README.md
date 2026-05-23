# sequences

The Gene Keys Hologenetic Profile traverses three sequences. Each sequence is an ordered set of spheres, where each sphere maps a specific birth-chart position to a hexagram for an individual person.

This directory holds the *structural* description of each sequence: how many spheres, in what order, and which astronomical position each sphere derives from. It does not hold any individual person's profile.

## Status

- `activation.json` — Activation Sequence, 4 spheres. Filled.
- `venus.json` — forthcoming. Venus Sequence is a 6-sphere arc covering relational and emotional development; exact sphere names and derivations vary across sources. Pending canonical verification before commit.
- `pearl.json` — forthcoming. Pearl Sequence concerns vocation, culture, and brand; spheres vary across sources. Pending canonical verification before commit.

If you can cite a canonical source for the Venus or Pearl sequence structure (Rudd's published material, Gene Keys Publishing official documentation), open an issue or a PR with the citation.

## Schema

All sequence files validate against `schemas/sequence.schema.json`.
