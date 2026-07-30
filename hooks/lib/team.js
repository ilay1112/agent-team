'use strict';
/**
 * Shared helpers for agent-team hooks.
 *
 * Contract for every hook in this directory:
 *   1. Exit 0 always. A hook must never break a session.
 *   2. Stay silent unless this repo is an agent-team deployment.
 *   3. Emit one JSON object on stdout, or nothing at all.
 *
 * Rule 2 matters most: the plugin installs at user scope, so these hooks run in
 * every session on the machine — vault notes, one-off scripts, unrelated repos.
 * A deployment is identified by ops/PRODUCT.md (the one product-specific file).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULTS = {
  // "warn" reports through systemMessage; "block" denies the action.
  // Ship warn, promote to block once the noise is tuned (WORKFLOW §13).
  enforce: { mergeGate: 'warn', sessionEnd: 'warn', boardLint: 'warn' },
  boardMaxLines: 300,
  entryMaxWords: 80,
  keepDoneRows: 10,
  // Days a ticket may sit in a non-terminal status before the SLA is breached.
  ticketAgeDays: {
    'Backlog': 30,
    'Ready': 7,
    'In Progress': 3,
    'In Review': 2,
    'In Validation': 2,
    'Supervisor Gate': 1,
    'Blocked': 3
  },
  boards: ['TEAM_BOARD.md', 'boards/GROWTH_BOARD.md', 'boards/OPS_BOARD.md']
};

const TERMINAL_STATUSES = ['done', 'cancelled', 'canceled', 'wont do', "won't do"];

const ENTRY_TYPES = [
  'REQUEST', 'UPDATE', 'QUESTION', 'ANSWER', 'HANDOFF', 'BLOCKER',
  'SIGN-OFF', 'DEPLOY', 'DECISION', 'INCIDENT'
];

const STATUS_ENUM = [
  'OPEN', 'RESOLVED', 'BLOCKED', 'CLEAR', 'BLOCK', 'MEETS', 'FAILS', 'ESCALATE'
];

/** Read the hook payload from stdin. Returns {} when stdin is empty or invalid. */
function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Walk up from `start` looking for ops/PRODUCT.md.
 * Returns the deployment root, or null when this is not a deployment.
 */
function findRoot(start) {
  let dir = path.resolve(start || process.cwd());
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'ops', 'PRODUCT.md')) && !isPluginSource(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * The plugin's own repo ships template ops/ files, so it looks like a deployment.
 * It isn't one — warning about unfilled templates while editing the templates is
 * pure noise. Identify it by its own plugin manifest.
 */
function isPluginSource(dir) {
  try {
    const manifest = path.join(dir, '.claude-plugin', 'plugin.json');
    if (!fs.existsSync(manifest)) return false;
    return JSON.parse(fs.readFileSync(manifest, 'utf8')).name === 'agent-team';
  } catch {
    return false;
  }
}

/** Deep-merge .claude/agent-team.json over DEFAULTS. Bad JSON falls back to defaults. */
function loadConfig(root) {
  const cfg = JSON.parse(JSON.stringify(DEFAULTS));
  try {
    const file = path.join(root, '.claude', 'agent-team.json');
    if (!fs.existsSync(file)) return cfg;
    const user = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [k, v] of Object.entries(user)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && cfg[k] && typeof cfg[k] === 'object') {
        Object.assign(cfg[k], v);
      } else {
        cfg[k] = v;
      }
    }
  } catch { /* defaults */ }
  return cfg;
}

function readFileSafe(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

/** Run git in `root`. Returns trimmed stdout, or null on any failure. */
function git(root, args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000,
      windowsHide: true
    }).trim();
  } catch {
    return null;
  }
}

function isTerminal(status) {
  const s = String(status || '').toLowerCase();
  return TERMINAL_STATUSES.some((t) => s.startsWith(t));
}

/**
 * Parse a board's Ticket Index table.
 *
 * Columns are resolved by HEADER NAME, not position, so a board written against
 * an older template (no `Updated` column) still parses — it just yields rows
 * with updated === null, and callers degrade to a count-only report.
 *
 * Returns { rows, hasUpdatedColumn }.
 */
function parseTicketIndex(text) {
  const out = { rows: [], hasUpdatedColumn: false };
  if (!text) return out;

  const lines = text.split(/\r?\n/);
  let header = null;
  let colIndex = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) { header = null; colIndex = null; continue; }

    const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

    // Separator row (|---|---|) — skip, keep the header we just captured.
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;

    if (!header) {
      const lower = cells.map((c) => c.toLowerCase());
      if (!lower.includes('ticket') || !lower.includes('status')) continue;
      header = lower;
      colIndex = {
        ticket: lower.indexOf('ticket'),
        title: lower.indexOf('title'),
        owner: lower.indexOf('owner'),
        gates: lower.indexOf('gates'),
        status: lower.indexOf('status'),
        updated: lower.indexOf('updated')
      };
      if (colIndex.updated !== -1) out.hasUpdatedColumn = true;
      continue;
    }

    const at = (i) => (i >= 0 && i < cells.length ? cells[i] : '');
    const ticket = at(colIndex.ticket);
    if (!ticket || ticket === '—' || ticket === '-') continue;

    out.rows.push({
      ticket,
      title: at(colIndex.title),
      owner: at(colIndex.owner),
      gates: at(colIndex.gates),
      status: at(colIndex.status),
      updated: colIndex.updated !== -1 ? at(colIndex.updated) : null
    });
  }
  return out;
}

function parseISODate(value) {
  const m = String(value || '').match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return null;
  const d = new Date(`${m[0]}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

function daysSince(date, now) {
  return Math.floor(((now || new Date()) - date) / 86400000);
}

/**
 * Last date this ticket's ID appeared in a board diff, from git history.
 *
 * The fallback for boards written before the `Updated` column existed. Without
 * it, every already-deployed board reports "0 past SLA" — which is how a
 * production incident sits In Review for 16 days without anything noticing.
 * Approximate by construction (it dates the last commit that touched the ID, not
 * the status change), so callers label these ages `~`.
 *
 * One git call per ticket, so callers cap how many they ask for.
 */
function gitAgeDate(root, boardRel, ticket) {
  if (!/^[A-Za-z0-9-]{3,32}$/.test(ticket)) return null; // never interpolate loose text into argv
  const iso = git(root, ['log', '-1', '--format=%cI', `-G${ticket}`, '--', boardRel]);
  return iso ? parseISODate(iso) : null;
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

/** Statuses where a stalled ticket is actively waiting on somebody. */
function isGateStatus(status) {
  const s = norm(status);
  return ['inreview', 'invalidation', 'supervisorgate', 'blocked', 'inprogress']
    .some((k) => s.startsWith(k));
}

/**
 * Match a row's status against the configured SLA table.
 *
 * Prefix match on letters only, longest key first. The strict enum decayed into
 * freeform prose in every deployment audited (`Done (LIVE-VERIFIED in owner
 * browser…)`, `In Review — waiting on KMS`), and a status matcher that only
 * accepts the canonical spelling reports a rotting board as healthy. Recognise
 * the drift here; the board-lint hook is what discourages it at the source.
 */
function slaFor(status, table) {
  const want = norm(status);
  if (!want) return null;
  const keys = Object.entries(table).sort((a, b) => norm(b[0]).length - norm(a[0]).length);
  for (const [key, days] of keys) {
    if (want.startsWith(norm(key))) return days;
  }
  return null;
}

/**
 * Lint agent-team board entry blocks in a chunk of markdown.
 * Returns an array of human-readable problem strings.
 *
 * Word budget counts the BODY only — the `####` header, `**Ticket:**` and
 * `**Status:**` lines are fixed overhead, not prose.
 */
function lintEntries(text, cfg) {
  const problems = [];
  if (!text) return problems;

  const lines = text.split(/\r?\n/);
  const starts = [];
  lines.forEach((line, i) => {
    if (/^\s*#{3,4}\s*\[/.test(line)) starts.push(i);
  });

  for (let s = 0; s < starts.length; s++) {
    const from = starts[s];
    const to = s + 1 < starts.length ? starts[s + 1] : lines.length;
    const block = lines.slice(from, to);
    const headerLine = block[0].trim();
    const label = headerLine.slice(0, 72);

    const typeMatch = headerLine.match(/\[([A-Z-]+)\]/);
    if (!typeMatch) {
      problems.push(`\`${label}\` — header must read \`#### [<TYPE>] <from> → <to> · <ISO date>\`.`);
    } else if (!ENTRY_TYPES.includes(typeMatch[1])) {
      problems.push(`\`${label}\` — \`[${typeMatch[1]}]\` is not an entry type (${ENTRY_TYPES.join(' · ')}).`);
    }
    if (!/\d{4}-\d{2}-\d{2}/.test(headerLine)) {
      problems.push(`\`${label}\` — header is missing its ISO date.`);
    }

    const body = block.slice(1);
    const hasTicket = body.some((l) => /^\s*\*\*Ticket:\*\*/.test(l));
    const statusLine = body.find((l) => /^\s*\*\*Status:\*\*/.test(l));

    if (!hasTicket) {
      problems.push(`\`${label}\` — missing \`**Ticket:** TKT-XXX-NN\`.`);
    }
    if (!statusLine) {
      problems.push(`\`${label}\` — missing \`**Status:**\` (45% of entries dropped it; the hook exists to stop that).`);
    } else {
      const value = statusLine.replace(/^\s*\*\*Status:\*\*/, '').trim();
      const first = value.split(/[\s|(]/)[0].toUpperCase();
      if (!STATUS_ENUM.includes(first)) {
        problems.push(`\`${label}\` — \`**Status:** ${value.slice(0, 40)}\` is off-enum. Use one of ${STATUS_ENUM.join(' | ')}; put detail in the body.`);
      } else if (value.split(/\s+/).length > 3) {
        problems.push(`\`${label}\` — \`**Status:**\` is one enum word plus an optional pointer, not prose.`);
      }
    }

    const prose = body
      .filter((l) => !/^\s*\*\*(Ticket|Status):\*\*/.test(l))
      .join(' ')
      .replace(/`[^`]*`/g, ' ')
      .trim();
    const words = prose ? prose.split(/\s+/).filter(Boolean).length : 0;
    if (words > cfg.entryMaxWords) {
      problems.push(`\`${label}\` — ${words} words, budget ${cfg.entryMaxWords}. Move the overflow into a file and post the pointer (TOKEN_POLICY §6).`);
    }
  }
  return problems;
}

/**
 * Where the plugin keeps machine-level state (the deployment registry).
 * AGENT_TEAM_STATE_DIR overrides it — the test suite points it at a temp dir so
 * running tests never touches the owner's real registry.
 */
function stateDir() {
  if (process.env.AGENT_TEAM_STATE_DIR) return path.resolve(process.env.AGENT_TEAM_STATE_DIR);
  return path.join(require('os').homedir(), '.claude', 'agent-team');
}

/**
 * Record this repo in the deployment registry (see stateDir()).
 *
 * Makes `/standup` zero-config: every deployment the owner opens registers
 * itself, so cross-repo status never depends on a hand-maintained list.
 * Best-effort — a read-only or missing home directory is not an error.
 */
function registerDeployment(root) {
  try {
    const dir = stateDir();
    const file = path.join(dir, 'deployments.json');
    let data = { deployments: [] };
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(parsed.deployments)) data = parsed;
    } catch { /* first run */ }

    const norm = path.resolve(root);
    if (data.deployments.some((d) => path.resolve(d) === norm)) return;
    data.deployments.push(norm);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch { /* never fail a session over bookkeeping */ }
}

/** systemMessage is shown to the owner without entering the model's context. */
function emit(obj) {
  if (obj && Object.keys(obj).length) process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

function emitNothing() {
  process.exit(0);
}

/** Wrap a hook body so any unexpected throw degrades to silence, never to a broken session. */
function run(fn) {
  try {
    fn();
  } catch {
    process.exit(0);
  }
  process.exit(0);
}

module.exports = {
  DEFAULTS, ENTRY_TYPES, STATUS_ENUM,
  readInput, findRoot, loadConfig, readFileSafe, git, stateDir, registerDeployment,
  isTerminal, parseTicketIndex, parseISODate, daysSince, slaFor, lintEntries,
  gitAgeDate, isGateStatus,
  emit, emitNothing, run
};
