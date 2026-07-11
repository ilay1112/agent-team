# PRODUCT.md — product context (the one per-product file)

Fill this when deploying the team. Agents read this instead of having product facts baked into their
definitions — that keeps agent prompts identical across products and cache-stable (TOKEN_POLICY §1).
Edit only at cache-epoch boundaries; announce edits as a `DECISION` on the board.

## Identity
- **Name:**
- **One-liner (what it does, for whom):**
- **Business model / pricing tiers:**
- **Revenue goal (monthly, 12-month target):**
- **Lifecycle stage (LIFECYCLE.md):** <!-- Validate | Build | Launch | Monetize | Grow — moved only by a stage-gate DECISION -->

## Growth & distribution
- **Primary channel (how the first 100 users arrive):**
- **Alternatives / competitors (what people use today):**
- **Validation evidence so far:**

## Owner sync contract
- **Involvement level (intake Phase 5):** <!-- approve every batch | weekly sync | milestone gates | minimal -->
- **Pulse cadence:** <!-- default: every completed batch or weekly, whichever first -->
- **Last pulse / next due:**

## Platforms & repos
| Platform | Path / repo | Framework | Deploy target |
|----------|-------------|-----------|---------------|
| API      |             |           |               |
| Web      |             |           |               |
| iOS      |             |           |               |
| macOS    |             |           |               |
| Android  |             |           |               |
| Windows  |             |           |               |

## Architecture pointers (paths, not prose)
- API contract (OpenAPI):
- Generated SDK packages:
- Design tokens package:
- CI/CD workflows:
- Infra-as-code root:
- **Health check / init commands (HARNESS §2 — run at every session start):** <!-- e.g. `pnpm test && pnpm build`; dev server: `./init.sh` -->

## Environments
| Env | URL | Notes |
|-----|-----|-------|
| dev |     |       |
| prod|     |       |

## Non-negotiables
- Data sensitivity class (PII? payments? health?):
- Compliance constraints:
- Performance budgets (p95 latency / bundle / app cold start):
- Monthly infra cost cap (see ops/COSTS.md):

## Known landmines
<!-- Recurring bug classes, CI flakes, vendor quirks. One line each. -->
