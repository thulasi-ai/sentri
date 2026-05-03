#!/usr/bin/env node
import fs from 'node:fs';

function updateNext(content, prNumber, itemId) {
  return content
    .replace(/\| CAP-003 \|[^\n]+\| #12 \|/, (m) => m + `\n| ${itemId} | Promoted by automation | #${prNumber} |`)
    .replace(/\*Full completed list → ROADMAP\.md § Completed Work\*/, `*Full completed list → ROADMAP.md § Completed Work*\n\n<!-- promoted-by-script:#${prNumber}:${itemId} -->`);
}

function updateRoadmap(content, itemId) {
  return content
    .replace(/\*\*Current sprint:\*\* `[^`]+`/, '**Current sprint:** `'+itemId+'`')
    .replace(/\*\*Remaining:\*\* (\d+) items/, (_, n) => `**Remaining:** ${Math.max(0, Number(n) - 1)} items`)
    .replace(/\| CAP-003 \|[^\n]+\| PR #12\s+\|/, (m) => `${m}\n| ${itemId} | Promoted by automation | PR #TBD |`);
}

const [,, prArg, itemIdArg] = process.argv;
if (!prArg || !itemIdArg) {
  console.error('Usage: node scripts/promote-sprint-item.mjs <prNumber> <newSlot2ItemId>');
  process.exit(1);
}

const nextPath = 'NEXT.md';
const roadmapPath = 'ROADMAP.md';
const next = fs.readFileSync(nextPath, 'utf8');
const roadmap = fs.readFileSync(roadmapPath, 'utf8');

fs.writeFileSync(nextPath, updateNext(next, prArg, itemIdArg));
fs.writeFileSync(roadmapPath, updateRoadmap(roadmap, itemIdArg));
console.log(`Promoted sprint item ${itemIdArg} for PR #${prArg}`);
