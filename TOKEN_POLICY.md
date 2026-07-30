# Token Policy (cost discipline for every agent)

Tokens are the company's payroll. Every agent applies these rules in every message. The CFO tracks
model spend in `ops/COSTS.md`; the COO audits compliance weekly. This file keeps sessions cheap;
`HARNESS.md` keeps them coherent (session lifecycle, context recycling, handoffs) — the two are
read together.

## 1. Cache optimization — strict ordering

Prompt caching bills only the NEW suffix; identical prefixes are nearly free. Therefore every agent
context is assembled **static → volatile, in this fixed order**:

```
1. Agent definition (static — identical across products)
2. WORKFLOW.md + REQUEST_FORMAT.md + this file (near-static)
3. ops/PRODUCT.md (slow-changing product context)
4. ops/PRECEDENTS.md — your section only (slow-changing, append-only)
5. Area doc(s) for the agent's domain (slow-changing)
6. Ticket block(s) (volatile)
7. Board excerpt — the relevant thread(s) (volatile)
```

- **Cache epochs:** hold every shared-doc edit (layers 1–4) until the sprint boundary, batch them
  into one change, and announce it as a `DECISION` on the board — this keeps every agent's cached
  prefix valid all sprint.
- Product specifics live in `ops/PRODUCT.md` exclusively — agent definitions stay identical across
  products.
- Append-only files (board, costs ledger) grow at the BOTTOM so prefixes survive.

## 2. Batch routing

- Orchestrator dispatches **one Task per owner with up to 4 tickets** of the same area, and fires
  independent lanes **in parallel within a single message**.
- Owners post **one HANDOFF per batch**; validators return one SIGN-OFF per batch (per-ticket
  verdicts inside). Collect ALL open questions first, then post one `QUESTION` entry.
- **Worker return contract (HARNESS §4):** a dispatched worker returns its condensed HANDOFF block
  only (≤ ~1–2k tokens) — never raw exploration, logs, or file dumps. Durable output goes to files;
  the coordinator's window receives verdicts and pointers, keeping it clean for synthesis.
- Re-verification after a BLOCK covers **the delta exclusively**.

## 3. Board & context hygiene

- Read **your lane's board** selectively: `Grep "@<my-name>"` plus your own ticket threads.
  Delivery agents read `TEAM_BOARD.md`; marketing/seo read `boards/GROWTH_BOARD.md`; coo/cfo/hr read
  `boards/OPS_BOARD.md` (coo + orchestrator span all three). The board split exists so no agent
  pays for another lane's threads.
- Entries ≤80 words, fixed block format (TEAM_BOARD.md). Reference ticket IDs — the ID replaces the
  body.
- **Weekly archive sweep (COO):** Done threads move to each board's `_ARCHIVE.md`; each Ticket Index
  keeps active rows + last 10 Done. Keep every hot board under ~300 lines — this directly cuts every
  agent's read cost. **This is the cheapest rule in the file and the one that decays first:** the sweep
  ran in no deployment audited, no `_ARCHIVE.md` was ever created, and one board reached 4,937 lines /
  648 KB that every session then grepped. The hooks warn at the write that crosses the budget and again
  at session start (WORKFLOW §13); treat the warning as the ticket.
- Outputs go to **files**: reports, specs, and metrics land in the repo; the board entry carries the
  pointer.

## 4. Read budgets

- **Developers:** read the ticket's WHERE-pointer files + your area doc. A read set growing past
  ~10 files signals an underspecified ticket — post a `QUESTION` and let the ticket improve.
- **Validators:** read the **diff** (`git diff main...branch`) + ACCEPT criteria; open a full file
  when a diff hunk needs surrounding context to interpret.
- **Supervisor:** ticket + diff + sign-off entries — a complete review set.
- **Business agents:** your own ledger/roadmap file + the Ticket Index; code stays with engineering.

## 5. Model tiers

Agent definitions carry the **family alias** (`opus` / `sonnet` / `haiku`), never a pinned model ID.
The alias resolves to the current member of that family, so the workforce inherits each new
generation without 19 file edits — and, because the definition text is unchanged, without invalidating
a single cached prefix. Pinning IDs would cost a cache epoch per model release and buy nothing.

| Tier | Agents | Rationale |
|------|--------|-----------|
| `opus` | orchestrator, supervisor | Routing and goal-conformance errors are the most expensive mistakes a run can make |
| `sonnet` | all developers, design-expert, security-validator, product-manager, seo-specialist, hr | Building and high-stakes review (an indexing mistake takes months to recover; a prompt edit shapes an agent for a whole sprint) |
| `haiku` | qa-validator, performance-validator, cost-validator, coo, cfo, marketing | Structured, rubric-driven work against a fixed checklist |

**Escalation ladder:** a `haiku` validator below confidence posts `SIGN-OFF: ESCALATE <reason>`; the
orchestrator re-runs **that single check** on `sonnet` — one check, not the batch. Reserve `opus` for
dispatch and the supervisor gate. The ladder is a confidence mechanism, not a retry: a validator that
escalates routinely has a definition gap, which is `hr`'s signal (WORKFLOW §9).

**Changing a tier is an `HR` ticket** (WORKFLOW §10) with a cost note — it changes the run's payroll.
Verify any frontmatter key before adding it — Claude Code ignores unrecognized agent-definition
fields at load time, so a speculative key looks like a capability while doing nothing at all.

## 6. Reply contracts

Every inter-agent reply uses the fixed blocks in TEAM_BOARD.md (`HANDOFF`, `SIGN-OFF`, `QUESTION`…).
Go straight to content the other agent needs next. Verdicts are one word + pointer. When a reply
approaches 80 words, move the overflow into a file and post the pointer.
