'use strict';
/**
 * Cross-repo standup.   node scripts/standup.js [--json] [--out <file>] [repo...]
 *
 * The capability the vault named as covered by no source: "cross-repo status
 * aggregation". Reads every registered deployment's boards and reports what is
 * actually stuck — non-terminal tickets with age, unowned follow-ups, stale
 * handoffs, boards over budget, gates awaiting a verdict.
 *
 * Deterministic on purpose. An agent grepping four boards (one of which reached
 * 4,937 lines / 648 KB) to answer "what's stuck" costs more than the answer is
 * worth; this does it for free and the agent adds judgement on top.
 *
 * Deployments self-register: the SessionStart hook appends each repo it sees to
 * ~/.claude/agent-team/deployments.json, so the registry needs no maintenance.
 */

const fs = require('fs');
const path = require('path');
const T = require('../hooks/lib/team');

const REGISTRY = path.join(T.stateDir(), 'deployments.json');

function loadRegistry() {
  try {
    const data = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
    return Array.isArray(data.deployments) ? data.deployments : [];
  } catch {
    return [];
  }
}

/** One deployment's report. */
function inspect(root) {
  const cfg = T.loadConfig(root);
  const name = path.basename(root);
  const report = {
    name, root,
    exists: fs.existsSync(path.join(root, 'ops', 'PRODUCT.md')),
    stage: null, branch: null, head: null, dirty: 0,
    overdue: [], unowned: [], awaitingGate: [], boards: [],
    handoff: { behind: 0, date: null, placeholders: false, missing: false },
    missingUpdatedColumn: false,
    counts: { open: 0, done: 0 }
  };
  if (!report.exists) return report;

  const product = T.readFileSafe(path.join(root, 'ops', 'PRODUCT.md'));
  if (product) {
    const m = product.match(/(?:lifecycle\s*stage|stage)\s*[:|]\s*\**\s*(Validate|Build|Launch|Monetize|Grow)/i);
    if (m) report.stage = m[1];
  }

  report.branch = T.git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  report.head = T.git(root, ['log', '-1', '--format=%h %cs %s']);
  const status = T.git(root, ['status', '--porcelain']);
  report.dirty = status ? status.split(/\r?\n/).filter(Boolean).length : 0;

  // Handoff freshness
  const progressRel = 'ops/PROGRESS.md';
  const progress = T.readFileSafe(path.join(root, 'ops', 'PROGRESS.md'));
  if (!progress) {
    report.handoff.missing = true;
  } else {
    const sha = T.git(root, ['log', '-1', '--format=%H', '--', progressRel]);
    if (sha) {
      report.handoff.behind = parseInt(T.git(root, ['rev-list', '--count', `${sha}..HEAD`]) || '0', 10);
      report.handoff.date = T.git(root, ['log', '-1', '--format=%cs', '--', progressRel]);
    }
    const block = progress.match(/##\s*Current handoff[^\n]*\n([\s\S]*?)(?=\n##\s|$)/);
    if (block && /<[a-z][^>]*>/i.test(block[1])) report.handoff.placeholders = true;
  }

  const now = new Date();
  for (const rel of cfg.boards) {
    const text = T.readFileSafe(path.join(root, rel));
    if (!text) continue;

    const lines = text.split(/\r?\n/).length;
    report.boards.push({ rel, lines, overBudget: lines > cfg.boardMaxLines, budget: cfg.boardMaxLines });

    const { rows, hasUpdatedColumn } = T.parseTicketIndex(text);
    if (rows.length && !hasUpdatedColumn) report.missingUpdatedColumn = true;

    for (const row of rows) {
      if (T.isTerminal(row.status)) { report.counts.done++; continue; }
      report.counts.open++;

      const unowned = !row.owner || row.owner === '—' || row.owner === '-' || /^tbd$/i.test(row.owner);
      if (unowned) report.unowned.push({ ticket: row.ticket, status: row.status, title: row.title, board: rel });

      const sla = T.slaFor(row.status, cfg.ticketAgeDays);
      let when = T.parseISODate(row.updated);
      let approx = false;

      // No `Updated` cell (pre-1.3 board)? Derive the age from git history rather
      // than reporting a stalled ticket as fine. One git call per ticket, so this
      // is limited to statuses where something is actually waiting.
      if (!when && T.isGateStatus(row.status)) {
        when = T.gitAgeDate(root, rel, row.ticket);
        approx = Boolean(when);
      }
      const age = when ? T.daysSince(when, now) : null;

      if (sla !== null && age !== null && age > sla) {
        report.overdue.push({ ticket: row.ticket, status: row.status, title: row.title, age, sla, board: rel, owner: row.owner, approx });
      }
      // Sitting in a gate status is the shape of "waiting on a verdict nobody posted".
      if (/^(in review|in validation|supervisor gate)$/i.test(String(row.status).trim())) {
        report.awaitingGate.push({ ticket: row.ticket, status: row.status, age, owner: row.owner, title: row.title });
      }
    }
  }

  report.overdue.sort((a, b) => b.age - a.age);
  return report;
}

function severity(r) {
  // Rank repos by how badly they need attention, worst first.
  return (r.overdue.reduce((s, t) => s + t.age, 0)) + r.unowned.length * 10 +
    r.handoff.behind + (r.handoff.placeholders ? 20 : 0) +
    r.boards.filter((b) => b.overBudget).length * 15;
}

function render(reports, today) {
  const out = [];
  out.push(`# agent-team standup — ${today}`);
  out.push('');

  const live = reports.filter((r) => r.exists);
  const missing = reports.filter((r) => !r.exists);

  if (!live.length) {
    out.push('No agent-team deployments found.');
    if (missing.length) {
      out.push('');
      out.push('Checked, but not a deployment (no `ops/PRODUCT.md`):');
      out.push('');
      missing.forEach((r) => out.push(`- \`${r.root}\``));
      out.push('');
      out.push('Run `/start` there, or pass the right repo paths.');
    } else {
      out.push('');
      out.push('Open a deployment repo once so the SessionStart hook registers it, or pass repo paths as arguments.');
    }
    return out.join('\n');
  }

  const totals = {
    open: live.reduce((s, r) => s + r.counts.open, 0),
    overdue: live.reduce((s, r) => s + r.overdue.length, 0),
    unowned: live.reduce((s, r) => s + r.unowned.length, 0),
    staleHandoffs: live.filter((r) => r.handoff.behind >= 5 || r.handoff.placeholders).length,
    fatBoards: live.reduce((s, r) => s + r.boards.filter((b) => b.overBudget).length, 0)
  };

  out.push(`**${live.length} deployment(s) · ${totals.open} open ticket(s) · ${totals.overdue} past SLA · ${totals.unowned} unowned · ${totals.staleHandoffs} stale handoff(s) · ${totals.fatBoards} board(s) over budget**`);
  out.push('');
  out.push('| Repo | Stage | Open | Past SLA | Unowned | Oldest | Handoff |');
  out.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of [...live].sort((a, b) => severity(b) - severity(a))) {
    const oldest = r.overdue.length
      ? `${r.overdue[0].approx ? '~' : ''}${r.overdue[0].age}d (${r.overdue[0].ticket})`
      : '—';
    const handoff = r.handoff.missing ? '**missing**'
      : r.handoff.placeholders ? '**template**'
      : r.handoff.behind >= 5 ? `**${r.handoff.behind} commits behind**`
      : 'current';
    out.push(`| ${r.name} | ${r.stage || '—'} | ${r.counts.open} | ${r.overdue.length} | ${r.unowned.length} | ${oldest} | ${handoff} |`);
  }
  out.push('');

  // Needs-a-decision section, worst first — this is the part a daily report quotes.
  const attention = [];
  for (const r of live) {
    for (const t of r.overdue) {
      const age = `${t.approx ? '~' : ''}${t.age}d`;
      attention.push({ age: t.age, line: `**${r.name}** · ${t.ticket} — ${t.status} **${age}** (SLA ${t.sla}d)${t.owner && t.owner !== '—' ? `, owner ${t.owner}` : ', **no owner**'}${t.title ? ` — ${t.title.slice(0, 70)}` : ''}` });
    }
  }
  attention.sort((a, b) => b.age - a.age);
  if (attention.length) {
    out.push('## Past SLA — oldest first');
    out.push('');
    attention.forEach((a) => out.push(`- ${a.line}`));
    out.push('');
  }

  const unownedAll = live.flatMap((r) => r.unowned.map((u) => `**${r.name}** · ${u.ticket} — ${u.status}${u.title ? ` — ${u.title.slice(0, 70)}` : ''}`));
  if (unownedAll.length) {
    out.push('## Unowned non-terminal tickets');
    out.push('');
    out.push('A gate-spawned follow-up with no owner never moves. Assign or close.');
    out.push('');
    unownedAll.forEach((u) => out.push(`- ${u}`));
    out.push('');
  }

  const gates = live.flatMap((r) => r.awaitingGate.map((g) => `**${r.name}** · ${g.ticket} — ${g.status}${g.age !== null ? ` (${g.age}d)` : ''}${g.owner && g.owner !== '—' ? `, owner ${g.owner}` : ''}`));
  if (gates.length) {
    out.push('## Awaiting a gate verdict');
    out.push('');
    gates.forEach((g) => out.push(`- ${g}`));
    out.push('');
  }

  const hygiene = [];
  for (const r of live) {
    if (r.handoff.missing) hygiene.push(`**${r.name}** — \`ops/PROGRESS.md\` missing; no cross-window bridge.`);
    else if (r.handoff.placeholders) hygiene.push(`**${r.name}** — handoff never filled in (template placeholders).`);
    else if (r.handoff.behind >= 5) hygiene.push(`**${r.name}** — handoff ${r.handoff.behind} commits behind HEAD (last ${r.handoff.date}); treat its claims as unverified.`);
    if (r.dirty) hygiene.push(`**${r.name}** — ${r.dirty} uncommitted path(s) on \`${r.branch}\`; a session did not close cleanly.`);
    for (const b of r.boards.filter((x) => x.overBudget)) {
      hygiene.push(`**${r.name}** — \`${b.rel}\` is ${b.lines} lines (budget ${b.budget}); run the archive sweep.`);
    }
    if (r.missingUpdatedColumn) hygiene.push(`**${r.name}** — Ticket Index has no \`Updated\` column; ages marked \`~\` are derived from git history (approximate). Add \`| Updated |\` and backfill it so SLAs are exact.`);
  }
  if (hygiene.length) {
    out.push('## Hygiene');
    out.push('');
    hygiene.forEach((h) => out.push(`- ${h}`));
    out.push('');
  }

  if (missing.length) {
    out.push('## Registered but not a deployment');
    out.push('');
    missing.forEach((r) => out.push(`- \`${r.root}\` — no \`ops/PRODUCT.md\` (moved or deleted?).`));
    out.push('');
  }

  if (!attention.length && !unownedAll.length && !hygiene.length) {
    out.push('Nothing stuck: every non-terminal ticket is inside its SLA, owned, boards are inside budget, handoffs current.');
    out.push('');
  }
  return out.join('\n');
}

// ---- main ----------------------------------------------------------------
const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const outIdx = argv.indexOf('--out');
const outFile = outIdx !== -1 ? argv[outIdx + 1] : null;
const explicit = argv.filter((a, i) => !a.startsWith('--') && !(outIdx !== -1 && i === outIdx + 1));

const roots = (explicit.length ? explicit : loadRegistry())
  .map((p) => path.resolve(p))
  .filter((p, i, arr) => arr.indexOf(p) === i);

const reports = roots.map(inspect);
// A date is passed in rather than derived, so callers control the stamp.
const today = new Date().toISOString().slice(0, 10);
const text = asJson ? JSON.stringify({ date: today, reports }, null, 2) : render(reports, today);

if (outFile) {
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(path.resolve(outFile), text);
  console.log(`Wrote ${path.resolve(outFile)}`);
} else {
  console.log(text);
}
