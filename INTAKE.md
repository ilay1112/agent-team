# Intake Protocol (project interrogation — run via /start)

The orchestrator interviews the human owner **before any work begins**. Grounded in requirements-
elicitation practice: questionnaires organized by objective, charter elements captured up front
(business need, scope, assumptions, risks), and discovery focused on the problem ahead of feature
wishes. Every answer writes to a named field — the model works from declared facts and guesses less.

**Token economics:** the interview runs ONCE; answers become the stable, cached `ops/PRODUCT.md`
prefix every agent reads all sprint. Multi-choice beats free text: precise options produce precise
fields, and precise fields eliminate the QUESTION round-trips that burn tokens mid-sprint.

## Rules

1. Ask via the **question dialog** (AskUserQuestion): one call per phase, 4 questions per call,
   2–4 concrete options each, `multiSelect` where choices combine. The "Other" option covers edge
   cases.
2. Every question maps to a destination field (tables below) — ask exactly what the files need.
3. "Unsure" is a legitimate answer: record it as `assumption:` in PRODUCT.md + a research ticket,
   keeping unknowns explicit instead of guessed.
4. Skip questions the owner already answered in their request — re-asking known facts wastes the
   dialog.
5. After the last phase: write the files, present the seeded plan, and confirm the first batch.

## Phase 1 — Business identity → PRODUCT.md Identity + COSTS.md

| # | Question | Options | Destination |
|---|----------|---------|-------------|
| 1 | What does the product do, for whom? (header: Product) | 4 options generated from the owner's initial message; Other for free text | Identity: one-liner |
| 2 | How does it make money? (header: Model) | B2C subscription · B2B subscription · one-time purchase · free now, monetize later | Identity: business model |
| 3 | 12-month revenue goal? (header: Goal) | validate the idea · <$1k MRR · $1–10k MRR · $10k+ MRR | Identity: revenue goal (drives PM prioritization + cost-validator volume projections) |
| 4 | Where does the project stand? (header: Stage) | idea only · prototype/partial code · existing codebase to adopt · live product to maintain | Architecture pointers: fill vs. `new` |

## Phase 2 — Platforms & scope → PRODUCT.md Platforms + ROADMAP.md

| # | Question | Options | Destination |
|---|----------|---------|-------------|
| 1 | Launch platform first? (header: First launch) | web · iOS · Android · desktop (Win/Mac) | Platforms table: launch order |
| 2 | Platforms eventually? (header: All platforms, multiSelect) | web · iOS+macOS · Android · Windows | Platforms table rows |
| 3 | v1 scope? (header: MVP) | one core feature done well · 2–3 features · full suite | ROADMAP Now sizing; NOT fields |
| 4 | First release target? (header: Timeline) | 2 weeks · 1 month · this quarter · quality over date | ROADMAP cadence; orchestrator batch sizing |

## Phase 3 — Data, risk & compliance → PRODUCT.md Non-negotiables (sets gates)

| # | Question | Options | Destination |
|---|----------|---------|-------------|
| 1 | Sensitive data handled? (header: Data, multiSelect) | payments · personal data (PII) · regulated (health/finance) · public data only | Data sensitivity class → security-validator blocking scope |
| 2 | Sign-in? (header: Auth) | email+password+social · SSO/enterprise · none for v1 · custom | Auth architecture; security gate scope |
| 3 | Compliance regimes? (header: Compliance, multiSelect) | GDPR · SOC 2 · sector-specific · unsure — research it | Compliance constraints; `unsure` → TKT-SEC research ticket |
| 4 | Third-party integrations? (header: Integrations, multiSelect) | payment provider · email/notifications · calendar/storage APIs · none yet | Architecture pointers; cost-validator vendor list |

## Phase 4 — Constraints & success → COSTS.md caps + PRODUCT.md budgets

| # | Question | Options | Destination |
|---|----------|---------|-------------|
| 1 | Monthly infra budget cap? (header: Budget) | ≤$25 · $25–100 · $100–500 · $500+ | COSTS.md caps table (hard cap) |
| 2 | v1 success metric? (header: Success) | signups/waitlist · first paying users · retention/usage depth · learning/validation | PRODUCT.md success metric; PM ACCEPT baselines |
| 3 | Design language? (header: Design) | minimal/clean · playful · corporate · match references I'll provide | design-expert token direction |
| 4 | Languages/locales? (header: Locales) | one language · +RTL language · multi-locale · English-only for now | i18n requirement; design/web gates |

## Post-interview sequence (orchestrator)

1. Write `ops/PRODUCT.md` — every field from its mapped answer; `assumption:` entries for unsure
   answers.
2. Seed `ops/COSTS.md` caps from Phase 4.1; seed `ops/ROADMAP.md` Now from Phase 2.3/2.4.
3. Open research tickets for every `assumption:`.
4. Post the founding `DECISION` on the board (product, stage, caps, gates activated).
5. Present the first ticket batch (REQUEST_FORMAT) for owner confirmation — building starts on
   confirmed tickets.

## Capability-gap check (during intake and forever after)

When answers reveal a needed role missing from the roster (e.g., ML pipeline, blockchain, embedded
firmware), the orchestrator routes a `TKT-HR-n` to **hr** — the agent-creator — who builds the new
specialist per its creation procedure before the affected work is scheduled.
