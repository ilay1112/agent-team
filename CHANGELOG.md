# Changelog

Notable changes to the agent-team plugin. Versions are cache epochs (TOKEN_POLICY §1): shared-doc and
agent-definition edits batch into a release rather than landing mid-sprint.

## 1.3.0 — 2026-07-30

Audit of v1.2.0 against four live deployments (`second-brain`, `FinFlow`, `cliny-platform`,
`insurapp`) found the prompts strong and the **mechanics advisory**: the gate chain held, and every
rule requiring sustained discipline decayed. This release makes the deterministic half mechanical.

### Added

- **`hooks/` — the process enforces itself.** `hooks.json` plus four Node hooks, auto-loaded by
  Claude Code (WORKFLOW §13):
  - `SessionStart` runs re-anchor steps 1-2 and injects repo state, the handoff block and the
    health-check command; warns on tickets past their age SLA, unowned rows, stale handoffs and
    oversized boards.
  - `PostToolUse` on board writes lints entry format, `**Status:**` enum, ≤80-word body, board size.
  - `SubagentStop` lints what a worker appended and notices code written with no board entry.
  - `PreToolUse` on `git merge` / `gh pr merge` verifies every required gate `CLEAR` + supervisor
    `MEETS` for the branch's ticket.
  - `Stop` checks the clean-state contract: tree clean, handoff overwritten, no placeholders.

  All hooks **fail open** (always exit 0) and are **silent in any repo without `ops/PRODUCT.md`** —
  the plugin installs at user scope, so it must be inert in unrelated sessions. Ship in `warn` mode;
  promote per-repo via `.claude/agent-team.json`.
- **`hooks/test/run-tests.js`** — 70 assertions over the hook layer, including the fail-open and
  stay-silent invariants. `node hooks/test/run-tests.js`.
- **`/ticket <one line>`** (`skills/ticket/`) — one sentence becomes a complete `REQUEST_FORMAT`
  ticket: repo searched for `WHERE` pointers, owner and gates assigned, filed on the right board,
  shown for a single yes/no. Filing, not throughput, is where work died — every stalled item across
  the four deployments stalled before a ticket existed.
- **`/standup`** (`skills/standup/` + `scripts/standup.js`) — cross-repo status: non-terminal tickets
  with age, unowned follow-ups, stale handoffs, boards over budget, gates awaiting a verdict. The
  collector is deterministic (`--json`, `--out`) so status costs nothing; deployments self-register
  from the `SessionStart` hook, so it needs no configuration.
- **`ops/PRECEDENTS.md`** — case law (WORKFLOW §12). Gate rulings that bind future tickets get one
  line, written with the sign-off; gates read their section before ruling; `hr` promotes anything
  holding across two products upstream at a cache epoch. Closes the learning loop: the flagship
  build's precedents had been sitting in one deployment's `PROGRESS.md` and never propagated.
- **`Updated` column** on all three Ticket Indexes — ISO date, rewritten on every status change. The
  only record of how long a ticket has sat, and what the age-SLA hook reads. Ticket-age SLAs are
  documented in WORKFLOW §13 and configurable per repo.
- `CHANGELOG.md`; `plugin.json` gains `displayName`, `homepage`, `repository`, `license`, `keywords`.

### Changed

- **`SKILLS_MANIFEST.md` rewritten against what is actually installable.** The previous manifest named
  ~25 skills, 23 of which did not resolve — leaving `supervisor` and `hr` with entirely fictional
  toolkits, which is the direct reason HR's monthly capability review had never run once. Every row is
  now a `plugin:skill` identifier verified against a live install, with a substitutions table, an
  honest known-gaps section, and a verification procedure.
- **`design-expert` gains `Bash`.** Its read budget is "the ticket + diff under review" and it could
  not produce a diff; the coordinator had been fetching diffs and committing on its behalf. That
  documented "process quirk" is retired.
- `hr` gains a **precedent-promotion loop** (the extraction ladder applied to lessons) and corrected
  tooling. `coo`'s weekly review now starts from `/standup` instead of grepping boards.
  `security-validator` and `supervisor` record precedents with their verdicts; `security-validator`
  must name an owner on any follow-up it spawns. `qa-validator` treats a red typecheck/lint/test stage
  as a `BLOCK`, not a note. `orchestrator` owns Ticket Index `Owner`/`Updated` hygiene and points
  owners at `/ticket`.
- **TOKEN_POLICY §5** explains why definitions carry family aliases (`opus`/`sonnet`/`haiku`) rather
  than pinned model IDs — the alias tracks each new generation without a cache epoch or 19 file edits.
  Tier changes are `HR` tickets with a cost note. Adds a warning that Claude Code ignores unrecognized
  agent-frontmatter keys, so a speculative key looks like a capability while doing nothing.
- `HARNESS.md` §2/§3/§6, `WORKFLOW.md` §9/§12/§13, `TOKEN_POLICY.md` §1/§3/§5 and `README.md` updated
  for the hooks, the precedents ledger, and the two new commands.

### Deliberately not done

- **Native Agent Teams instead of markdown boards.** The boards are the reason every gate verdict is
  still auditable weeks later, and the feature is experimental. Adopted the enforcement primitives
  (hooks); kept the boards.
- **`memory:` on agent definitions.** Could not be confirmed for agent frontmatter in Claude Code
  2.1.218, and unrecognized keys are silently ignored — a speculative key would have read as a
  capability while doing nothing. `ops/PRECEDENTS.md` covers the same need verifiably *and*
  propagates across deployments, which agent-scoped memory would not.

## 1.2.0 — 2026-07-19

Added `HARNESS.md` (session model, re-anchor and clean-state contracts, context recycling) and
`LIFECYCLE.md` (idea→profit stages, owner sync pulse) to the shipped plugin; intake refresh.

## 1.0.0 — 2026-07-12

First published release: 19 agents, gated ticket workflow, three boards, `/start` intake,
`TOKEN_POLICY`, `REQUEST_FORMAT`, marketplace distribution.
