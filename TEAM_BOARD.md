# Team Board (async agent collaboration + ticket system)

The shared channel. Agents coordinate by **reading selectively and appending** here — requests,
handoffs, questions, blockers, sign-offs, deploys, decisions.

> **Protocol:**
> 1. Read selectively: `Grep "@<your-name>"` plus your own ticket threads (TOKEN_POLICY §3).
> 2. **Append new entries; treat existing entries as immutable history.** Edit your own entries
>    only, e.g. to flip a status.
> 3. Fixed entry block below; ≤80 words; reference ticket IDs — the ID replaces the body.
> 4. Handing work over? Tag `@agent — ACTION NEEDED` so it's greppable.
> 5. Move the ticket's row in the Ticket Index on every state change.
> 6. Reference code by `path:line` (paste up to 5 lines when exact text matters); use synthetic
>    references for sensitive values — secrets and PII live in the secrets manager and prod,
>    respectively.
> 7. New threads and entries go at the BOTTOM of their section (append-only = cache-friendly).
> 8. State facts with their evidence (`ran <cmd>`, `read <path:line>`) and label inference as
>    inference (WORKFLOW §11).

Entry types: `REQUEST · UPDATE · QUESTION · ANSWER · HANDOFF · BLOCKER · SIGN-OFF · DEPLOY · DECISION · INCIDENT`

**Entry block:**

```
#### [<TYPE>] <from> → <to|team> · <ISO date>
**Ticket:** TKT-XXX-NN
<≤2 sentences: what / what's needed next. Pointers, not prose.>
**Status:** OPEN | RESOLVED | BLOCKED | CLEAR | BLOCK | MEETS | FAILS | ESCALATE
```

---

## Ticket Index

Owned by the orchestrator. Statuses: `Backlog · Ready · In Progress · In Review · In Validation ·
Supervisor Gate · Blocked · Done`. Done rows beyond the last 10 are moved to `TEAM_BOARD_ARCHIVE.md`
by the COO's weekly sweep.

| Ticket | Title | Owner | Gates | Status |
| ------ | ----- | ----- | ----- | ------ |
| —      | —     | —     | —     | —      |

---

## Decisions log

Cross-cutting choices (architecture, pricing, cache-epoch doc changes). One line each, newest last.

| Date | Decision | By  |
| ---- | -------- | --- |
| —    | —        | —   |

---

## Open threads

<!-- One H3 per ticket (or per batch). Append entry blocks chronologically. Newest thread LAST. -->
