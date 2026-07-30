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

The plugin ships all 19 agents (`agents/`), three commands (`/start`, `/ticket`, `/standup`), and the
enforcement hooks (`hooks/`). Then, in any project:

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

## Day-to-day: three commands

| Command | Use |
| ------- | --- |
| `/start` | Once per product — intake interrogation, writes `ops/PRODUCT.md` + caps + roadmap, proposes the first batch. |
| `/ticket <one line>` | Any time you notice work. One sentence in; the orchestrator resolves `WHERE` pointers by searching the repo, drafts the full `REQUEST_FORMAT` ticket, assigns owner + gates, and shows it for a single yes/no. |
| `/standup` | What's stuck, across **every** deployment — non-terminal tickets with age, unowned follow-ups, stale handoffs, boards over budget, gates awaiting a verdict. |

`/ticket` exists because filing, not building, is where work dies: across four live deployments every
stalled item stalled *before a ticket existed*. `/standup` exists because a ticket in a repo nobody
opens is invisible — it turns the team into something that reports to you instead of an inbox you have
to remember to open. Wire it into a daily routine with
`node scripts/standup.js --out ~/.claude/agent-team/standup.md`.

## Enforcement (why the rules hold this time)

The gate chain — validators with real BLOCK authority plus a supervisor goal-conformance gate — is the
part that consistently works: it catches allowlist bypasses, tenant-isolation gaps, fake rewards,
a11y regressions and untyped timeouts, in-batch, with a delta re-verify. It is untouched.

Everything that depended on *sustained discipline* decayed instead: entry length, the fixed entry
block, the weekly archive sweep, handoff freshness, chasing aged tickets. All of those are
deterministically checkable, so `hooks/hooks.json` now checks them (WORKFLOW §13):

- **`SessionStart`** — runs re-anchor steps 1-2 for free (branch, HEAD, tree state, handoff,
  health-check command) and warns on tickets past their age SLA, unowned rows, stale handoffs and
  oversized boards.
- **board writes** — entry format, `**Status:**` on-enum, ≤80-word body, board size budget.
- **`git merge` / `gh pr merge`** — every required gate `CLEAR` and supervisor `MEETS` for the
  branch's ticket, read off the board.
- **`Stop`** — working tree clean, handoff overwritten, no placeholders left behind.

Hooks **fail open**: they exit 0 always and stay entirely silent in any repo without
`ops/PRODUCT.md`, so the plugin is inert in unrelated sessions. They ship in `warn` mode; promote a
check to `block` per-repo in `.claude/agent-team.json` once its noise is tuned. Verify the layer
yourself with `node hooks/test/run-tests.js` (70 assertions; requires Node 18+).

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
- `skills/start/`, `skills/ticket/`, `skills/standup/` — the three commands.
- `hooks/` — enforcement layer (`hooks.json` + Node scripts + `test/run-tests.js`).
- `scripts/standup.js` — cross-repo status collector (deterministic; `--json`, `--out`).
- `.claude-plugin/` — plugin + marketplace manifests.
- `TEAM_BOARD.md` — delivery board: engineering ticket index + threaded entries + decisions log.
- `boards/GROWTH_BOARD.md` — growth board: MKT/SEO tickets + experiment log.
- `boards/OPS_BOARD.md` — ops board: BIZ/HR tickets (finance, vendors, workforce).
- `REQUEST_FORMAT.md` — the compact, pointer-based request schema (token minimizing).
- `TOKEN_POLICY.md` — cache-friendly ordering, batch routing, read budgets, model tiers.
- `SKILLS_MANIFEST.md` — per-role skill packs, install commands, and the installation protocol
  (orchestrator installs per batch; installs require closing and reopening Claude Code).
- `ops/PRODUCT.md` — product context (the one mutable per-product doc).
- `ops/PROGRESS.md` — live handoff + session log: the bridge every fresh context window re-anchors on.
- `ops/PRECEDENTS.md` — case law: gate rulings that bind future tickets, so no product re-learns them.
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

## Learning (why a lesson is learned once)

A gate verdict that establishes a binding rule goes in `ops/PRECEDENTS.md` — one line, written with
the sign-off. Gates read their section before ruling, so settled cases stop being re-argued; `hr`
promotes any precedent that holds across two products upstream into these process docs at a cache
epoch. Without that ladder each product pays full price to re-learn the same design case law, which is
exactly what happened before this file existed. Handoffs get overwritten and board threads get
archived; precedents outlive both by design.
