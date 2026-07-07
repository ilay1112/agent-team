# COSTS.md — cost ledger (owned by CFO)

Every recurring cost enters this ledger **before** it is incurred (WORKFLOW §10). The cost-validator
gates per-ticket cost deltas against the caps here; the CFO reviews monthly and ticketizes
downgrades/kills as `TKT-BIZ-n`. Append rows at the bottom of each table.

## Budget caps

| Category | Monthly cap | Hard/soft | Kill switch |
|----------|------------|-----------|-------------|
| Cloud infra (AWS/GCP/…) | $ | hard | downgrade plan in row notes |
| SaaS subscriptions | $ | soft | cancel list below |
| Paid APIs / model usage in product | $ | hard | feature flag off |
| Agent-team model spend | $ | soft | tier-down per TOKEN_POLICY §5 |
| **Total burn cap** | $ | hard | CFO escalates to human owner |

## Recurring costs

| Item | Vendor | $/mo | Category | Owner ticket | Since | Justification (1 line) | Kill/downgrade path |
|------|--------|------|----------|--------------|-------|------------------------|---------------------|
| — | — | — | — | — | — | — | — |

## Cost deltas (per merged ticket — cost-validator appends)

| Date | Ticket | Est Δ$/mo | Actual Δ$/mo | Note |
|------|--------|-----------|--------------|------|
| — | — | — | — | — |

## Monthly reviews (CFO appends)

<!-- ### YYYY-MM — total burn $X vs cap $Y · actions: TKT-BIZ-n, ... -->

## Revenue (CFO appends, feeds PM prioritization)

| Month | MRR | Paying users | Churn % | Note |
|-------|-----|--------------|---------|------|
| — | — | — | — | — |
