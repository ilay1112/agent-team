# PROGRESS.md — live handoff + session log (harness memory, HARNESS.md)

The bridge between context windows: a fresh session restores full working state from the block
below, without re-analyzing the repo. The coordinator overwrites **Current handoff** at every
session end (§3 clean-state contract); the Session log is append-only, one line per session.

## Current handoff (overwrite at session end)

- **Repo state:** <branch @ commit hash — from `git log --oneline -1`>
- **Health:** <test/build result + the command run, e.g. `pnpm test → 42/42`>
- **In flight:** <ticket IDs + status, e.g. TKT-WEB-3 In Validation, TKT-API-5 parked on branch>
- **Blockers:** <one line each, with board pointer — or `none`>
- **Next actions:** <ordered, ≤5, concrete — the first thing a fresh session does after re-anchor>

## Session log (append-only, newest last)

| Date | Session (agent · type) | Did (ticket IDs / outcome) | Left state |
|------|------------------------|----------------------------|------------|
| —    | —                      | —                          | —          |
