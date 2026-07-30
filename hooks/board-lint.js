'use strict';
/**
 * Board lint — the entry format stops being advisory.
 *
 * Runs on two events:
 *   PostToolUse (Edit|Write|MultiEdit) — lint the text just written to a board.
 *   SubagentStop                       — lint whatever a worker appended, and
 *                                        notice code written with no board entry.
 *
 * Why: across four deployments the fixed entry block forked into three
 * incompatible formats mid-run and never recovered, `**Status:**` vanished from
 * 45% of entries, and 83% of entries blew the 80-word budget (mean 449, worst
 * ~2,300). Every one of those is deterministically checkable at write time.
 */

const path = require('path');
const T = require('./lib/team');

/** Is this path one of the deployment's boards (or a board-shaped file)? */
function isBoardPath(root, filePath, cfg) {
  if (!filePath) return false;
  const rel = path.relative(root, path.resolve(root, filePath)).split(path.sep).join('/');
  if (rel.startsWith('..')) return false;
  if (cfg.boards.some((b) => b.split(path.sep).join('/') === rel)) return true;
  return /(^|\/)(TEAM_BOARD|[A-Z_]+_BOARD)\.md$/.test(rel);
}

/** Text the tool call is adding — the precise thing to lint, not the whole file. */
function writtenText(toolName, toolInput) {
  if (!toolInput) return '';
  if (toolName === 'Write') return toolInput.content || '';
  if (toolName === 'Edit') return toolInput.new_string || '';
  if (toolName === 'MultiEdit' && Array.isArray(toolInput.edits)) {
    return toolInput.edits.map((e) => e.new_string || '').join('\n\n');
  }
  return toolInput.new_string || toolInput.content || '';
}

/** Uncommitted additions to board files, as one blob of markdown. */
function pendingBoardAdditions(root, cfg) {
  const paths = cfg.boards;
  const diff = T.git(root, ['diff', 'HEAD', '-U0', '--', ...paths]);
  let text = '';
  if (diff) {
    text += diff.split(/\r?\n/)
      .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
      .map((l) => l.slice(1))
      .join('\n');
  }
  return text;
}

function boardsDirty(root, cfg) {
  const status = T.git(root, ['status', '--porcelain', '--', ...cfg.boards]);
  return Boolean(status && status.trim());
}

function nonBoardDirty(root, cfg) {
  const status = T.git(root, ['status', '--porcelain']);
  if (!status) return [];
  const boardSet = new Set(cfg.boards.map((b) => b.split(path.sep).join('/')));
  return status.split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.slice(3).trim().replace(/^"|"$/g, ''))
    .filter((p) => !boardSet.has(p) && !/(^|\/)(TEAM_BOARD|[A-Z_]+_BOARD)\.md$/.test(p))
    // ops/ bookkeeping is not product code; a worker touching only ops/ needs no entry.
    .filter((p) => !p.startsWith('ops/'));
}

T.run(() => {
  const input = T.readInput();
  const root = T.findRoot(input.cwd || process.cwd());
  if (!root) T.emitNothing();

  const cfg = T.loadConfig(root);
  const event = input.hook_event_name || '';
  const problems = [];
  const notes = [];

  if (event === 'SubagentStop') {
    const added = pendingBoardAdditions(root, cfg);
    if (added.trim()) problems.push(...T.lintEntries(added, cfg));

    if (cfg.requireBoardEntryOnSubagentStop !== false) {
      const code = nonBoardDirty(root, cfg);
      if (code.length && !boardsDirty(root, cfg)) {
        notes.push(`This dispatch left ${code.length} uncommitted non-board path(s) (${code.slice(0, 3).join(', ')}${code.length > 3 ? ', …' : ''}) and no board entry. Every worker closes with one HANDOFF block on its board (HARNESS §1, TOKEN_POLICY §2).`);
      }
    }
  } else {
    const toolName = input.tool_name || '';
    const filePath = (input.tool_input && input.tool_input.file_path) || '';
    if (!isBoardPath(root, filePath, cfg)) T.emitNothing();

    const text = writtenText(toolName, input.tool_input);
    if (!text.trim()) T.emitNothing();
    problems.push(...T.lintEntries(text, cfg));

    // Size budget: warn on the write that crosses it, while the fix is still cheap.
    const full = T.readFileSafe(path.resolve(root, filePath));
    if (full) {
      const lines = full.split(/\r?\n/).length;
      if (lines > cfg.boardMaxLines) {
        const rel = path.relative(root, path.resolve(root, filePath)).split(path.sep).join('/');
        notes.push(`\`${rel}\` is now **${lines} lines** (budget ${cfg.boardMaxLines}). Move Done rows past the last ${cfg.keepDoneRows} into \`${rel.replace(/\.md$/, '_ARCHIVE.md')}\` — the sweep is cheap now and a 4,900-line board later (TOKEN_POLICY §3).`);
      }
    }
  }

  if (!problems.length && !notes.length) T.emitNothing();

  const sections = [];
  if (problems.length) {
    sections.push(`**Board entry format — ${problems.length} problem(s):**\n${problems.map((p) => `- ${p}`).join('\n')}`);
  }
  if (notes.length) {
    sections.push(notes.map((n) => `- ${n}`).join('\n'));
  }
  const message = `agent-team board lint\n${sections.join('\n\n')}`;

  // Blocking mode returns the findings to the model so it fixes the entry now.
  if (cfg.enforce.boardLint === 'block' && problems.length) {
    T.emit({
      decision: 'block',
      reason: `${message}\n\nRewrite the entry to the fixed block in TEAM_BOARD.md, then continue.`,
      systemMessage: `agent-team: ${problems.length} board-format problem(s) — blocked for repair.`
    });
  }
  T.emit({ systemMessage: message });
});
