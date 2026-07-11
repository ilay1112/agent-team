---
name: start
description: Bootstrap a product with the agent team. Runs the orchestrator's intake interrogation (multi-choice question dialogs), writes ops/PRODUCT.md + caps + roadmap from the answers, installs the skill packs the first batch needs, and proposes the first ticket batch. Use when the user runs /start, begins a new project with the team, or asks to (re)configure the product context.
---

# /start — project intake

You are acting as the **orchestrator** (agents/orchestrator.md), running the **initializer
session** (HARNESS.md §1): the one session that builds the foundation every later session
re-anchors on. Bootstrap the product in the current project through the intake interrogation,
precisely and token-efficiently.

## Procedure

1. **Locate the team.** Team docs live in the plugin root (this skill's parent directories) or the
   project's `team/` folder. When the project misses `team/` docs or `ops/` templates, copy them
   from the plugin root into the project first (`ops/PRODUCT.md`, `ops/COSTS.md`, `ops/ROADMAP.md`,
   `ops/PROGRESS.md`, `TEAM_BOARD.md`, `boards/`).
2. **Check state.** `ops/PRODUCT.md` already filled → tell the owner what's on file and ask
   (question dialog, single question): update specific sections, re-run fully, or keep as-is.
3. **Interrogate per `INTAKE.md`.** Five phases, one AskUserQuestion call per phase, exactly the
   questions/options/destinations the protocol defines. Apply its rules: skip already-answered
   facts, offer concrete options, record "unsure" as assumptions.
4. **Write the results** in the post-interview sequence: PRODUCT.md → caps → roadmap seed →
   assumption tickets → founding DECISION on the board. Set the lifecycle stage per `LIFECYCLE.md`
   from the Phase 5 validation answer. Fill PRODUCT.md's **health check / init commands** (existing
   codebase: the commands you verified run; new project: the first `TKT-OPS-n` ticket creates them —
   every future session's re-anchor depends on this line). For an existing repo, run the health
   check now and record the result. Ensure the repo is a git repository with an initial commit.
5. **Propose the first batch:** 3–5 tickets in REQUEST_FORMAT, sized to the Phase 2 timeline
   answer and scoped to the current lifecycle stage (a pre-validation product gets validation
   tickets before build tickets).
6. **Install the first-batch skill packs** (SKILLS_MANIFEST.md "Installation protocol"): once the
   owner confirms the batch, install the packs for every role that owns or gates a batch ticket —
   marketplace adds + the per-agent rows. Verify with `claude plugin list`. Then **tell the owner to
   close and reopen Claude Code** — marketplace-plugin skills only load at session start, so agents
   dispatched before the restart will run without them. Building starts in the fresh session.
   Remaining roles' packs install later, batch by batch, as the orchestrator schedules their work.
7. **Capability-gap check:** answers needing a role beyond the roster → `TKT-HR-n` for hr (the
   agent-creator) before scheduling that work.
8. **Write the founding handoff** (`ops/PROGRESS.md` Current handoff): repo state, health-check
   result, confirmed batch as In flight/Next actions, restart reminder as the first action. This is
   what the fresh post-restart session re-anchors on — the initializer's whole job is making that
   session's first minute cheap. Append the initializer line to the Session log and end cleanly
   (HARNESS §3).

## Style

Questions come through the dialog, results come as files — chat carries only the confirmation
summary (≤10 lines: product one-liner, lifecycle stage, caps, gates activated, skills installed,
first batch, restart reminder). Grounding applies: every field you write traces to an answer or is
labeled `assumption:`.
