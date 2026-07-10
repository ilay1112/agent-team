# Lifecycle (idea → profit) + owner sync protocol

The company exists to turn an idea into a profitable product, not just to ship code. Every product
sits in exactly one stage below (recorded in `ops/PRODUCT.md` Identity); the stage decides what work
the roadmap prioritizes and which lane leads. Grounded in solo-founder practice: validate before
building, treat distribution as a first-class workstream, charge early, and watch churn once revenue
exists.

## Stages

| Stage | Lead | Focus (what the roadmap's Now list looks like) | Exit evidence (measurable — gate checks it) |
|-------|------|------------------------------------------------|---------------------------------------------|
| 1. Validate | product-manager | Problem interviews, landing page + waitlist, competitor scan, pricing hypothesis. Build only what validation needs. | 20+ waitlist signups, 10+ problem interviews, or pre-orders — per the Phase 5 intake answer |
| 2. Build | orchestrator | MVP: ONE core feature done well on the launch platform. Marketing site + analytics ship with it. | MVP passes all gates; deployed to prod; analytics live |
| 3. Launch | marketing | Launch checklist: announcement, store/ASO listings, SEO foundations indexed, pricing page live. Charge from day one where the model allows. | Product publicly available + first tracked signups from the declared channel |
| 4. Monetize | cfo | Conversion path, pricing iteration, remove friction to first payment. PM kills features that don't move the metric. | First paying customers; unit economics stated (infra $/user < revenue $/user) |
| 5. Grow | seo-specialist + marketing | Double down on the channel that converts; retention work; churn watch (monthly churn >5% = leaking bucket → retention tickets outrank acquisition). | Revenue goal trajectory per PRODUCT.md; churn <5% monthly |

Stages are a ratchet with a human override: only the owner (at a stage gate) moves the product
forward, backward, or to **kill/pivot** — evidence, not enthusiasm, moves the pointer.

## Stage gate (owner review at every stage exit)

When a stage's exit evidence lands on the board, the orchestrator runs one AskUserQuestion review:

1. **Verdict** — advance to next stage · stay and strengthen · pivot (re-run intake Phases 1–2) ·
   kill. Present the exit evidence with pointers first.
2. **Next-stage priority** — the top item the owner wants first in the new stage.

Outcome → `DECISION` on the delivery board + PRODUCT.md stage field updated (cache-epoch rules
apply) + PM re-ranks the roadmap.

## Owner pulse (periodic sync — the team never drifts unsupervised)

Cadence comes from the intake Phase 5 sync answer (default: **every completed batch or weekly,
whichever comes first**; "minimal" owners get stage gates + cap breaches only). The orchestrator
runs one AskUserQuestion call:

1. **Direction check** — "Top of the roadmap is X, Y, Z — still right?" (options: yes · re-rank ·
   something new came up)
2. **Decision queue** — open DECISIONs / QUESTIONs waiting on the owner, batched into one question
   with concrete options.
3. **Budget & health** — one-line burn vs cap + blocked count; ask only when action is needed
   (approve overage · downgrade · pause a lane).
4. **Outside signal** — "Anything you learned from users/market since last sync?" (feeds PM
   evidence rows).

Results: `DECISION` entry (delivery board) + roadmap re-rank + unblocking dispatches. The pulse
replaces ad-hoc interruptions — agents queue owner questions for the pulse unless a hard blocker
(cap breach, prod incident, destructive action) warrants immediate escalation.

## Drift tripwires (any agent may trigger an early pulse)

- Two consecutive batches with reworked scope (`FAILS` at supervisor or owner re-rank) → the plan
  and the owner have diverged; sync before the third batch.
- A lane idle >1 week with Ready tickets → priorities unclear; ask, don't guess.
- Evidence contradicting a PRODUCT.md assumption (metric, user feedback, competitor move) → the
  assumption's research ticket + a pulse item, not a silent doc edit.
