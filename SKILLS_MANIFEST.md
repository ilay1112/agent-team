# Skills Manifest (per-role capability packs)

Install these skills once per machine/repo; each agent's `## Skills` section says when to invoke
them. When a listed skill is absent, the agent proceeds with the checklist in its own definition and
notes `skill unavailable` in its HANDOFF. Sources: mcpservers.org/agent-skills,
github.com/alirezarezvani/claude-skills, github.com/anthropics/skills, welcomedeveloper.com,
artificialcorner.com.

## Installation protocol (orchestrator-owned)

Skills are infrastructure: a missing skill silently degrades an agent's output (the agent falls back
to its built-in checklist), so provisioning is verified — never assumed.

1. **When:** at `/start`, right after the first ticket batch is confirmed — install the packs for
   every role owning or gating a first-batch ticket. As the project progresses, **before dispatching
   any batch**, the orchestrator checks this manifest for the batch's owners + gates and installs
   what's missing.
2. **How:** add the marketplaces below (one-time), then `/plugin install <pack>` / the listed `npx`
   command per the table. Record what was installed in a board `UPDATE`.
3. **Verify:** `claude plugin list` (or check `~/.claude/plugins/`) — confirm the pack is present
   rather than trusting the install command's exit alone.
4. **Restart rule (hard):** marketplace-plugin skills load only at session start. After installing,
   **stop and ask the human owner to close and reopen Claude Code** before dispatching agents that
   need the new skills. `/reload-plugins` is not reliable for marketplace skills — a full restart is.
5. **Fallback:** an agent finding a listed skill absent mid-ticket notes `skill unavailable` in its
   HANDOFF; the orchestrator treats two such notes for the same pack as a provisioning bug and fixes
   it before the next batch.

## Marketplaces to add (one-time)

```
/plugin marketplace add anthropics/skills
/plugin marketplace add alirezarezvani/claude-skills     # 354 skills across eng/product/marketing/C-suite
/plugin marketplace add obra/superpowers-marketplace
/plugin marketplace add LukasNiessen/terrashark
npx @c0x12c/ai-toolkit@latest --local                    # spartan quality gates
```

## Per-agent skill packs

| Agent                 | Skills                                                                                                                                                                                                                                                                                                                                                     | Source / install                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| orchestrator          | `superpowers` (clarify→spec→plan→execute→review); project-management pack (senior-pm, scrum-master); `decision-mapping`                                                                                                                                                                                                                                    | obra/superpowers; alirezarezvani `project-management/`; `npx skills@latest add mattpocock/skills/decision-mapping`                         |
| supervisor            | `check-impl-against-spec`; `ship-gate`; `zero-hallucination-coder` (Verify phase)                                                                                                                                                                                                                                                                          | `npx skills@latest add warpdotdev/check-impl-against-spec`; alirezarezvani `engineering/`                                                  |
| product-manager       | product-team pack (product-manager, agile-PO, ux-researcher, roadmap-communicator, code-to-prd); `write-a-prd`; `roast` (GO/RESHAPE/KILL idea panel); `ab-testing`, `analytics`                                                                                                                                                                            | alirezarezvani `product-team/`, `productivity/`; mattpocock/skills; skills.sh coreyhaines31                                                |
| backend-platform      | `planetscale` (schema branching, index/N+1 discipline); `database-schema-designer`; `zero-hallucination-coder`; `superpowers` TDD; spartan quality gates                                                                                                                                                                                                   | `npx skills@latest add planetscale/skills`; softaworks; alirezarezvani `engineering/`                                                      |
| web-developer         | `frontend-design` (bundled); `react-best-practices`; `web-design-guidelines` (post-build UI lint); `accessibility`; `superpowers` TDD                                                                                                                                                                                                                      | Anthropic bundled; `npx skills@latest add vercel/react-best-practices`, `vercel-labs/web-interface-guidelines`, `addyosmani/accessibility` |
| apple-developer       | `apple-hig-expert`; `zero-hallucination-coder`; `superpowers` TDD                                                                                                                                                                                                                                                                                          | alirezarezvani `product-team/`, `engineering/`; obra                                                                                       |
| android-developer     | spartan toolkit Kotlin profile; `zero-hallucination-coder`; `superpowers` TDD                                                                                                                                                                                                                                                                              | spartan-ai-toolkit; alirezarezvani `engineering/`; obra                                                                                    |
| windows-developer     | spartan toolkit (typed-language profile); `zero-hallucination-coder`; `superpowers` TDD                                                                                                                                                                                                                                                                    | spartan-ai-toolkit; alirezarezvani `engineering/`; obra                                                                                    |
| devops-engineer       | `TerraShark` (diagnostic-sequence Terraform, ~600-token activation); CI/CD-builder, helm-charts, kubernetes-operator, feature-flags-architect, slo-architect, chaos-engineering                                                                                                                                                                            | LukasNiessen/terrashark; alirezarezvani `engineering/` reliability portfolio                                                               |
| design-expert         | `frontend-design`; `web-design-guidelines`; `accessibility`; ui-design + `apple-hig-expert`                                                                                                                                                                                                                                                                | Anthropic bundled; vercel-labs; addyosmani; alirezarezvani `product-team/`                                                                 |
| qa-validator          | Playwright Pro (test gen, flaky-fix); spartan quality gates (typecheck→lint→test→review, in order)                                                                                                                                                                                                                                                         | alirezarezvani `engineering-team/`; spartan-ai-toolkit                                                                                     |
| security-validator    | security-auditor + security suite; `git-guardrails-claude-code`; compliance packs (SOC 2 / ISO 27001 / GDPR) when PRODUCT.md declares them                                                                                                                                                                                                                 | alirezarezvani `engineering/`, `ra-qm-team/`; mattpocock/skills                                                                            |
| performance-validator | `planetscale` (query-plan/index review); `slo-architect`; `code-simplifier` (post-fix cleanup suggestions)                                                                                                                                                                                                                                                 | planetscale/skills; alirezarezvani `engineering/`; anthropics/claude-plugins-official                                                      |
| cost-validator        | `saas-metrics-coach`; `procurement-optimizer`; TerraShark risk-control output for infra diffs                                                                                                                                                                                                                                                              | alirezarezvani `finance/`, `business-operations/`; LukasNiessen                                                                            |
| cfo                   | finance pack (financial-analyst: DCF/budgeting/forecasting; saas-metrics-coach); c-level CFO advisor; `pricing-strategist`                                                                                                                                                                                                                                 | alirezarezvani `finance/`, `c-level-advisor/`, `commercial/`                                                                               |
| coo                   | c-level COO advisor; business-operations pack (process-mapper, vendor-management, capacity-planner, internal-comms, knowledge-ops)                                                                                                                                                                                                                         | alirezarezvani `c-level-advisor/`, `business-operations/`                                                                                  |
| marketing             | marketing-skill pack — Content, CRO, Channels, Growth, Intelligence, Sales pods; `landing` (single-file landing generator); coreyhaines31 suite: `aso`, `analytics`, `ab-testing`, `emails`, `cold-email`, `churn-prevention`, `copy-editing`, `ad-creative`; `market-competitors` | alirezarezvani `marketing-skill/`, `marketing/`; skills.sh coreyhaines31; artificialcorner vault |
| seo-specialist        | marketing-skill **SEO+AEO pod** (E-E-A-T audit, LLM citation tracking across 5 answer engines) + `local-seo-manager`; `ai-seo`; `analytics`, `ab-testing`; `market-competitors`; `copy-editing` | alirezarezvani `marketing-skill/`; skills.sh coreyhaines31 |

| hr                    | `skill-creator` (create/edit/**eval** skills — the canary harness); `agent-designer`; `write-a-skill` + `self-eval`; `deep-research`/`quick-research`; c-level CHRO advisor | Anthropic bundled skill-creator; alirezarezvani `engineering/`, `research/`, `c-level-advisor/`; mattpocock/skills |

## SEO connectors (MCP — live data for seo-specialist)

| Connector | Data | Notes |
| --------- | ---- | ----- |
| Google Search Console MCP | impressions, clicks, rankings, indexing status (~20 tools) | free; ground truth for organic health — connect first |
| DataForSEO MCP | search volume, keyword difficulty, SERP + AI Overview detection | pay-per-call; route through cost-validator |
| Ahrefs / Semrush MCP | backlinks, competitor keywords, site audits | subscription; CFO-approved ledger row first |

## Shared (all agents)

- `zero-hallucination-coder` discipline (Discuss→Map→Decompose→Execute→Verify) backs the Grounding
  protocol in WORKFLOW §11 — code-writing agents invoke it on any multi-file change.
- Anthropic document skills (`docx`, `xlsx`, `pptx`, `pdf`) for any file deliverable.
- `doc-coauthoring` for specs, runbooks, and post-mortems.
