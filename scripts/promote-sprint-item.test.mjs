import assert from "node:assert/strict";
import { promoteNextMd, updateRoadmap, updateChangelog } from "./promote-sprint-item.mjs";

const NEXT_FIXTURE = `# NEXT.md — Current Sprint Target

---

## ▶ Current PR — SHIP-001 — Example shipped item

**Title:** Example
**Branch:** \`feat/ship-001\`

### Scope

Body of the shipped item.

## ⏭ Queue (next 3 PRs after current)

### 2 · QUEUE-A
**Effort:** S | **Priority:** 🔵 Medium | **Dependencies:** none
**Title:** Queue-A title

Body A.

### 3 · QUEUE-B
**Effort:** M

Body B.

### 4 · QUEUE-C
**Effort:** L

Body C.

---

## ✅ Recently completed

| ID | Title | PR |
|----|-------|----|
| OLD-1 | Older shipped item | #10 |
| OLD-2 | Even older | #9 |
| OLD-3 | Oldest kept | #8 |

*Full completed list → ROADMAP.md § Completed Work*
`;

// ─── promoteNextMd ────────────────────────────────────────────────────────────
const { next, shippedId, promotedId } = promoteNextMd(NEXT_FIXTURE, { pr: "42", newItem: "NEW-999" });
assert.equal(shippedId, "SHIP-001");
assert.equal(promotedId, "QUEUE-A");
assert.ok(next.includes("## ▶ Current PR — QUEUE-A"), "QUEUE-A must be promoted to current");
assert.ok(!next.includes("## ▶ Current PR — SHIP-001"), "SHIP-001 must no longer be current");
assert.ok(next.includes("### 2 · QUEUE-B"), "QUEUE-B must shift to slot 2");
assert.ok(next.includes("### 3 · QUEUE-C"), "QUEUE-C must shift to slot 3");
assert.ok(next.includes("### 4 · NEW-999"), "NEW-999 must be templated into slot 4");
assert.ok(next.includes("| SHIP-001 |"), "shipped item must be prepended to completed table");
assert.ok(next.includes("#42"), "shipped PR number must appear in completed table");
// Cap at 3 rows — OLD-3 must be evicted.
assert.ok(!next.includes("| OLD-3 |"), "Recently completed must cap at 3 rows");
assert.ok(next.includes("| OLD-1 |") && next.includes("| OLD-2 |"));

// Idempotence check: promoting the queue again on the rewritten output
// promotes QUEUE-B, so it's not a true no-op — but it must not throw.
const { shippedId: shipped2 } = promoteNextMd(next, { pr: "43", newItem: "NEW-2" });
assert.equal(shipped2, "QUEUE-A");

// ─── updateRoadmap ────────────────────────────────────────────────────────────
const ROADMAP_FIXTURE = `# Roadmap

> **Current sprint:** \`SHIP-001\` — Example · **Blockers:** none · **Remaining:** 29 items (foo)

Body.
`;
const updatedRoadmap = updateRoadmap(ROADMAP_FIXTURE, { promotedId: "QUEUE-A" });
assert.ok(updatedRoadmap.includes("`QUEUE-A`"));
assert.ok(!updatedRoadmap.includes("`SHIP-001`"));
assert.ok(updatedRoadmap.includes("**Remaining:** 28 items"));

// ─── updateChangelog ──────────────────────────────────────────────────────────
const CHANGELOG_FIXTURE = `# Changelog

## [Unreleased]

- existing entry
`;
const updatedCL = updateChangelog(CHANGELOG_FIXTURE, { pr: "42", shippedId: "SHIP-001" });
assert.ok(updatedCL.includes("(#42)"));
// Re-running must not double-append.
const twice = updateChangelog(updatedCL, { pr: "42", shippedId: "SHIP-001" });
assert.equal(twice, updatedCL);

console.log("promote-sprint-item.test passed");
