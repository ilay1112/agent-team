# Skills Manifest (per-role capability packs)

Install these packs once per machine; each agent's `## Skills` section says when to invoke them. A
listed skill that is absent means the agent falls back to the checklist in its own definition and
notes `skill unavailable` in its HANDOFF.

> **Names in this file are `plugin:skill` identifiers you can pass to the `Skill` tool verbatim.**
> That is not cosmetic. An earlier version of this manifest listed ~25 skills by wished-for name; 23
> of them did not exist under those names, which left two roles — `supervisor` and `hr` — with a
> toolkit that was entirely fictional. HR's monthly capability review had never run once, for the
> simple reason that none of its tools existed. **A capability is real only when the identifier
> resolves.** Verify before adding a row (§Verification below); never add a row from a blog post.

## Installation protocol (orchestrator-owned)

Skills are infrastructure: a missing skill silently degrades an agent's output, so provisioning is
verified, never assumed.

1. **When:** at `/start`, right after the first ticket batch is confirmed — install the packs for
   every role owning or gating a first-batch ticket. Then, **before dispatching any batch**, check
   this manifest for that batch's owners + gates and install what is missing.
2. **How:** add the marketplaces below (one-time), then `/plugin install <pack>`.
3. **Verify:** run the check in §Verification. Confirm the pack is present rather than trusting the
   install command's exit code.
4. **Restart rule (hard):** marketplace-plugin skills load only at session start. After installing,
   **stop and ask the owner to close and reopen Claude Code** before dispatching agents that need
   them. `/reload-plugins` is not reliable for marketplace skills.
5. **Fallback:** two `skill unavailable` notes for the same pack is a provisioning bug — fix it
   before the next batch, and correct this manifest if the name was wrong.

## Marketplaces to add (one-time)

```
/plugin marketplace add anthropics/skills
/plugin marketplace add obra/superpowers-marketplace
/plugin marketplace add LukasNiessen/terrashark
```

The `claude-code-skills` marketplace supplies most role packs below (`engineering-skills`,
`marketing-skills`, `product-skills`, `pm-skills`, `finance-skills`, `pw`, `roast`, `landing`,
`a11y-audit`, `apple-hig-expert`, `code-to-prd`, `zero-hallucination-coder`).

## Per-agent skill packs

Every identifier below was resolved against a live install. `†` marks a substitute adopted because
the originally-specified skill does not exist under that name.

| Agent | Skills (`plugin:skill`) | Pack |
| ----- | ----------------------- | ---- |
| orchestrator | `superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:executing-plans`, `superpowers:dispatching-parallel-agents`, `superpowers:subagent-driven-development`; `pm-skills:senior-pm`, `pm-skills:scrum-master` | superpowers · pm-skills |
| supervisor | `superpowers:verification-before-completion` †, `superpowers:requesting-code-review` †, `zero-hallucination-coder:zero-hallucination-coder` (Verify phase), `engineering-skills:code-reviewer` | superpowers · zero-hallucination-coder · engineering-skills |
| product-manager | `product-skills:product-manager-toolkit`, `product-skills:product-strategist`, `product-skills:product-discovery`, `product-skills:roadmap-communicator`, `product-skills:experiment-designer`, `product-skills:product-analytics`; `roast:cs-roast` (GO/RESHAPE/KILL panel); `code-to-prd:code-to-prd` | product-skills · roast · code-to-prd |
| backend-platform | `engineering-skills:senior-backend`, `engineering-skills:senior-architect`, `engineering-skills:tdd-guide`, `zero-hallucination-coder:zero-hallucination-coder` | engineering-skills · zero-hallucination-coder |
| web-developer | `frontend-design` (bundled), `engineering-skills:senior-frontend`, `engineering-skills:epic-design`, `a11y-audit:a11y-audit` †, `engineering-skills:tdd-guide` | frontend-design · engineering-skills · a11y-audit |
| apple-developer | `apple-hig-expert:apple-hig-expert`, `zero-hallucination-coder:zero-hallucination-coder`, `engineering-skills:tdd-guide` | apple-hig-expert · engineering-skills |
| android-developer | `engineering-skills:code-reviewer` (Kotlin), `zero-hallucination-coder:zero-hallucination-coder`, `engineering-skills:tdd-guide` | engineering-skills · zero-hallucination-coder |
| windows-developer | `engineering-skills:code-reviewer` (C#/.NET), `zero-hallucination-coder:zero-hallucination-coder`, `engineering-skills:tdd-guide` | engineering-skills · zero-hallucination-coder |
| devops-engineer | `2.3.0:terrashark` (diagnostic-sequence Terraform), `engineering-skills:senior-devops`, `engineering-skills:incident-commander`, `engineering-skills:aws-solution-architect` / `:azure-cloud-architect` / `:gcp-cloud-architect` (per PRODUCT.md cloud) | terrashark · engineering-skills |
| design-expert | `frontend-design` (bundled), `product-skills:ui-design-system`, `a11y-audit:a11y-audit` †, `apple-hig-expert:apple-hig-expert`, `product-skills:ux-researcher-designer` | frontend-design · product-skills · a11y-audit · apple-hig-expert |
| qa-validator | `pw:pw` + `pw:generate`, `pw:fix`, `pw:coverage`, `pw:review` (Playwright); `engineering-skills:senior-qa` | pw · engineering-skills |
| security-validator | `engineering-skills:senior-security` †, `engineering-skills:senior-secops` †, `engineering-skills:security-pen-testing`, `engineering-skills:cloud-security`, `engineering-skills:ai-security` (LLM features) | engineering-skills |
| performance-validator | `engineering-skills:senior-backend` (query plans/indexes), `engineering-skills:senior-frontend` (bundle/CWV), `simplify` (post-fix cleanup) † | engineering-skills · bundled |
| cost-validator | `finance-skills:saas-metrics-coach`, `finance-skills:financial-analyst`, `2.3.0:terrashark` (infra-diff risk output) | finance-skills · terrashark |
| cfo | `finance-skills:financial-analyst`, `finance-skills:saas-metrics-coach`, `marketing-skills:pricing-strategy` | finance-skills · marketing-skills |
| coo | `pm-skills:scrum-master`, `pm-skills:senior-pm`, `pm-skills:team-communications`, `pm-skills:meeting-analyzer` | pm-skills |
| marketing | `marketing-skills:marketing-strategy-pmm`, `:launch-strategy`, `:copywriting`, `:content-strategy`, `:email-sequence`, `:app-store-optimization`, `:paid-ads`, `:campaign-analytics`, `:pricing-strategy`, `:page-cro`, `:marketing-psychology`; `landing:cs-landing` | marketing-skills · landing |
| seo-specialist | `marketing-skills:seo-audit`, `:aeo` (AI answer engines), `:site-architecture`, `:schema-markup`, `:programmatic-seo`, `:local-seo-manager`, `:competitor-alternatives`, `:content-strategy` | marketing-skills |
| hr | `anthropic-skills:skill-creator` (create/edit/eval skills), `superpowers:writing-skills` †, `engineering-skills:senior-prompt-engineer` † (eval-driven prompt iteration), `engineering-skills:adversarial-reviewer` †, `engineering-skills:named-persona-adversarial-review` †, `anthropic-skills:consolidate-memory` † | anthropic-skills · superpowers · engineering-skills |

### Substitutions, and why

The originals were not installable under the names previously listed. The capability is mostly
present — under different names, in packs already installed:

| Was listed as | Actually use | Note |
| ------------- | ------------ | ---- |
| `accessibility`, `web-design-guidelines` | `a11y-audit:a11y-audit` | WCAG 2.2 A/AA scan-fix-verify |
| `security-auditor` | `engineering-skills:senior-security`, `:senior-secops` | OWASP + SAST/DAST + compliance |
| `check-impl-against-spec`, `ship-gate` | `superpowers:verification-before-completion`, `superpowers:requesting-code-review` | The supervisor's whole kit was fictional |
| `agent-designer`, `write-a-skill`, `self-eval` | `anthropic-skills:skill-creator`, `superpowers:writing-skills`, `engineering-skills:senior-prompt-engineer` | `skill-creator` carries the eval harness |
| `deep-research` / `quick-research` | `WebSearch` + `WebFetch` (hr already holds both) | No install needed |
| `decision-mapping` | `superpowers:brainstorming` | Same job at intake |
| `code-simplifier` | `simplify` (bundled) | Ships with the harness |
| `planetscale`, `slo-architect`, `procurement-optimizer` | no equivalent installed | Real gaps — see below |

### Known gaps (do not pretend these exist)

- **Schema-branching / query-plan discipline** (`planetscale`): covered informally by
  `engineering-skills:senior-backend`. Leave as a gap unless a product's DB work justifies sourcing one.
- **SLO architecture** (`slo-architect`): `engineering-skills:incident-commander` covers response, not
  SLO design.
- **Procurement optimization**: `cost-validator` runs on its own checklist plus the finance pack.

An `hr` capability review may close a gap by sourcing or authoring a skill — that is its job, and it
now has the tools to do it.

## Verification

Names drift as packs version. Check before trusting a row:

```bash
ls ~/.claude/plugins/cache/*/*/            # installed packs and versions
cat ~/.claude/plugins/installed_plugins.json
```

In session, the available-skills list is authoritative — a `plugin:skill` identifier that does not
appear there will not resolve, whatever this file says. **Fix the row, don't retry the call.**

## SEO connectors (MCP — live data for seo-specialist)

| Connector | Data | Notes |
| --------- | ---- | ----- |
| Google Search Console MCP | impressions, clicks, rankings, indexing status | free; ground truth for organic health — connect first |
| DataForSEO MCP | search volume, difficulty, SERP + AI Overview detection | pay-per-call; route through cost-validator |
| Ahrefs / Semrush MCP | backlinks, competitor keywords, site audits | subscription; CFO-approved ledger row first |

## Shared (all agents)

- `zero-hallucination-coder:zero-hallucination-coder` (Discuss→Map→Decompose→Execute→Verify) backs the
  grounding protocol in WORKFLOW §11 — code-writing agents invoke it on any multi-file change.
- Document skills for file deliverables: `anthropic-skills:docx`, `:xlsx`, `:pptx`, `:pdf`.
- `dataviz` before any chart, dashboard, or metric visual.
