'use strict';
/**
 * SessionStart — mechanize the re-anchor sequence (HARNESS §2) and surface rot.
 *
 * HARNESS §2 asks every session to run `git log`/`git status`, read the PROGRESS
 * handoff, and check health before new work. As prose that step was skipped often
 * enough that a production PHI incident sat In Review for 16 days. This hook does
 * steps 1-2 for free and puts the answer in the session's opening context.
 *
 * It also warns about the four decay modes the audit found across deployments:
 *   stale handoff · non-terminal tickets past SLA · unowned tickets · oversized boards.
 */

const path = require('path');
const T = require('./lib/team');

T.run(() => {
  const input = T.readInput();
  const root = T.findRoot(input.cwd || process.cwd());
  if (!root) T.emitNothing(); // not an agent-team deployment — stay out of the way

  const cfg = T.loadConfig(root);
  const now = new Date();
  const context = [];
  const warnings = [];

  // Self-register so /standup sees this repo without any configuration.
  if (cfg.register !== false) T.registerDeployment(root);

  // ---- 1. Repo state (HARNESS §2.1) -------------------------------------
  const branch = T.git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const head = T.git(root, ['log', '-1', '--format=%h %cs %s']);
  const dirty = T.git(root, ['status', '--porcelain']);
  const recent = T.git(root, ['log', '--oneline', '-5']);

  if (branch || head) {
    context.push('**Repo state**');
    if (branch) context.push(`- branch: \`${branch}\``);
    if (head) context.push(`- HEAD: ${head}`);
    const dirtyCount = dirty ? dirty.split(/\r?\n/).filter(Boolean).length : 0;
    context.push(`- working tree: ${dirtyCount === 0 ? 'clean' : `**${dirtyCount} uncommitted path(s)** — a previous session did not close cleanly (HARNESS §3)`}`);
    if (recent) context.push(`- last commits:\n${recent.split(/\r?\n/).map((l) => `    ${l}`).join('\n')}`);
  }

  // ---- 2. Current handoff (HARNESS §2.2) --------------------------------
  // Repo-relative paths stay POSIX in output and in git arguments — a
  // backslash here would both read wrong and break `git log -- <path>`.
  const progressRel = 'ops/PROGRESS.md';
  const progress = T.readFileSafe(path.join(root, 'ops', 'PROGRESS.md'));
  if (progress) {
    const m = progress.match(/##\s*Current handoff[^\n]*\n([\s\S]*?)(?=\n##\s|$)/);
    const handoff = m ? m[1].trim() : null;
    if (handoff) {
      // Cap the injection: a handoff that overflows is itself the finding.
      const lines = handoff.split(/\r?\n/).filter((l) => l.trim());
      const shown = lines.slice(0, 14);
      context.push('\n**Current handoff** (`ops/PROGRESS.md`)');
      context.push(shown.map((l) => (l.startsWith('-') ? l : `  ${l}`)).join('\n'));
      if (lines.length > shown.length) {
        context.push(`  …${lines.length - shown.length} more line(s) — read \`${progressRel}\` if you need them.`);
      }
      if (/<[a-z][^>]*>/i.test(handoff)) {
        warnings.push(`\`${progressRel}\` Current handoff still holds template placeholders — the last session did not overwrite it (HARNESS §3).`);
      }
    }

    // Staleness by git history, not mtime: mtime lies after a clone or a sync.
    const sha = T.git(root, ['log', '-1', '--format=%H', '--', progressRel]);
    if (sha) {
      const behind = parseInt(T.git(root, ['rev-list', '--count', `${sha}..HEAD`]) || '0', 10);
      const limit = cfg.staleHandoffCommits || 5;
      if (behind >= limit) {
        const when = T.git(root, ['log', '-1', '--format=%cs', '--', progressRel]);
        warnings.push(`\`${progressRel}\` is **${behind} commits behind HEAD** (last updated ${when}). The handoff is the bridge between context windows — treat what it says as unverified and re-derive state from git.`);
      }
    }
  } else {
    warnings.push(`\`${progressRel}\` is missing — the harness has no cross-window bridge. Create it from the plugin template.`);
  }

  // ---- 3. Health check command (HARNESS §2.4) ---------------------------
  const product = T.readFileSafe(path.join(root, 'ops', 'PRODUCT.md'));
  if (product) {
    const hc = product.match(/##[^\n]*Health check[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i);
    if (hc) {
      const cmds = hc[1].split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !/^<.*>$/.test(l))
        .slice(0, 6);
      if (cmds.length) {
        context.push('\n**Health check — run before new work** (HARNESS §2.4)');
        context.push(cmds.map((l) => `  ${l}`).join('\n'));
      }
    }
  }

  // ---- 4. Board health: SLAs, owners, size ------------------------------
  let missingUpdatedColumn = false;
  let gitAgeLookups = 0;
  const overdue = [];
  const unowned = [];

  for (const rel of cfg.boards) {
    const text = T.readFileSafe(path.join(root, rel));
    if (!text) continue;

    const lineCount = text.split(/\r?\n/).length;
    if (lineCount > cfg.boardMaxLines) {
      warnings.push(`\`${rel}\` is **${lineCount} lines** (budget ${cfg.boardMaxLines}). Every session greps this file. Run the archive sweep: Done rows past the last ${cfg.keepDoneRows} move to \`${rel.replace(/\.md$/, '_ARCHIVE.md')}\`.`);
    }

    const { rows, hasUpdatedColumn } = T.parseTicketIndex(text);
    if (rows.length && !hasUpdatedColumn) missingUpdatedColumn = true;

    for (const row of rows) {
      if (T.isTerminal(row.status)) continue;

      if (!row.owner || row.owner === '—' || row.owner === '-' || /^tbd$/i.test(row.owner)) {
        unowned.push(`${row.ticket} (${row.status || 'no status'})`);
      }

      const sla = T.slaFor(row.status, cfg.ticketAgeDays);
      let when = T.parseISODate(row.updated);
      let approx = false;

      // Pre-1.3 board with no `Updated` cell: fall back to git history, but only
      // for statuses where something is waiting, and only for the first few — this
      // costs one git call each and SessionStart must stay fast.
      if (!when && T.isGateStatus(row.status) && gitAgeLookups < (cfg.maxGitAgeLookups || 12)) {
        gitAgeLookups++;
        when = T.gitAgeDate(root, rel, row.ticket);
        approx = Boolean(when);
      }

      if (sla !== null && when) {
        const age = T.daysSince(when, now);
        if (age > sla) {
          overdue.push({ ticket: row.ticket, status: row.status, age, sla, board: rel, title: row.title, approx });
        }
      }
    }
  }

  if (overdue.length) {
    overdue.sort((a, b) => b.age - a.age);
    const lines = overdue.slice(0, 8).map((t) =>
      `  - **${t.ticket}** — ${t.status}, **${t.approx ? '~' : ''}${t.age}d** (SLA ${t.sla}d) · ${t.board}${t.title ? ` · ${t.title.slice(0, 60)}` : ''}`
    );
    if (overdue.length > 8) lines.push(`  - …${overdue.length - 8} more past SLA.`);
    warnings.push(`**${overdue.length} non-terminal ticket(s) past their age SLA:**\n${lines.join('\n')}\n  Chase or close these before opening new work (WORKFLOW §9, COO cadence).`);
  }

  if (unowned.length) {
    warnings.push(`**Unowned non-terminal ticket(s):** ${unowned.slice(0, 10).join(', ')}${unowned.length > 10 ? ` (+${unowned.length - 10})` : ''}. A gate-spawned follow-up with no owner never moves — assign one or close it.`);
  }

  if (missingUpdatedColumn) {
    warnings.push('Ticket Index has no `Updated` column, so ages marked `~` above were derived from git history (approximate) and only for tickets awaiting someone. Add `| Updated |` (ISO date, rewritten on every status change) to the index header and backfill it — see the plugin\'s `TEAM_BOARD.md` template.');
  }

  // ---- Output ----------------------------------------------------------
  const out = {};
  if (context.length) {
    out.hookSpecificOutput = {
      hookEventName: 'SessionStart',
      additionalContext: [
        '## agent-team re-anchor (HARNESS §2, generated by hook)',
        '',
        context.join('\n'),
        '',
        warnings.length
          ? `### Board health — ${warnings.length} finding(s)\n${warnings.map((w) => `- ${w}`).join('\n')}`
          : '### Board health — clean (SLAs met, boards inside budget, handoff current)',
        '',
        'Steps 1-2 of the re-anchor are done above. Continue at step 3 (your Read-first list), then run the health check.'
      ].join('\n')
    };
  }
  if (warnings.length) {
    out.systemMessage = `agent-team: ${warnings.length} board-health finding(s) — see the re-anchor block.`;
  }
  T.emit(out);
});
