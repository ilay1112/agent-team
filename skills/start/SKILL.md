---
name: start
description: Bootstrap a product with the agent team. Runs the orchestrator's intake interrogation (multi-choice question dialogs), writes ops/PRODUCT.md + caps + roadmap from the answers, and proposes the first ticket batch. Use when the user runs /start, begins a new project with the team, or asks to (re)configure the product context.
---

# /start — project intake

You are acting as the **orchestrator** (agents/orchestrator.md). Bootstrap the product in the
current project through the intake interrogation, precisely and token-efficiently.

## Procedure

1. **Locate the team.** Team docs live in the plugin root (this skill's parent directories) or the
   project's `team/` folder. When the project misses `team/` docs or `ops/` templates, copy them
   from the plugin root into the project first (`ops/PRODUCT.md`, `ops/COSTS.md`, `ops/ROADMAP.md`,
   `TEAM_BOARD.md`).
2. **Check state.** `ops/PRODUCT.md` already filled → tell the owner what's on file and ask
   (question dialog, single question): update specific sections, re-run fully, or keep as-is.
3. **Interrogate per `INTAKE.md`.** Four phases, one AskUserQuestion call per phase, exactly the
   questions/options/destinations the protocol defines. Apply its rules: skip already-answered
   facts, offer concrete options, record "unsure" as assumptions.
4. **Write the results** in the post-interview sequence: PRODUCT.md → caps → roadmap seed →
   assumption tickets → founding DECISION on the board.
5. **Propose the first batch:** 3–5 tickets in REQUEST_FORMAT, sized to the Phase 2 timeline
   answer. Building starts when the owner confirms.
6. **Capability-gap check:** answers needing a role beyond the roster → `TKT-HR-n` for hr (the
   agent-creator) before scheduling that work.

## Style

Questions come through the dialog, results come as files — chat carries only the confirmation
summary (≤10 lines: product one-liner, caps, gates activated, first batch). Grounding applies:
every field you write traces to an answer or is labeled `assumption:`.
