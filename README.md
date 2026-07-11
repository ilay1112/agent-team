# Agent Team — reusable corporate dev org (template)

A product-agnostic agent company: an engineering org + business office that builds and sustains a
profitable software product (web, iOS, Android, Windows, macOS) with minimal token spend. Copy this
folder into a product, fill `ops/PRODUCT.md`, and the team runs.

## Install on any machine (plugin)

This folder is a Claude Code **plugin** (`.claude-plugin/plugin.json` + `marketplace.json`). Once
pushed to a git repo (e.g. `<you>/agent-team`), any machine running Claude Code installs it with:

```
/plugin marketplace add <you>/agent-team
/plugin install agent-team@agent-team-marketplace
```

The plugin ships all 19 agents (`agents/`) and the `/start` skill (`skills/start/`). Then, in any
project:

```
/start
```

The orchestrator interrogates you about the product per `INTAKE.md` — multi-choice question
dialogs covering business model, platforms, scope, data sensitivity, compliance, budget caps,
success metrics, validation status, distribution channel, and how involved you want to be — writes
`ops/PRODUCT.md` + cost caps + roadmap seed from your answers, sets the lifecycle stage, installs
the skill packs your first batch needs (then asks you to **close and reopen Claude Code** so they
load), and proposes the first ticket batch. Precise answers up front = fewer guesses and fewer
tokens later.

## Manual deploy (alternative)

1. Copy this whole folder into the product repo as `team/`.
2. Copy (or symlink) `team/agents/*.md` → `<repo>/.claude/agents/` so Claude Code loads them as subagents.
3. Install the skill packs from `SKILLS_MANIFEST.md` (one-time marketplace adds).
4. Run `/start` (or fill `ops/PRODUCT.md` by hand — it is the ONLY product-specific file agents
   read; agent defs stay identical across products, keeping their prompts cache-stable).
5. Talk to the **orchestrator** using `REQUEST_FORMAT.md`. Everything else is autonomous.

## Org chart

| Layer      | Agent                                                                                                                                      | Model  | Mandate                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------- |
| Executive  | `product-manager`                                                                                                                          | sonnet | Vision, backlog priority by revenue impact, specs     |
|            | `coo`                                                                                                                                      | haiku  | Operating cadence, board hygiene, SLAs, unblocking    |
|            | `cfo`                                                                                                                                      | haiku  | Cost ledger, budget caps, vendor/subscription control |
|            | `hr`                                                                                                                                       | sonnet | Workforce development: scouts new models/skills/tools, reviews agent performance, ships definition upgrades at cache epochs |
| Delivery   | `orchestrator`                                                                                                                             | opus   | Triage, assignment, batch routing, gate enforcement   |
|            | `supervisor`                                                                                                                               | opus   | Final gate: delivered code meets the request GOAL     |
| Build      | `backend-platform` `web-developer` (= frontend engineer for web) `apple-developer` (iOS+macOS) `android-developer` `windows-developer` `devops-engineer` `design-expert` | sonnet | Implement                                             |
| Validation | `qa-validator` `performance-validator` `cost-validator`                                                                                    | haiku  | Per-ticket gates                                      |
|            | `security-validator`                                                                                                                       | sonnet | Blocking security gate (high-stakes → stronger model) |
| Growth     | `seo-specialist`                                                                                                                           | sonnet | Organic acquisition: SEO + AI answer engines (AEO/GEO), blocking gate on indexing changes |
|            | `marketing`                                                                                                                                | haiku  | Positioning, launch, ASO, changelog→announcement      |

**Frontend coverage:** each client platform's frontend belongs to its platform owner —
`web-developer` is the frontend engineer for everything browser-based (React app + marketing site),
`apple-developer`/`android-developer`/`windows-developer` own their native UIs, and `design-expert`
holds the cross-platform design system, UX specs, and the blocking UI gate.

## Files

- `WORKFLOW.md` — ticket lifecycle, delivery paths, gates, release, grounding (§11), session harness (§12).
- `HARNESS.md` — context lifecycle: session model (initializer/coordinator/worker), re-anchor and
  clean-state contracts, context recycling rules, the goal-re-injection delivery loop, memory hierarchy.
- `LIFECYCLE.md` — idea→profit stages (Validate→Build→Launch→Monetize→Grow), stage gates, and the
  recurring owner-sync pulse that keeps you and the team aligned.
- `INTAKE.md` — the /start interrogation: question bank mapped to PRODUCT.md/COSTS.md fields.
- `skills/start/` — the /start skill; `.claude-plugin/` — plugin + marketplace manifests.
- `TEAM_BOARD.md` — delivery board: engineering ticket index + threaded entries + decisions log.
- `boards/GROWTH_BOARD.md` — growth board: MKT/SEO tickets + experiment log.
- `boards/OPS_BOARD.md` — ops board: BIZ/HR tickets (finance, vendors, workforce).
- `REQUEST_FORMAT.md` — the compact, pointer-based request schema (token minimizing).
- `TOKEN_POLICY.md` — cache-friendly ordering, batch routing, read budgets, model tiers.
- `SKILLS_MANIFEST.md` — per-role skill packs, install commands, and the installation protocol
  (orchestrator installs per batch; installs require closing and reopening Claude Code).
- `ops/PRODUCT.md` — product context (the one mutable per-product doc).
- `ops/PROGRESS.md` — live handoff + session log: the bridge every fresh context window re-anchors on.
- `ops/COSTS.md` — CFO ledger: every recurring cost, caps, kill switches.
- `ops/ROADMAP.md` — PM priorities.
- `agents/*.md` — 19 subagent definitions.

## Idea → profit (why this is a company, not a code generator)

The team runs the whole business lifecycle, not just the build: validation before code (landing
page + interviews before features), distribution as a first-class workstream (SEO + marketing
lanes from day one), charging early, and churn discipline once revenue exists. `LIFECYCLE.md`
holds the stage model; the owner moves the product between stages at evidence-based stage gates,
and the orchestrator's periodic **owner pulse** (AskUserQuestion sync every batch/week) keeps the
roadmap, budget, and your intent aligned — the team never drifts unsupervised.

## Harness (why long work survives short context windows)

Every session is disposable; state lives in files. Sessions start with a fixed re-anchor
(`git log` → `ops/PROGRESS.md` handoff → health check) and end at a boundary in clean state
(committed, boards current, handoff overwritten). Workers run in fresh context windows and return
condensed HANDOFFs — raw exploration never pollutes the coordinator. When a window fills or a batch
closes, the coordinator recycles: write the handoff, restart the session, continue identically —
the delivery loop re-injects each ticket's GOAL from durable state, so **the loop outlives any
single context window**. Full protocol: `HARNESS.md`.

## Token economy (why this is cheap to run)

Agent prompts are short and static; product specifics live in `ops/PRODUCT.md`; volatile state lives
at the END of every context (ticket, board excerpt) so cached prefixes survive. Requests are pointers,
not prose. Work is dispatched in per-owner batches. Cheap models do routine gates; expensive models
appear exactly twice (orchestrator, supervisor). Full rules: `TOKEN_POLICY.md`.

## Reliability (why outputs stay grounded)

Every claim ships with its evidence (`path:line` read, command run, source cited); unverified
statements are labeled and converted to questions; work maps to ACCEPT bullets and owners re-anchor
on the ticket GOAL before every handoff. Full protocol: `WORKFLOW.md` §11.
