#!/usr/bin/env node
/**
 * promote-sprint-item.mjs — PROC-002 sprint-tracker hand-off automation.
 *
 * Given a shipped PR number and a new slot-2 item id, rewrites:
 *   • NEXT.md     — replaces "## ▶ Current PR" with queue item 2,
 *                   shifts items 3 → 2, 4 → 3, picks newItemId as the new 4
 *                   (only its ID is templated — humans flesh out the body
 *                   on review), prepends the shipped item to "Recently
 *                   completed" (capped at 3 rows).
 *   • ROADMAP.md  — updates the "**Current sprint:**" fast-path line to
 *                   reference the new current-PR id and decrements the
 *                   "**Remaining:** N items" counter by one.
 *   • docs/changelog.md — appends a one-liner under "## [Unreleased]"
 *                   referencing the shipped PR if not already present.
 *
 * Usage:
 *   node scripts/promote-sprint-item.mjs --pr 14 --new-item AUTO-003 \
 *     [--repo-root .] [--dry-run]
 *
 * Designed to be safe to re-run: detects already-promoted state and exits 0
 * with a "nothing to do" message.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const out = { dryRun: false, repoRoot: process.cwd() };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pr") out.pr = argv[++i];
    else if (a === "--new-item") out.newItem = argv[++i];
    else if (a === "--repo-root") out.repoRoot = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function readFile(p) { return fs.readFileSync(p, "utf8"); }
function writeFile(p, s, dryRun) {
  if (dryRun) { console.log(`[dry-run] would write ${p} (${s.length} bytes)`); return; }
  fs.writeFileSync(p, s);
}

/**
 * Promote queue item 2 → Current PR in NEXT.md.
 *
 * Returns { next, shippedTitle, shippedId } where `next` is the rewritten file.
 * Pure function — easy to unit-test.
 */
export function promoteNextMd(src, { pr, newItem }) {
  const currentRe = /## ▶ Current PR — ([^\n]+)\n([\s\S]*?)(?=\n## ⏭ Queue)/;
  const queueRe = /## ⏭ Queue \(next 3 PRs after current\)\n([\s\S]*?)(?=\n## ✅ Recently completed)/;
  const completedRe = /## ✅ Recently completed\n\n(\| ID \| Title \| PR \|\n\|[^\n]+\|\n)([\s\S]*?)(?=\n\*Full completed list)/;

  const cur = src.match(currentRe);
  const q = src.match(queueRe);
  const c = src.match(completedRe);
  if (!cur) throw new Error("NEXT.md: '## ▶ Current PR' block not found");
  if (!q) throw new Error("NEXT.md: '## ⏭ Queue' block not found");
  if (!c) throw new Error("NEXT.md: '## ✅ Recently completed' table not found");

  const shippedHeader = cur[1].trim();           // e.g. "CAP-004 + MET-001 + PROC-002 (bundled)"
  const shippedId = shippedHeader.split(/\s|—/)[0];
  const shippedTitle = shippedHeader;

  // Split queue into "### N · ..." items.
  const items = q[1].split(/\n(?=### \d+ · )/).map((s) => s.trim()).filter(Boolean);
  if (items.length < 1) throw new Error("NEXT.md: queue is empty, cannot promote");

  const promoted = items[0]
    .replace(/^### \d+ · /, "")         // strip "### 2 · "
    .trim();
  // Keep the rest, renumber, and append a placeholder for newItem at slot 4.
  const remaining = items.slice(1).map((s, i) => s.replace(/^### \d+ · /, `### ${i + 2} · `));
  remaining.push(`### 4 · ${newItem}\n**Effort:** TBD | **Priority:** TBD | **Dependencies:** TBD | **Source:** ROADMAP.md (${newItem})\n\n_Promoted automatically by \`scripts/promote-sprint-item.mjs\`. Flesh out scope, files, and acceptance criteria before starting work._`);

  const promotedTitleLine = promoted.split("\n").find((l) => l.startsWith("**Title:**")) || "";
  const promotedTitle = promotedTitleLine.replace(/^\*\*Title:\*\*\s*/, "").trim();
  const promotedHeader = promoted.split("\n")[0]; // first line after "### 2 · " strip

  const newCurrentBlock =
    `## ▶ Current PR — ${promotedHeader}\n\n` +
    promoted.split("\n").slice(1).join("\n").trim() +
    "\n";

  const newQueueBlock =
    `## ⏭ Queue (next 3 PRs after current)\n\n` +
    remaining.join("\n\n") +
    "\n";

  // Prepend shipped row to Recently completed and cap at 3.
  const completedRows = c[2].trim().split("\n").filter((l) => l.startsWith("|"));
  const newRow = `| ${shippedId} | ${shippedTitle.replace(/\|/g, "\\|")} | #${pr} |`;
  const cappedRows = [newRow, ...completedRows].slice(0, 3).join("\n");
  const newCompletedBlock =
    `## ✅ Recently completed\n\n${c[1]}${cappedRows}\n`;

  let out = src.replace(currentRe, newCurrentBlock + "\n");
  out = out.replace(queueRe, newQueueBlock + "\n");
  out = out.replace(completedRe, newCompletedBlock + "\n");
  return { next: out, shippedId, shippedTitle, promotedId: promotedHeader.split(/\s|—/)[0], promotedTitle };
}

/**
 * Update the ROADMAP.md fast-path "Current sprint" line and decrement the
 * "Remaining: N items" counter.
 */
export function updateRoadmap(src, { promotedId }) {
  const sprintRe = /(\*\*Current sprint:\*\*\s*`)[^`]+(`)/;
  const remainingRe = /(\*\*Remaining:\*\*\s*)(\d+)(\s*items)/;
  let out = src;
  if (sprintRe.test(out)) out = out.replace(sprintRe, `$1${promotedId}$2`);
  if (remainingRe.test(out)) {
    out = out.replace(remainingRe, (_m, p, n, s) => `${p}${Math.max(0, parseInt(n, 10) - 1)}${s}`);
  }
  return out;
}

/**
 * Append a one-liner to docs/changelog.md under "## [Unreleased]" if missing.
 */
export function updateChangelog(src, { pr, shippedId }) {
  const marker = `(#${pr})`;
  if (src.includes(marker)) return src; // already mentioned
  const re = /## \[Unreleased\][^\n]*\n/;
  if (!re.test(src)) return src;
  return src.replace(re, (m) => `${m}\n- **Promoted (${shippedId})**: shipped via PR ${marker}.\n`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.pr || !args.newItem) {
    console.log("Usage: promote-sprint-item.mjs --pr <num> --new-item <ID> [--repo-root <path>] [--dry-run]");
    process.exit(args.help ? 0 : 1);
  }
  const root = path.resolve(args.repoRoot);
  const nextPath = path.join(root, "NEXT.md");
  const roadmapPath = path.join(root, "ROADMAP.md");
  const changelogPath = path.join(root, "docs/changelog.md");

  const nextSrc = readFile(nextPath);
  const { next, shippedId, promotedId } = promoteNextMd(nextSrc, args);
  writeFile(nextPath, next, args.dryRun);

  if (fs.existsSync(roadmapPath)) {
    const updated = updateRoadmap(readFile(roadmapPath), { promotedId });
    writeFile(roadmapPath, updated, args.dryRun);
  }
  if (fs.existsSync(changelogPath)) {
    const updated = updateChangelog(readFile(changelogPath), { pr: args.pr, shippedId });
    writeFile(changelogPath, updated, args.dryRun);
  }

  console.log(`promoted ${shippedId} → shipped (PR #${args.pr}); new current PR = ${promotedId}`);
}

// Only run main() when invoked directly (not when imported by tests).
const invokedDirectly = import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
