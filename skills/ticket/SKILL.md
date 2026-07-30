---
name: ticket
description: File a one-line request as a complete REQUEST_FORMAT ticket. Reads the repo to resolve WHERE pointers, drafts GOAL/ACCEPT/NOT/GATES, assigns owner and gates, files it on the right board, and shows it for one yes/no. Use when the user runs /ticket, says "file a ticket", "open a ticket", "add this to the board", or describes a bug/feature in passing that should become work.
---

# /ticket — one-line intake

You are acting as the **orchestrator** (agents/orchestrator.md) doing triage only.

The team's execution is strong; **intake is where work dies.** Every stalled item across four
deployments died *before a ticket existed* — a production PHI incident, an App Store security
follow-up, four launch gates. The bottleneck is not throughput, it is that filing a ticket meant
hand-writing a `REQUEST_FORMAT` block with nobody waiting for it.

So: **the owner supplies one line; you do the rest.** Ask nothing you can read from the repo.

## Procedure

1. **Read the one-liner as the GOAL.** `$ARGUMENTS` (or the user's last description) is the request.
   Never bounce it back for clarification — a scoping question here costs more than a wrong guess you
   label as a guess.

2. **Re-anchor cheaply.** `ops/PRODUCT.md` (stack, budgets, health check) + the target board's Ticket
   Index for the next free ID and current lane load. Skip the board threads.

3. **Resolve `WHERE` by searching, not asking.** Grep for the symbols, strings, routes, or amounts in
   the one-liner and open the two or three files that match. `WHERE` pointers must be `path:line`
   references you actually read this session. Nothing found after a genuine search →
   `WHERE: unknown — locate first` (a legitimate first step; never a guessed path).

4. **Classify.** Area (`API WEB IOS MAC AND WIN OPS SEC DES BIZ MKT SEO HR INC`) → owner from the
   org chart. Type (`FEAT BUG CHORE PERF INC BIZ MKT`). Priority: `P1` only for prod-impacting or
   revenue-blocking; everything else `P2`/`P3`. Gates from WORKFLOW §3 — `qa` always, plus `sec` for
   auth/payments/PII/secrets/infra, `design` for any UI, `cost` for new spend, `perf` when a
   PRODUCT.md budget is at risk, `seo` for URLs/redirects/robots/structured data.

5. **Check the lifecycle stage** (`LIFECYCLE.md`). A pre-validation product earns validation
   tickets, not feature tickets. If the request is out of stage, still draft it — but say so in one
   line and propose `Backlog` rather than `Ready`.

6. **Write ACCEPT as a contract.** ≤5 bullets, each one QA can verify by running something. Numbers
   come from a measured baseline or a PRODUCT.md budget, never from feel. Add `NOT` to fence scope.
   For a `BUG`: `REPRO` steps plus a regression-test bullet in ACCEPT (DoD requires one).

7. **Show the draft, ask once.** Print the full ticket block plus a one-line routing summary
   (`→ owner · gates · board · status`). One AskUserQuestion: **File it · Edit first · Drop it**.
   That is the only question this command asks.

8. **On confirmation, file it:**
   - Append the ticket block to the owning board's thread section.
   - Add the Ticket Index row: `| ID | Title | Owner | Gates | Status | Updated |` — `Updated` is
     today's ISO date. Bump it on every later status change; the SLA hooks read this column.
   - Post one `REQUEST` entry (fixed block, ≤80 words, `**Status:** OPEN`).
   - Report the ticket ID and what happens next in ≤3 lines.

9. **Do not start the work.** Filing and doing are separate sessions. If the owner wants it built
   now, say which agent to dispatch and let them decide.

## Rules

- `REQUEST_FORMAT.md` field order exactly — the boards and the hooks both parse it.
- Grounding (WORKFLOW §11): every `WHERE` traces to a file you opened; anything inferred is labeled
  `(inferred)`; anything unverified is labeled `UNVERIFIED` rather than asserted.
- Batch of requests in one line ("the totalPaid bug and the min-commission fix") → separate tickets,
  one confirmation covering both. A `GOAL` needing a paragraph is two tickets.
- Cost: one PRODUCT.md read + one index read + the grep set. Do not read board threads or unrelated
  area docs to file a ticket.
