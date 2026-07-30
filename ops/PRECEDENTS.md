# PRECEDENTS.md — the team's case law

Rulings that bind future tickets. A gate verdict, a rejected approach, or a design call that took an
argument to settle gets one line here, and every later ticket inherits it instead of re-litigating.

**Why this file exists:** the flagship build produced genuinely valuable process knowledge — design
precedents, a coordinator workaround, a rule about never parsing per-template dialects — and it
ended up buried in one paragraph of one deployment's `ops/PROGRESS.md`. It never propagated. Sibling
products then re-learned all of it from scratch, at full price. Handoffs are for *this* session's
state and get overwritten; precedents outlive every session, so they need their own file.

## Protocol

- **Who appends:** any agent whose verdict establishes a rule — most often `design-expert`,
  `security-validator`, `qa-validator`, `supervisor`, `backend-platform`. Append when a decision will
  bind work you are not currently doing.
- **When:** at the moment of the verdict, in the same edit as the board `SIGN-OFF`. A precedent
  remembered later is a precedent already lost.
- **Read-first:** gates read their own section before ruling (it is why they stop re-arguing settled
  cases); ticket owners read their area's section at Definition-of-Ready.
- **One line each, newest last.** Rule + the ticket that established it. Pointers, not prose — same
  budget as a board entry.
- **Supersede, never delete:** a reversed ruling gets `~~struck~~` with the ticket that reversed it
  and a new line below. The reversal is itself precedent.
- **Promotion (hr, monthly):** a precedent that holds across two or more products is not
  product-specific — it is a process rule. `hr` proposes it as an `HR` ticket to move upstream into
  the plugin's own docs at a cache epoch (WORKFLOW §10). That is the extraction ladder for lessons,
  the same one the team already runs for code.

## Format

```
- [<AREA>] <the rule, imperative> — `TKT-<AREA>-<n>`, <ISO date>
```

## Design (`design-expert`)

<!-- Blocking-gate rulings: tokens, a11y, layout order, interaction patterns. -->

| Rule | Established by | Date |
| ---- | -------------- | ---- |
| —    | —              | —    |

## Security (`security-validator`)

<!-- Rulings on auth, tenancy, secrets, PII handling. A BLOCK that revealed a class of bug goes here. -->

| Rule | Established by | Date |
| ---- | -------------- | ---- |
| —    | —              | —    |

## Architecture & API (`backend-platform`, `devops-engineer`)

<!-- Wire-shape conventions, migration patterns, "never do X" structural rules. -->

| Rule | Established by | Date |
| ---- | -------------- | ---- |
| —    | —              | —    |

## Quality & scope (`qa-validator`, `supervisor`)

<!-- Recurring test requirements; scope rulings that define what MEETS means here. -->

| Rule | Established by | Date |
| ---- | -------------- | ---- |
| —    | —              | —    |

## Process quirks (this deployment)

<!-- Workarounds a fresh session would otherwise rediscover the hard way. -->

| Quirk | Workaround | Date |
| ----- | ---------- | ---- |
| —     | —          | —    |
