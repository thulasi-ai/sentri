import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fixtureDir = path.resolve('scripts/__fixtures__/promote-sprint-item');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'promote-'));
const nextPath = path.join(tmp, 'NEXT.md');
const roadmapPath = path.join(tmp, 'ROADMAP.md');
fs.copyFileSync(path.join(fixtureDir, 'next.before.md'), nextPath);
fs.copyFileSync(path.join(fixtureDir, 'roadmap.before.md'), roadmapPath);

execFileSync(process.execPath, [path.resolve('scripts/promote-sprint-item.mjs'), '42', 'AUTO-017.3'], { cwd: tmp });

assert.equal(fs.readFileSync(nextPath, 'utf8'), fs.readFileSync(path.join(fixtureDir, 'next.after.md'), 'utf8'));
assert.equal(fs.readFileSync(roadmapPath, 'utf8'), fs.readFileSync(path.join(fixtureDir, 'roadmap.after.md'), 'utf8'));
console.log('promote-sprint-item test passed');
