# Request Format (token-minimized ticket schema)

Every request to the team — from the human owner or between agents — uses this schema. It is built on
**pointers, not prose**: file:line references, trimmed logs, testable criteria. A well-formed ticket
lets the owner start work reading only the pointers.

## Schema

```
### TKT-<AREA>-<n> · FEAT|BUG|CHORE|PERF|INC|BIZ|MKT · P1|P2|P3
GOAL: <one line — what + why it earns/saves money or fixes user pain>
WHERE: <path:line, path:line | new:<dir>>        # implementation site / bug location
API: <none | METHOD /path — shape delta in one line>
UI: <none | screen/component + design-token ref>
REPRO: <1-3 numbered steps>                      # BUG only
LOG: <≤15 lines, trimmed to the failing frames>  # BUG only, fenced
ACCEPT:
- <testable criterion>                           # ≤5 bullets, each verifiable by QA
NOT: <explicit out-of-scope, one line>
GATES: qa[, sec][, design][, perf][, cost][, seo]
```

## Rules (enforced by orchestrator at DoR)

1. **Pointers over pastes.** Reference `path:line`; paste at most 5 lines when the exact text
   matters. The owner has Read access — the ticket says where to look.
2. **Logs arrive trimmed.** Keep the failing frame(s) and the first error line; strip timestamps,
   request IDs, and repeated stack noise. 15 lines max.
3. **One-line GOAL.** A goal that needs a paragraph is two tickets.
4. **ACCEPT is the contract.** QA tests exactly these bullets; the supervisor verdicts against them.
   Make each criterion concrete and verifiable ("returns within 300ms p95", "matches invoice
   #2026-0107").
5. **NOT keeps scope explicit** — tokens go exclusively to requested work, and the supervisor can
   verdict scope objectively.
6. **Go straight to content.** Reference ticket IDs; the ID replaces the body in every thread.
7. **Fixed field order** (as above) — predictable structure parses cheaply and diffs cleanly.

## Grounding at intake (anti-hallucination)

WHERE pointers come from files the author actually opened; ACCEPT numbers come from measured
baselines or PRODUCT.md budgets; vendor claims carry a source. A ticket field the author is unsure
about is written as `WHERE: unknown — locate first` (a legitimate first step) rather than a guessed
path.

## Examples

```
### TKT-WEB-014 · FEAT · P2
GOAL: Invoice search by partial number/amount — top support complaint, churn risk.
WHERE: apps/web/src/app/invoices/page.tsx:88, services/api/src/invoices/invoices.service.ts:141
API: GET /invoices?q= — add substring match on number, partial amount
UI: InvoiceList toolbar — existing SearchInput token pattern
ACCEPT:
- "10" matches invoice #2026-0107 and amount 105.00
- results ≤300ms p95 on 10k invoices
- empty query returns default list, zero errors
NOT: fuzzy/typo matching and export stay out of scope
GATES: qa, perf
```

```
### TKT-API-007 · BUG · P1
GOAL: Every token refresh 401s in deployed env — sessions die at access-token expiry.
WHERE: services/api/src/auth/auth.service.ts:270
REPRO: 1. login 2. wait for access expiry 3. any request → 401
LOG:
```
UnauthorizedException: refresh rejected
  at AuthService.refresh (auth.service.ts:270)  # user.findUnique returns null
```
ACCEPT:
- refresh succeeds under the app DB role (integration test)
- regression test pins the context-staged lookup
NOT: refresh-token rotation redesign stays out of scope
GATES: qa, sec
```
