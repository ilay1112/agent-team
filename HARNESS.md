# Harness (context lifecycle — how the team outlives any single context window)

A model's attention budget is finite and degrades as the window fills; near the limit, agents lose
coherence and start wrapping up prematurely ("context anxiety"). The harness answer: treat every
context window as a **disposable work session** whose state lives in files, not in the window.
Three mechanisms — fresh worker contexts, structured handoffs, external memory — grounded in
Anthropic's harness and context-engineering guidance. TOKEN_POLICY makes sessions cheap; this file
makes them coherent.

## 1. Session model

| Session type | Who | Lifetime | State carried out |
|--------------|-----|----------|-------------------|
| Initializer | orchestrator via `/start` | once per product | PRODUCT.md, caps, roadmap, first batch, first `ops/PROGRESS.md` handoff |
| Coordinator | orchestrator | one window; recycled at boundaries (§4) | `ops/PROGRESS.md` handoff + board entries |
| Worker | any dispatched agent (Task call) | one batch, then dies | one HANDOFF block on its board; durable findings in files |

"Different agents" only by their opening prompt — same system underneath. The company is the loop;
sessions are its heartbeats.

## 2. Session start — re-anchor sequence (fixed order, every session)

1. `pwd` + `git log --oneline -10` + `git status` — where am I, what landed last.
2. Read `ops/PROGRESS.md` **Current handoff** block — repo state, health, in-flight, blockers, next.
3. Read your agent's Read-first list (TOKEN_POLICY §1 ordering keeps the prefix cached).
4. Run the health check (PRODUCT.md "Health check / init commands") **before new work** — a broken
   baseline gets fixed ahead of any feature; inheriting breakage silently is how projects rot.

## 3. Session end — clean-state contract (every session)

- Nothing half-implemented reaches `main`: finish the ticket or park it on its branch with a
  one-line board note.
- Commit with descriptive messages; update the board; overwrite the PROGRESS **Current handoff**
  block; append one Session log line.
- End **deliberately at a boundary** (batch done, blocker hit, recycle trigger) — never run until
  the window dies mid-edit. A clean stop costs one block; a dirty one costs the next session an
  archaeology dig.

## 4. Context recycling

**Workers recycle by design:** every Task dispatch is a fresh window. A worker returns its HANDOFF
block only (condensed, ≤ ~1–2k tokens); exploration detail dies with the session; anything durable
(spec, audit, measurement) is written to a file and pointed to. The coordinator synthesizes
verdicts — raw worker context never enters its window.

**Coordinator recycle triggers** — write the handoff, then have the owner start a fresh session:
- a batch closes and the next one needs different context anyway;
- degradation signs: re-reading files already read, misremembering ticket states, summarizing
  instead of acting;
- a stage gate or cache epoch (natural boundary — doc edits land here too, TOKEN_POLICY §1);
- skills were just installed (the restart requirement and the recycle are the same close-and-reopen —
  spend it once, gain twice).

**Never recycle mid-ticket.** Finish or park first; the handoff describes a boundary, not a
freeze-frame.

**In-window compaction bias** (when summarizing anything): keep decisions, unresolved blockers,
ticket IDs + ACCEPT deltas, exact next actions; drop tool outputs, resolved threads, and any code
re-readable by pointer. Tool results are the safest thing to forget — the file is still there.

## 5. The delivery loop (goal re-injection — maximum results per window)

One ticket at a time, one feature at a time — the classic failure mode is attempting everything at
once. Worker loop within a batch:

```
re-anchor (§2) → pick highest-priority Ready ticket → branch → implement →
verify against ACCEPT (run it end-to-end; UI = drive the browser, not just unit tests) →
commit → next ticket | blocker → park + board entry (thrash is not a state)
```

A ticket is `passing` only after its verification RAN — the verdict comes from the run, not from
optimism. Because every session re-injects the goal from durable state (ticket GOAL + ACCEPT +
PROGRESS handoff), the loop continues identically in a fresh window: **the loop outlives the
context**. Kill criteria stay explicit — the loop ends at batch-done, blocker, or an owner
decision, never by drifting.

## 6. Memory hierarchy (where state lives, so the window doesn't have to)

| Horizon | Store | Loaded |
|---------|-------|--------|
| this ticket | branch + board thread | while owned |
| this session | `ops/PROGRESS.md` Current handoff | at re-anchor |
| the product | `ops/PRODUCT.md` + ROADMAP + COSTS | per Read-first |
| the process | WORKFLOW / TOKEN_POLICY / LIFECYCLE / this file | static, cached prefix |

Rule of thumb: the window holds what is being worked on **now**; everything else is a pointer
fetched just-in-time. When in doubt, write it down and let it go.
