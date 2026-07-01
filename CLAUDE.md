# CLAUDE.md

## What this repo is
An open structural dataset for the 64 Gene Keys: positions, lines, frequencies, codon mappings, cross-references. Data CC0, code MIT.

## The one guardrail
Richard Rudd's text is proprietary IP. The Shadow, Gift, and Siddhi descriptions are his work; reference them by ID, never republish a passage, not even a sentence. The structure is the open part and the whole point. Keep the data/schema split as it stands: data files in `data/`, JSON Schemas in `schemas/`, `examples/validate.py` as the correctness gate.

## Routing
- Tier: none, a public dataset outside the personal stack. The spine is stack-data, Tier 1, the operational source of truth, a sibling clone (`../stack-data`).
- The six phase-zero trigger phrases work here through the deployed `.claude/` kit: "activate all agents", "engage global awareness", "refresh global awareness", "delegate to your orchestrator", "engage the orchestrator", "engage your orchestrator".
- Route research, citation, and lineage tasks to stack-data and its `research-bibliographer` agent.
- Session close is "log learnings"; it runs the retrospective from the kit.
