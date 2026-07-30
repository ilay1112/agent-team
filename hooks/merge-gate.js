'use strict';
/**
 * PreToolUse merge gate — WORKFLOW §5-6 stops being a prose rule.
 *
 * "Merging requires every required gate at CLEAR and supervisor MEETS" was
 * enforced only by an agent choosing to obey it. This reads the board and checks.
 *
 * Silent unless it can identify a ticket from the branch AND find its row on a
 * board. Ambiguity means allow — a gate that fires on unrelated git usage gets
 * switched off, and then it enforces nothing.
 */

const path = require('path');
const T = require('./lib/team');

// Gates are written shorthand in the index ("qa, sec, des"); map to agent names.
const GATE_ALIASES = {
  'qa-validator': ['qa', 'qa-validator', 'quality'],
  'security-validator': ['sec', 'security', 'security-validator'],
  'design-expert': ['des', 'design', 'design-expert', 'ux'],
  'performance-validator': ['perf', 'performance', 'performance-validator'],
  'cost-validator': ['cost', 'cost-validator'],
  'seo-specialist': ['seo', 'seo-specialist'],
  'backend-platform': ['api', 'backend', 'backend-platform'],
  'product-manager': ['pm', 'product-manager'],
  'cfo': ['cfo'],
  'marketing': ['mkt', 'marketing']
};

function isMergeCommand(cmd) {
  if (!cmd) return false;
  return /(^|[;&|]\s*)git\s+merge\b/.test(cmd) || /(^|[;&|]\s*)gh\s+pr\s+merge\b/.test(cmd);
}

function ticketFromBranch(branch) {
  if (!branch) return null;
  const m = branch.match(/(TKT-[A-Z]{2,4}-\d+)/i);
  return m ? m[1].toUpperCase() : null;
}

/** Resolve the Gates cell into canonical agent names. qa is always required (WORKFLOW §3). */
function requiredGates(gatesCell) {
  const cell = String(gatesCell || '').toLowerCase();
  const required = new Set(['qa-validator']);
  if (!cell || cell === '—' || cell === '-') return [...required];
  for (const [agent, aliases] of Object.entries(GATE_ALIASES)) {
    for (const alias of aliases) {
      if (new RegExp(`(^|[^a-z])${alias}([^a-z]|$)`).test(cell)) { required.add(agent); break; }
    }
  }
  return [...required];
}

/**
 * Collect entry blocks referencing `ticket`, in document order.
 * Boards are append-only, so the LAST verdict from an agent is the live one.
 */
function entriesFor(text, ticket) {
  const out = [];
  if (!text) return out;
  const lines = text.split(/\r?\n/);
  const starts = [];
  lines.forEach((l, i) => { if (/^\s*#{3,4}\s*\[/.test(l)) starts.push(i); });

  for (let s = 0; s < starts.length; s++) {
    const from = starts[s];
    const to = s + 1 < starts.length ? starts[s + 1] : lines.length;
    const block = lines.slice(from, to).join('\n');
    if (!new RegExp(ticket, 'i').test(block)) continue;

    const header = lines[from];
    const type = (header.match(/\[([A-Z-]+)\]/) || [])[1] || '';
    // "#### [SIGN-OFF] qa-validator → orchestrator · 2026-07-30"
    const who = (header.match(/\]\s*([^→·]+?)\s*(?:→|·|$)/) || [])[1] || '';
    const statusLine = block.match(/\*\*Status:\*\*\s*([^\n]*)/);
    const status = statusLine ? statusLine[1].trim().split(/[\s|(]/)[0].toUpperCase() : '';
    out.push({ type, who: who.trim().toLowerCase(), status });
  }
  return out;
}

function lastStatusFrom(entries, agent) {
  const aliases = GATE_ALIASES[agent] || [agent];
  let found = null;
  for (const e of entries) {
    if (e.type !== 'SIGN-OFF') continue;
    const hit = aliases.some((a) => e.who.includes(a)) || e.who.includes(agent);
    if (hit) found = e.status;
  }
  return found;
}

T.run(() => {
  const input = T.readInput();
  if (input.tool_name !== 'Bash') T.emitNothing();

  const cmd = (input.tool_input && input.tool_input.command) || '';
  if (!isMergeCommand(cmd)) T.emitNothing();

  const root = T.findRoot(input.cwd || process.cwd());
  if (!root) T.emitNothing();

  const cfg = T.loadConfig(root);
  const branch = T.git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  let ticket = ticketFromBranch(branch);

  // `gh pr merge` may name the branch explicitly; `git merge feat/TKT-...` does too.
  if (!ticket) ticket = ticketFromBranch(cmd);
  if (!ticket) T.emitNothing(); // cannot identify a ticket — not our business

  // Find the ticket's row and its board.
  let row = null;
  let boardText = null;
  for (const rel of cfg.boards) {
    const text = T.readFileSafe(path.join(root, rel));
    if (!text) continue;
    const hit = T.parseTicketIndex(text).rows.find((r) => r.ticket.toUpperCase().includes(ticket));
    if (hit) { row = hit; boardText = text; break; }
  }
  if (!row) T.emitNothing(); // no board row — nothing to enforce against

  const entries = entriesFor(boardText, ticket);
  const missing = [];

  for (const gate of requiredGates(row.gates)) {
    const status = lastStatusFrom(entries, gate);
    if (status === null) missing.push(`${gate} — no \`SIGN-OFF\` on the board`);
    else if (status !== 'CLEAR') missing.push(`${gate} — last verdict \`${status}\`, needs \`CLEAR\``);
  }

  let supervisor = null;
  for (const e of entries) {
    if (e.who.includes('supervisor')) supervisor = e.status;
  }
  if (supervisor === null) missing.push('supervisor — no goal-conformance verdict (WORKFLOW §6)');
  else if (supervisor !== 'MEETS') missing.push(`supervisor — last verdict \`${supervisor}\`, needs \`MEETS\``);

  if (!missing.length) T.emitNothing(); // fully gated — merge away

  const reason = [
    `**Merge gate — ${ticket} is not cleared to merge** (WORKFLOW §5-6)`,
    '',
    ...missing.map((m) => `- ${m}`),
    '',
    `Gates on the index row: \`${row.gates || '—'}\`. Post the missing SIGN-OFF entries (or fix the failing verdict) before merging.`
  ].join('\n');

  if (cfg.enforce.mergeGate === 'block') {
    T.emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason
      },
      systemMessage: `agent-team: merge of ${ticket} denied — ${missing.length} gate(s) not CLEAR.`
    });
  }
  T.emit({ systemMessage: `agent-team merge gate (warn mode)\n${reason}` });
});
