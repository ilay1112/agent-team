'use strict';
/**
 * Self-test for the hook layer:  node hooks/test/run-tests.js
 *
 * The plugin gates its own product on tests; the enforcement layer gets the same
 * treatment. Builds throwaway git repos in the OS temp dir, pipes real hook
 * payloads through each hook, and asserts on the emitted JSON.
 *
 * Non-negotiable invariants, asserted for every hook:
 *   - exit code 0, always
 *   - silence in a directory that is not an agent-team deployment
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const HOOKS = path.resolve(__dirname, '..');
const REPO = path.resolve(__dirname, '..', '..');

// Point the deployment registry at a throwaway dir: running tests must never
// write into the owner's real ~/.claude/agent-team/deployments.json.
const STATE = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-team-state-'));
process.env.AGENT_TEAM_STATE_DIR = STATE;

let pass = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) { pass++; console.log(`  ok   ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

/** Run a hook with a payload on stdin; return { code, json, stdout }. */
function runHook(script, payload, cwd) {
  const res = spawnSync(process.execPath, [path.join(HOOKS, script)], {
    input: JSON.stringify(payload),
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, AGENT_TEAM_STATE_DIR: STATE }
  });
  let json = null;
  const out = (res.stdout || '').trim();
  if (out) { try { json = JSON.parse(out); } catch { /* leave null */ } }
  return { code: res.status, json, stdout: out, stderr: res.stderr };
}

function git(cwd, args) {
  execFileSync('git', args, { cwd, stdio: 'ignore', windowsHide: true });
}

function mkTemp(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `agent-team-${label}-`));
}

function write(root, rel, content) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

/** Write .claude/agent-team.json into a deployment (enforcement modes, thresholds). */
function setConfig(root, cfg) {
  fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude', 'agent-team.json'), JSON.stringify(cfg));
}

/** A deployment repo with one clean commit. */
function makeDeployment(opts = {}) {
  const root = mkTemp('repo');
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'test']);

  write(root, 'ops/PRODUCT.md', [
    '# Product', '',
    '## Health check / init commands', '', '```', 'npm test', '```', ''
  ].join('\n'));

  write(root, 'ops/PROGRESS.md', [
    '# PROGRESS', '',
    '## Current handoff (overwrite at session end)', '',
    opts.placeholderHandoff
      ? '- **Repo state:** <branch @ commit hash>'
      : '- **Repo state:** main @ abc1234',
    '- **Health:** `npm test` → 12/12',
    '- **In flight:** none',
    '- **Blockers:** none',
    '- **Next actions:** 1. nothing', '',
    '## Session log (append-only, newest last)', '',
    '| Date | Session | Did | Left state |',
    '|---|---|---|---|', ''
  ].join('\n'));

  write(root, 'TEAM_BOARD.md', opts.board || [
    '# Team Board', '',
    '## Ticket Index (delivery areas)', '',
    '| Ticket | Title | Owner | Gates | Status | Updated |',
    '| --- | --- | --- | --- | --- | --- |',
    '| TKT-WEB-1 | Fresh ticket | web-developer | qa, des | In Progress | 2999-01-01 |', '',
    '## Open threads', ''
  ].join('\n'));

  if (opts.extraFiles) for (const [rel, body] of Object.entries(opts.extraFiles)) write(root, rel, body);

  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'chore: seed deployment']);
  return root;
}

console.log('\n== invariant: silent outside a deployment ==');
{
  const plain = mkTemp('plain');
  for (const script of ['session-start.js', 'board-lint.js', 'merge-gate.js', 'session-end.js']) {
    const r = runHook(script, { cwd: plain, hook_event_name: 'SessionStart', tool_name: 'Bash', tool_input: { command: 'git merge foo' } }, plain);
    check(`${script} exits 0 with no ops/PRODUCT.md`, r.code === 0, `code=${r.code}`);
    check(`${script} emits nothing with no ops/PRODUCT.md`, r.stdout === '', `stdout=${r.stdout.slice(0, 120)}`);
  }
}

console.log('\n== invariant: the plugin\'s own repo is not a deployment ==');
{
  // The plugin ships template ops/ files, so it looks like a deployment. It is not.
  for (const script of ['session-start.js', 'board-lint.js', 'session-end.js']) {
    const r = runHook(script, { cwd: REPO, hook_event_name: 'SessionStart' }, REPO);
    check(`${script} is silent in the plugin source repo`, r.stdout === '', r.stdout.slice(0, 160));
  }
  const fake = makeDeployment();
  fs.mkdirSync(path.join(fake, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(fake, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'some-other-plugin' }));
  const r = runHook('session-start.js', { cwd: fake, hook_event_name: 'SessionStart' }, fake);
  check('a different plugin\'s repo is still a deployment', r.stdout !== '', 'expected output');
}

console.log('\n== session-start ==');
{
  const root = makeDeployment();
  const r = runHook('session-start.js', { cwd: root, hook_event_name: 'SessionStart', source: 'startup' }, root);
  const ctx = r.json && r.json.hookSpecificOutput && r.json.hookSpecificOutput.additionalContext || '';
  check('exits 0', r.code === 0, `code=${r.code}`);
  check('injects a re-anchor block', /agent-team re-anchor/.test(ctx));
  check('reports branch and HEAD', /branch: `main`/.test(ctx) && /HEAD: /.test(ctx), ctx.slice(0, 200));
  check('reports a clean working tree', /working tree: clean/.test(ctx));
  check('carries the handoff through', /main @ abc1234/.test(ctx));
  check('surfaces the health-check command', /npm test/.test(ctx));
  check('clean board reports clean', /Board health — clean/.test(ctx), ctx.slice(-400));
}
{
  // Ticket 40 days old in a status with a 3-day SLA.
  const old = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
  const root = makeDeployment({
    board: [
      '# Team Board', '', '## Ticket Index', '',
      '| Ticket | Title | Owner | Gates | Status | Updated |',
      '| --- | --- | --- | --- | --- | --- |',
      `| TKT-OPS-5 | PROD INCIDENT: PHI reads 500 | devops-engineer | qa, sec | In Review | ${old} |`,
      `| TKT-IOS-3 | Keychain hardening | — | qa, sec | Backlog | ${old} |`, ''
    ].join('\n')
  });
  const r = runHook('session-start.js', { cwd: root, hook_event_name: 'SessionStart' }, root);
  const ctx = r.json.hookSpecificOutput.additionalContext;
  check('flags a ticket past its SLA', /past their age SLA/.test(ctx) && /TKT-OPS-5/.test(ctx), ctx.slice(-600));
  check('reports the age in days', /\*\*40d\*\*/.test(ctx));
  check('flags an unowned non-terminal ticket', /Unowned non-terminal/.test(ctx) && /TKT-IOS-3/.test(ctx));
  check('warns the owner via systemMessage', /board-health finding/.test(r.json.systemMessage || ''));
}
{
  const root = makeDeployment({ placeholderHandoff: true });
  const r = runHook('session-start.js', { cwd: root, hook_event_name: 'SessionStart' }, root);
  const ctx = r.json.hookSpecificOutput.additionalContext;
  check('flags template placeholders in the handoff', /template placeholders/.test(ctx));
}
{
  // Pre-1.3 board: no Updated column → git-derived age, never a crash and never
  // a false "nothing is stuck". The seed commit is today, so age 0 is not overdue;
  // the point is that the fallback ran and produced a real date.
  const root = makeDeployment({
    board: [
      '# Team Board', '', '## Ticket Index', '',
      '| Ticket | Title | Owner | Gates | Status |',
      '| --- | --- | --- | --- | --- |',
      '| TKT-API-2 | Something | backend-platform | qa | In Progress |', ''
    ].join('\n')
  });
  const r = runHook('session-start.js', { cwd: root, hook_event_name: 'SessionStart' }, root);
  const ctx = r.json.hookSpecificOutput.additionalContext;
  check('tolerates a board with no Updated column', r.code === 0 && /no `Updated` column/.test(ctx), ctx.slice(-300));

  // Backdate the commit that introduced the ticket, then confirm the fallback ages it.
  const old = makeDeployment({
    board: ['# Team Board', '', '## Ticket Index', '',
      '| Ticket | Title | Owner | Gates | Status |',
      '| --- | --- | --- | --- | --- |', ''].join('\n')
  });
  fs.appendFileSync(path.join(old, 'TEAM_BOARD.md'),
    '| TKT-OPS-5 | PROD INCIDENT: PHI reads 500 | devops-engineer | qa, sec | In Review |\n');
  const stamp = new Date(Date.now() - 16 * 86400000).toISOString();
  execFileSync('git', ['add', '-A'], { cwd: old, stdio: 'ignore', windowsHide: true });
  execFileSync('git', ['commit', '-qm', 'chore: file TKT-OPS-5'], {
    cwd: old, stdio: 'ignore', windowsHide: true,
    env: { ...process.env, GIT_AUTHOR_DATE: stamp, GIT_COMMITTER_DATE: stamp }
  });
  const r2 = runHook('session-start.js', { cwd: old, hook_event_name: 'SessionStart' }, old);
  const ctx2 = r2.json.hookSpecificOutput.additionalContext;
  check('derives a ticket age from git when Updated is absent', /TKT-OPS-5\*\* — In Review, \*\*~16d\*\*/.test(ctx2), ctx2.slice(-700));
  check('marks a git-derived age approximate', /~16d/.test(ctx2));
}
{
  const root = makeDeployment({ board: `# Team Board\n\n## Ticket Index\n\n${'filler line\n'.repeat(400)}` });
  const r = runHook('session-start.js', { cwd: root, hook_event_name: 'SessionStart' }, root);
  const ctx = r.json.hookSpecificOutput.additionalContext;
  check('flags an over-budget board', /is \*\*4\d\d lines\*\*/.test(ctx), ctx.slice(-300));
}

console.log('\n== status drift is still recognised ==');
{
  // Real boards drifted to freeform status prose. A matcher that only accepts the
  // canonical spelling reports a rotting board as healthy.
  const old = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10);
  const root = makeDeployment({
    board: [
      '# Team Board', '', '## Ticket Index', '',
      '| Ticket | Title | Owner | Gates | Status | Updated |',
      '| --- | --- | --- | --- | --- | --- |',
      `| FF-DATA-8 | security follow-up | backend-platform | qa, sec | In Review — waiting on KMS | ${old} |`,
      `| FF-WEB-4 | staged on a branch | web-developer | qa | In Validation (branch only) | ${old} |`,
      `| FF-WEB-8 | shipped | web-developer | qa | Done (LIVE-VERIFIED in owner browser) | ${old} |`, ''
    ].join('\n')
  });
  const r = runHook('session-start.js', { cwd: root, hook_event_name: 'SessionStart' }, root);
  const ctx = r.json.hookSpecificOutput.additionalContext;
  check('freeform "In Review — …" still ages', /FF-DATA-8/.test(ctx), ctx.slice(-500));
  check('freeform "In Validation (…)" still ages', /FF-WEB-4/.test(ctx));
  check('freeform "Done (…)" is still treated as terminal', !/FF-WEB-8/.test(ctx), ctx.slice(-500));
  check('non-canonical ticket IDs (FF-*) are handled', /FF-DATA-8/.test(ctx));
}

console.log('\n== board-lint (PostToolUse) ==');
{
  const root = makeDeployment();
  const good = [
    '#### [SIGN-OFF] qa-validator → orchestrator · 2026-07-30',
    '**Ticket:** TKT-WEB-1',
    'Ran the suite; ACCEPT bullets 1-3 verified.',
    '**Status:** CLEAR'
  ].join('\n');
  const r = runHook('board-lint.js', {
    cwd: root, hook_event_name: 'PostToolUse', tool_name: 'Edit',
    tool_input: { file_path: path.join(root, 'TEAM_BOARD.md'), new_string: good }
  }, root);
  check('a canonical entry passes silently', r.code === 0 && r.stdout === '', r.stdout.slice(0, 200));
}
{
  const root = makeDeployment();
  const bad = [
    '#### [SIGN-OFF] qa-validator → orchestrator · 2026-07-30',
    '**Ticket:** TKT-WEB-1',
    `Verbose narration. ${'word '.repeat(120)}`,
    '**Status:** Done (LIVE-VERIFIED in owner browser, all good)'
  ].join('\n');
  const r = runHook('board-lint.js', {
    cwd: root, hook_event_name: 'PostToolUse', tool_name: 'Edit',
    tool_input: { file_path: path.join(root, 'TEAM_BOARD.md'), new_string: bad }
  }, root);
  const msg = (r.json && r.json.systemMessage) || '';
  check('flags an over-length entry', /budget 80/.test(msg), msg.slice(0, 300));
  check('flags an off-enum Status', /off-enum/.test(msg));
}
{
  const root = makeDeployment();
  const missing = [
    '#### [UPDATE] web-developer → team · 2026-07-30',
    'Did some work.'
  ].join('\n');
  const r = runHook('board-lint.js', {
    cwd: root, hook_event_name: 'PostToolUse', tool_name: 'Edit',
    tool_input: { file_path: path.join(root, 'TEAM_BOARD.md'), new_string: missing }
  }, root);
  const msg = (r.json && r.json.systemMessage) || '';
  check('flags a missing **Status:** line', /missing `\*\*Status:\*\*`/.test(msg), msg.slice(0, 300));
  check('flags a missing **Ticket:** line', /missing `\*\*Ticket:\*\*/.test(msg));
}
{
  const root = makeDeployment();
  const r = runHook('board-lint.js', {
    cwd: root, hook_event_name: 'PostToolUse', tool_name: 'Edit',
    tool_input: { file_path: path.join(root, 'src/app.ts'), new_string: 'const x = 1;' }
  }, root);
  check('ignores writes to non-board files', r.code === 0 && r.stdout === '', r.stdout.slice(0, 120));
}
{
  const root = makeDeployment();
  setConfig(root, { enforce: { boardLint: 'block' } });
  const bad = ['#### [UPDATE] web-developer → team · 2026-07-30', 'No status here.'].join('\n');
  const r = runHook('board-lint.js', {
    cwd: root, hook_event_name: 'PostToolUse', tool_name: 'Edit',
    tool_input: { file_path: path.join(root, 'TEAM_BOARD.md'), new_string: bad }
  }, root);
  check('block mode returns decision=block', r.json && r.json.decision === 'block', JSON.stringify(r.json).slice(0, 200));
  check('block mode still exits 0', r.code === 0, `code=${r.code}`);
}

console.log('\n== board-lint (SubagentStop) ==');
{
  const root = makeDeployment();
  fs.appendFileSync(path.join(root, 'TEAM_BOARD.md'),
    '\n#### [HANDOFF] web-developer → qa-validator · 2026-07-30\n**Ticket:** TKT-WEB-1\nno status line at all\n');
  const r = runHook('board-lint.js', { cwd: root, hook_event_name: 'SubagentStop' }, root);
  const msg = (r.json && r.json.systemMessage) || '';
  check('lints uncommitted board additions', /missing `\*\*Status:\*\*`/.test(msg), msg.slice(0, 300));
}
{
  const root = makeDeployment();
  write(root, 'src/app.ts', 'export const x = 1;');
  const r = runHook('board-lint.js', { cwd: root, hook_event_name: 'SubagentStop' }, root);
  const msg = (r.json && r.json.systemMessage) || '';
  check('notices code written with no board entry', /no board entry/.test(msg), msg.slice(0, 300));
}
{
  const root = makeDeployment();
  const r = runHook('board-lint.js', { cwd: root, hook_event_name: 'SubagentStop' }, root);
  check('clean tree on SubagentStop is silent', r.stdout === '', r.stdout.slice(0, 200));
}

console.log('\n== merge-gate ==');
{
  const root = makeDeployment();
  git(root, ['checkout', '-qb', 'feat/TKT-WEB-1-thing']);
  const r = runHook('merge-gate.js', {
    cwd: root, hook_event_name: 'PreToolUse', tool_name: 'Bash',
    tool_input: { command: 'git merge feat/TKT-WEB-1-thing' }
  }, root);
  const msg = (r.json && r.json.systemMessage) || '';
  check('blocks-by-warning when no SIGN-OFFs exist', /not cleared to merge/.test(msg), msg.slice(0, 300));
  check('names the missing qa gate', /qa-validator — no/.test(msg));
  check('names the missing design gate (from the Gates cell)', /design-expert — no/.test(msg));
  check('names the missing supervisor verdict', /supervisor — no goal-conformance/.test(msg));
  check('warn mode does not deny', !(r.json && r.json.hookSpecificOutput));
}
{
  const board = [
    '# Team Board', '', '## Ticket Index', '',
    '| Ticket | Title | Owner | Gates | Status | Updated |',
    '| --- | --- | --- | --- | --- | --- |',
    '| TKT-WEB-1 | Thing | web-developer | qa, des | Supervisor Gate | 2999-01-01 |', '',
    '## Open threads', '',
    '#### [SIGN-OFF] qa-validator → orchestrator · 2026-07-30',
    '**Ticket:** TKT-WEB-1', 'Suite green.', '**Status:** CLEAR', '',
    '#### [SIGN-OFF] design-expert → orchestrator · 2026-07-30',
    '**Ticket:** TKT-WEB-1', 'Tokens correct.', '**Status:** BLOCK', '',
    '#### [SIGN-OFF] design-expert → orchestrator · 2026-07-30',
    '**Ticket:** TKT-WEB-1', 'Delta re-verified.', '**Status:** CLEAR', '',
    '#### [SIGN-OFF] supervisor → orchestrator · 2026-07-30',
    '**Ticket:** TKT-WEB-1', 'GOAL delivered.', '**Status:** MEETS', ''
  ].join('\n');
  const root = makeDeployment({ board });
  git(root, ['checkout', '-qb', 'feat/TKT-WEB-1-thing']);
  const r = runHook('merge-gate.js', {
    cwd: root, hook_event_name: 'PreToolUse', tool_name: 'Bash',
    tool_input: { command: 'git merge feat/TKT-WEB-1-thing' }
  }, root);
  check('fully gated ticket merges silently', r.stdout === '', r.stdout.slice(0, 300));

  // Same board, but the last design verdict is a BLOCK.
  const blocked = board.replace(
    '**Ticket:** TKT-WEB-1\nDelta re-verified.\n**Status:** CLEAR',
    '**Ticket:** TKT-WEB-1\nStill wrong.\n**Status:** BLOCK'
  );
  const root2 = makeDeployment({ board: blocked });
  git(root2, ['checkout', '-qb', 'feat/TKT-WEB-1-thing']);
  const r2 = runHook('merge-gate.js', {
    cwd: root2, hook_event_name: 'PreToolUse', tool_name: 'Bash',
    tool_input: { command: 'git merge feat/TKT-WEB-1-thing' }
  }, root2);
  const msg2 = (r2.json && r2.json.systemMessage) || '';
  check('the LAST verdict wins (BLOCK after CLEAR blocks)', /design-expert — last verdict `BLOCK`/.test(msg2), msg2.slice(0, 300));
}
{
  const root = makeDeployment();
  git(root, ['checkout', '-qb', 'feat/TKT-WEB-1-thing']);
  setConfig(root, { enforce: { mergeGate: 'block' } });
  const r = runHook('merge-gate.js', {
    cwd: root, hook_event_name: 'PreToolUse', tool_name: 'Bash',
    tool_input: { command: 'git merge feat/TKT-WEB-1-thing' }
  }, root);
  const hso = (r.json && r.json.hookSpecificOutput) || {};
  check('block mode denies the merge', hso.permissionDecision === 'deny', JSON.stringify(hso).slice(0, 200));
  check('deny carries a reason', /not cleared to merge/.test(hso.permissionDecisionReason || ''));
  check('block mode still exits 0', r.code === 0, `code=${r.code}`);
}
{
  const root = makeDeployment();
  const r = runHook('merge-gate.js', {
    cwd: root, hook_event_name: 'PreToolUse', tool_name: 'Bash',
    tool_input: { command: 'git status && npm test' }
  }, root);
  check('ignores non-merge Bash commands', r.stdout === '', r.stdout.slice(0, 120));

  const r2 = runHook('merge-gate.js', {
    cwd: root, hook_event_name: 'PreToolUse', tool_name: 'Bash',
    tool_input: { command: 'git merge some-branch' }
  }, root);
  check('ignores a merge with no identifiable ticket', r2.stdout === '', r2.stdout.slice(0, 120));

  const r3 = runHook('merge-gate.js', {
    cwd: root, hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: 'x' }
  }, root);
  check('ignores non-Bash tools', r3.stdout === '', r3.stdout.slice(0, 120));
}

console.log('\n== session-end ==');
{
  const root = makeDeployment();
  const r = runHook('session-end.js', { cwd: root, hook_event_name: 'Stop', stop_hook_active: false }, root);
  check('clean session stops silently', r.stdout === '', r.stdout.slice(0, 200));
}
{
  const root = makeDeployment();
  write(root, 'src/app.ts', 'export const x = 1;');
  const r = runHook('session-end.js', { cwd: root, hook_event_name: 'Stop' }, root);
  const msg = (r.json && r.json.systemMessage) || '';
  check('flags an uncommitted working tree', /uncommitted path/.test(msg), msg.slice(0, 300));
  check('flags an untouched handoff', /was not touched this session/.test(msg));
}
{
  const root = makeDeployment();
  write(root, 'src/app.ts', 'export const x = 1;');
  setConfig(root, { enforce: { sessionEnd: 'block' } });
  const r = runHook('session-end.js', { cwd: root, hook_event_name: 'Stop', stop_hook_active: false }, root);
  check('block mode blocks the stop', r.json && r.json.decision === 'block', JSON.stringify(r.json).slice(0, 200));

  const r2 = runHook('session-end.js', { cwd: root, hook_event_name: 'Stop', stop_hook_active: true }, root);
  check('never blocks twice (no Stop-hook loop)', !(r2.json && r2.json.decision === 'block'), JSON.stringify(r2.json).slice(0, 200));
}
{
  const root = makeDeployment({ placeholderHandoff: true });
  write(root, 'src/app.ts', 'export const x = 1;');
  const r = runHook('session-end.js', { cwd: root, hook_event_name: 'Stop' }, root);
  check('flags placeholders left in the handoff', /template placeholders/.test((r.json && r.json.systemMessage) || ''));
}

console.log('\n== deployment registry ==');
{
  const registry = path.join(STATE, 'deployments.json');
  const before = fs.existsSync(registry) ? JSON.parse(fs.readFileSync(registry, 'utf8')).deployments.length : 0;
  const root = makeDeployment();
  runHook('session-start.js', { cwd: root, hook_event_name: 'SessionStart' }, root);
  runHook('session-start.js', { cwd: root, hook_event_name: 'SessionStart' }, root);
  const after = JSON.parse(fs.readFileSync(registry, 'utf8')).deployments;
  check('a deployment self-registers on SessionStart', after.some((d) => path.resolve(d) === path.resolve(root)));
  check('registration is idempotent', after.filter((d) => path.resolve(d) === path.resolve(root)).length === 1);
  check('registry grew by exactly one', after.length === before + 1, `${before} -> ${after.length}`);

  const plain = mkTemp('plain2');
  runHook('session-start.js', { cwd: plain, hook_event_name: 'SessionStart' }, plain);
  const after2 = JSON.parse(fs.readFileSync(registry, 'utf8')).deployments;
  check('a non-deployment is never registered', !after2.some((d) => path.resolve(d) === path.resolve(plain)));
}

console.log('\n== standup collector ==');
{
  const old = new Date(Date.now() - 16 * 86400000).toISOString().slice(0, 10);
  const stuck = makeDeployment({
    board: [
      '# Team Board', '', '## Ticket Index', '',
      '| Ticket | Title | Owner | Gates | Status | Updated |',
      '| --- | --- | --- | --- | --- | --- |',
      `| TKT-OPS-5 | PROD INCIDENT: PHI reads 500 | devops-engineer | qa, sec | In Review | ${old} |`,
      `| TKT-API-3 | prod SQL function missing | — | qa | Backlog | ${old} |`,
      '| TKT-WEB-9 | Shipped thing | web-developer | qa | Done | 2026-07-01 |', ''
    ].join('\n')
  });
  const clean = makeDeployment();

  const res = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'standup.js'), stuck, clean], {
    encoding: 'utf8', windowsHide: true, env: { ...process.env, AGENT_TEAM_STATE_DIR: STATE }
  });
  const out = res.stdout || '';
  check('standup exits 0', res.status === 0, `code=${res.status} ${res.stderr}`);
  check('reports both deployments', out.includes(path.basename(stuck)) && out.includes(path.basename(clean)), out.slice(0, 400));
  check('flags the 16-day In Review ticket', /TKT-OPS-5 — In Review \*\*16d\*\*/.test(out), out.slice(0, 900));
  check('flags the unowned ticket', /Unowned non-terminal/.test(out) && /TKT-API-3/.test(out));
  check('lists it as awaiting a gate verdict', /Awaiting a gate verdict/.test(out) && /TKT-OPS-5/.test(out));
  check('excludes Done tickets from the open count', !/TKT-WEB-9/.test(out), out.slice(0, 600));

  const j = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'standup.js'), '--json', stuck], {
    encoding: 'utf8', windowsHide: true, env: { ...process.env, AGENT_TEAM_STATE_DIR: STATE }
  });
  let parsed = null;
  try { parsed = JSON.parse(j.stdout); } catch { /* leave null */ }
  check('--json emits valid JSON', parsed && Array.isArray(parsed.reports), (j.stdout || '').slice(0, 200));
  check('--json carries ticket ages', parsed && parsed.reports[0].overdue.some((t) => t.age === 16));

  const outFile = path.join(mkTemp('out'), 'nested', 'standup.md');
  const w = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'standup.js'), '--out', outFile, stuck], {
    encoding: 'utf8', windowsHide: true, env: { ...process.env, AGENT_TEAM_STATE_DIR: STATE }
  });
  check('--out writes the report (creating parent dirs)', w.status === 0 && fs.existsSync(outFile), `code=${w.status} ${w.stderr}`);

  const e = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'standup.js'), mkTemp('notadeployment')], {
    encoding: 'utf8', windowsHide: true, env: { ...process.env, AGENT_TEAM_STATE_DIR: STATE }
  });
  check('a non-deployment path degrades gracefully', e.status === 0 && /not a deployment/i.test(e.stdout), (e.stdout || '').slice(0, 300));
}

console.log('\n== malformed input is survivable ==');
{
  const root = makeDeployment();
  for (const script of ['session-start.js', 'board-lint.js', 'merge-gate.js', 'session-end.js']) {
    const res = spawnSync(process.execPath, [path.join(HOOKS, script)], {
      input: 'not json at all', cwd: root, encoding: 'utf8', windowsHide: true
    });
    check(`${script} survives non-JSON stdin`, res.status === 0, `code=${res.status}`);
  }
}

console.log(`\n${failures.length ? 'FAILED' : 'PASSED'} — ${pass} assertion(s) passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
