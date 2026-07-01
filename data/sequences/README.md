# sequences

The Gene Keys Hologenetic Profile traverses three sequences. Each sequence is an ordered set of spheres, where each sphere maps a specific birth-chart position to a hexagram for an individual person.

This directory holds the *structural* description of each sequence: how many spheres, in what order, and which astronomical position each sphere derives from. It does not hold any individual person's profile.

## Status

- `activation.json` — Activation Sequence, 4 spheres. Filled.
- `venus.json` — Venus Sequence, 5 spheres. Filled 2026-07-01 from the canonical source below.
- `pearl.json` — Pearl Sequence, 4 spheres. Filled 2026-07-01 from the canonical source below.

## Canonical source for the Venus and Pearl derivations

Gene Keys Publishing's official support document "What planets does each Sphere of the Golden Path Profile correlate to?" (genekeys.com/docs/what-planets-does-each-sphere-of-the-golden-path-profile-correlate-to/), cross-checked against three independent references that state the same mapping. Notes on the structure:

- "Personality" means the natal calculation (at birth); "Design" means the pre-natal calculation (the Sun at 88 degrees of solar arc before birth). Same convention as Human Design.
- The Core sphere (Venus Sequence) and the Vocation sphere (Pearl Sequence) derive from the same position, Design Mars; the official document lists them as one entry, "Core / Vocation".
- The Brand sphere derives from the Personality Sun, so it always carries the same hexagram as Life's Work in the Activation Sequence.
- Some presentations draw the Venus Sequence as a six-sphere arc by including Purpose (Design Earth) as its entry point; Purpose belongs to the Activation Sequence here, and the five spheres above are the ones the official derivation document assigns to the Venus Sequence.

## Schema

All sequence files validate against `schemas/sequence.schema.json`.
