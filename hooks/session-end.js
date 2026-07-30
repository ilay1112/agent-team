'use strict';
/**
 * Stop — the clean-state contract (HARNESS §3) gets checked instead of trusted.
 *
 * The audit found a handoff seven days staler than its board, still naming
 * finished work as in-flight, plus a deployment that shipped with 132 lint
 * errors. Both are "did the session close properly" questions.
 *
 * Checks: working tree clean · handoff refreshed this session · no placeholders
 * left in the handoff block.
 */

const path = require('path');
const T = require('./lib/team');

T.run(() => {
  const input = T.readInput();

  // Never block twice — a Stop hook that re-blocks its own continuation loops.
  const alreadyContinued = Boolean(input.stop_hook_active);

  const root = T.findRoot(input.cwd || process.cwd());
  if (!root) T.emitNothing();

  const cfg = T.loadConfig(root);
  const findings = [];

  // ---- 1. Working tree ---------------------------------------------------
  const status = T.git(root, ['status', '--porcelain']);
  if (status && status.trim()) {
    const paths = status.split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).trim());
    findings.push(`**${paths.length} uncommitted path(s)** — ${paths.slice(0, 5).join(', ')}${paths.length > 5 ? `, +${paths.length - 5}` : ''}. Nothing half-implemented reaches \`main\`: commit the ticket, or park it on its branch with a one-line board note (HARNESS §3).`);
  }

  // ---- 2. Handoff refreshed this session ---------------------------------
  const progressRel = 'ops/PROGRESS.md';
  const progressAbs = path.join(root, 'ops', 'PROGRESS.md');
  const progress = T.readFileSafe(progressAbs);

  if (!progress) {
    findings.push(`\`${progressRel}\` is missing — the next context window has nothing to re-anchor on.`);
  } else {
    const dirtyHandoff = T.git(root, ['status', '--porcelain', '--', progressRel]);
    const inHead = T.git(root, ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']);
    const committedNow = Boolean(inHead && inHead.split(/\r?\n/).some((p) => p.trim() === progressRel));
    const touched = Boolean((dirtyHandoff && dirtyHandoff.trim()) || committedNow);

    // Only complain when there is something to record. Two honest signals:
    // uncommitted work in the tree, or a handoff that has fallen behind HEAD.
    // (Wall-clock recency is NOT a signal — it fires on any repo someone else
    // committed to recently, which flags sessions that did nothing at all.)
    const sha = T.git(root, ['log', '-1', '--format=%H', '--', progressRel]);
    const behind = sha
      ? parseInt(T.git(root, ['rev-list', '--count', `${sha}..HEAD`]) || '0', 10)
      : 0;
    const didWork = Boolean(status && status.trim()) || behind >= (cfg.staleHandoffCommits || 5);

    if (!touched && didWork) {
      findings.push(`\`${progressRel}\` **Current handoff** was not touched this session. Overwrite it with repo state, health, in-flight tickets, blockers and next actions, then append one Session log line (HARNESS §3).`);
    }

    const m = progress.match(/##\s*Current handoff[^\n]*\n([\s\S]*?)(?=\n##\s|$)/);
    if (m && /<[a-z][^>]*>/i.test(m[1])) {
      findings.push(`\`${progressRel}\` **Current handoff** still contains template placeholders (\`<…>\`) — it has never been filled in for this deployment.`);
    }
  }

  if (!findings.length) T.emitNothing();

  const message = [
    `**agent-team session-end check — ${findings.length} finding(s)** (HARNESS §3 clean-state contract)`,
    '',
    ...findings.map((f) => `- ${f}`)
  ].join('\n');

  if (cfg.enforce.sessionEnd === 'block' && !alreadyContinued) {
    T.emit({
      decision: 'block',
      reason: `${message}\n\nClose the session properly, then stop again. If the work is deliberately parked, say so in the handoff and stop — this check will pass once the handoff records it.`,
      systemMessage: `agent-team: session not in clean state — ${findings.length} finding(s).`
    });
  }
  T.emit({ systemMessage: message });
});
