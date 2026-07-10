# Engineering & Business Workflow (team standard)

Single source of process truth. Every agent follows it on every change. Read with `TEAM_BOARD.md`
(how agents talk), `REQUEST_FORMAT.md` (how work is specified), `TOKEN_POLICY.md` (how we stay cheap),
`SKILLS_MANIFEST.md` (capability packs + installation protocol), `LIFECYCLE.md` (idea→profit stages
and owner sync), and `ops/PRODUCT.md` (what we're building).

We are a **company running a live product**: triage → design → branch → implement → review →
validate → supervisor gate → merge → deploy → verify → close. Keep `main` green, ship small
increments continuously, and account for every unit of infra spend. What gets built is scoped by the
product's **lifecycle stage** (LIFECYCLE.md) — a pre-validation product earns validation tickets,
not feature tickets.

**Boards:** delivery work lives on `TEAM_BOARD.md`; growth work (MKT/SEO) on
`boards/GROWTH_BOARD.md`; business ops (BIZ/HR) on `boards/OPS_BOARD.md`. Same protocol everywhere;
"the board" below means the board owning the ticket's area. Cross-board handoffs name the target
board.

---

## 1. Ticket lifecycle

```
Backlog → Ready → In Progress → In Review → In Validation → Supervisor Gate → Done
                                  (→ Blocked at any stage)
```

- **ID format:** `TKT-<AREA>-<n>` — areas: `API WEB IOS MAC AND WIN OPS SEC DES BIZ MKT SEO HR INC`.
  Orchestrator assigns IDs and owns the board's Ticket Index.
- Every ticket is written in `REQUEST_FORMAT.md` schema. One owning agent + named validators.
- Record every state change on the ticket's board — the boards are the single memory of truth.

### Definition of Ready (DoR)
GOAL + ACCEPT criteria present; WHERE pointers resolved (or explicitly `WHERE: new`); API decision if
wire shape changes (spec-PR first, §4); design tokens/spec available for UI work; GATES line filled.
When information is missing, the owner posts one batched `QUESTION` and the ticket stays `Ready`.

### Definition of Done (DoD)
- [ ] Tests green in CI (unit + integration; every BUG ships with a regression test).
- [ ] Contract change: OpenAPI updated FIRST, SDKs regenerated and consumed (models come from the
      generator, exclusively).
- [ ] Secrets live in the secrets manager; logs and analytics stay free of PII; feature gating
      enforced server-side.
- [ ] UI styled entirely through design tokens.
- [ ] All GATES `CLEAR` on the board (§5) **and supervisor verdict `MEETS`** (§6).
- [ ] Docs updated where behavior changed; conventional commits; clean CI on merge.

## 2. Branching (trunk-based)

- `main` stays always deployable; deploys run from `main` via CI.
- Work on short-lived branches, one ticket per branch, merged within days:
  `<type>/TKT-<AREA>-<n>-<slug>` (`feat/`, `fix/`, `chore/`, `perf/`). Rebase on `main` before PR.
- Every change reaches `main` through a reviewed PR. Shared branches move forward append-only
  (regular pushes). Let every hook run on every commit.

## 3. Commits, PRs, required reviewers

Conventional Commits (`type(scope): summary`, footer `Refs: TKT-AREA-n`). One logical change per PR.
Keep lanes on distinct modules — the orchestrator sequences or fences overlapping work.

| Change touches…                          | Required gate (blocking unless noted)      |
|------------------------------------------|--------------------------------------------|
| any code                                 | qa-validator                               |
| auth / payments / PII / secrets / infra  | security-validator                         |
| any UI                                   | design-expert                              |
| hot paths / bundle / memory / cold start | performance-validator (when budget at risk)|
| new dependency / cloud resource / vendor / model-API usage | cost-validator           |
| API wire shape                           | backend-platform (spec-PR first)           |
| URL structure / redirects / robots / canonical / hreflang / structured data | seo-specialist |
| new or changed public web pages / titles / meta | seo-specialist (advisory)            |
| pricing / packaging / public claims      | product-manager + cfo (advisory: marketing)|

## 4. Contract-first rule

Any wire-shape change is an OpenAPI spec PR merged **before** implementation. All five clients
consume generated SDKs exclusively. CI publishes the spec and regenerates SDKs; clients pull the
fresh SDK on every contract change.

## 5. Validation gate (hard blocking)

Owner posts one `HANDOFF` per batch; validators reply `SIGN-OFF: CLEAR | BLOCK <pointer>`.
`BLOCK` → owner remediates → validator re-verifies **the delta only** → `CLEAR`.
Merging requires every required gate at `CLEAR`. Validators read the diff plus ACCEPT criteria
(TOKEN_POLICY §4) and open full files only when a hunk needs surrounding context.

## 6. Supervisor gate (goal conformance)

After all validator gates read `CLEAR`, the **supervisor** checks the delivered diff against the
ticket's original GOAL + ACCEPT — confirming the right thing was built, beyond it being built right.
Verdict `MEETS` → owner merges. Verdict `FAILS <criterion + pointer>` → back to `In Progress`.
The supervisor rules on conformance exclusively; QA, security, and style remain with their gates.

## 7. Delivery paths

**Bootstrap (once per product):** owner runs `/start` → orchestrator interrogates per `INTAKE.md`
(multi-choice dialogs: business model, platforms, scope, data class, compliance, budget caps,
success metric, validation/distribution/sync contract) → `ops/PRODUCT.md` + COSTS caps + ROADMAP
seeded from answers, lifecycle stage set → assumption tickets for unknowns → founding `DECISION` →
owner confirms the first batch → orchestrator installs the batch roles' skill packs
(SKILLS_MANIFEST "Installation protocol") and the owner **closes and reopens Claude Code** so the
skills load. A capability gap surfaced at intake routes to hr (agent creation) ahead of scheduling.

**Feature:** PM writes ticket (REQUEST_FORMAT, `FEAT`) → orchestrator triages, assigns owner+gates →
DoR check → owner implements on branch → HANDOFF → gates CLEAR → supervisor MEETS → merge → deploy →
owner verifies in env + posts `DEPLOY` → cost-validator posts actual infra delta → orchestrator flips
to Done. Marketing picks up user-visible Done tickets for the changelog/announcement.

**Bug:** reporter files `BUG` ticket with REPRO + trimmed LOG + WHERE pointer → orchestrator sets
priority (P1 = prod-impacting: mitigate first — rollback/flag-off — then fix) → owner reproduces,
fixes, **adds a regression test** → qa gate (+ security when in scope) → supervisor MEETS → merge →
verify.

**Incident:** `TKT-INC-n` at top priority. Mitigate → root-cause → fix ticket + regression test →
5-line post-mortem on the board.

## 8. Release & deploy

Merge to `main` → CI deploys (owner watches the run, posts the result). On a bad deploy: roll back
first, debug after. Migrations are forward-only, expand/contract, zero-downtime. Let a mid-apply
infra run finish before acting on it (state locks stay consistent).

## 9. Business cadence

- **Per batch / weekly (orchestrator):** owner pulse — one AskUserQuestion sync per LIFECYCLE.md
  (direction check, decision queue, budget health, outside signal); stage-gate review when a
  lifecycle stage's exit evidence lands. Agents queue owner questions for the pulse; hard blockers
  escalate immediately.
- **Per batch (orchestrator):** skill-provisioning check — batch owners' + gates' packs installed
  per SKILLS_MANIFEST before dispatch; installs trigger the close-and-reopen-Claude step.
- **Weekly (COO):** ops review — ticket-age SLAs, blocked items, archive sweep across all three
  boards (TOKEN_POLICY §3).
- **Monthly (CFO):** cost review of `ops/COSTS.md` vs caps — downgrade/kill decisions ticketized as `BIZ`.
- **Per release (marketing):** changelog → announcement/ASO updates, ticketized as `MKT`.
- **Monthly (seo-specialist):** organic health review — GSC metrics, AI-citation tracking, ranking
  movements → findings ticketized as `SEO`.
- **Continuous (PM):** feedback + metrics → ROADMAP re-rank by revenue impact → new tickets.
- **Monthly (hr):** capability + performance review — new models/skills/tools scouted, agent
  performance read from board history → upgrade proposals as `HR` tickets, shipped at cache epochs.

## 10. Golden rules (apply everywhere)

- Stage an explicit tenant/role context on every data access; enforce feature tiers server-side.
- Secrets live in the secrets manager; repos, images, and CI logs stay clean of them.
- Synthetic data everywhere below prod; real user data lives in prod exclusively.
- Communicate on the board; make every cross-team assumption explicit there.
- Enter every recurring cost in `ops/COSTS.md` **before** it is incurred.
- Apply `TOKEN_POLICY.md` in every message: pointers over pastes, batches over drips, fixed reply blocks.
- Agent definitions evolve through `HR` tickets approved by the human owner, piloted on one batch,
  and shipped at cache epochs — the workforce stays current AND cache-stable.

## 11. Grounding protocol (anti-hallucination, anti-drift)

Applies to every agent, in every message:

1. **Evidence with every claim.** A statement about code carries a `path:line` you read this
   session; a metric carries the command that produced it; a vendor/pricing fact carries its source.
2. **Verify, then assert.** Read the file, run the command, or query the ledger before stating a
   fact. Label anything else `UNVERIFIED` — and prefer converting it into a QUESTION or a quick check.
3. **Stay inside the ticket.** Map every change to an ACCEPT bullet. Route new discoveries to the
   orchestrator as one-line ticket proposals, keeping the current diff on-scope.
4. **Re-anchor before handoff.** Re-read the ticket GOAL + ACCEPT immediately before posting a
   HANDOFF or SIGN-OFF and confirm the work still answers them — this catches drift while it is
   still cheap.
5. **Separate observation from inference** in every entry: "tests pass (ran `pnpm test`)" versus
   "likely caused by X (inferred)".
