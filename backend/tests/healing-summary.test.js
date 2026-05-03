import assert from "node:assert/strict";
import express from "express";
import http from "node:http";
import * as healingRepo from "../src/database/repositories/healingRepo.js";
import * as projectRepo from "../src/database/repositories/projectRepo.js";
import * as testRepo from "../src/database/repositories/testRepo.js";
import healingRouter from "../src/routes/healing.js";

// Bypass requireRole — mount a stub req.userRole = "admin" before the router.
const app = express();
app.use((req, _res, next) => { req.userRole = "admin"; next(); });
app.use("/api/v1", healingRouter);
const server = app.listen(0);
const { port } = server.address();

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${path}`, (r) => {
      let body = "";
      r.on("data", (c) => (body += c));
      r.on("end", () => resolve({ status: r.statusCode, body: body ? JSON.parse(body) : null }));
    }).on("error", reject);
  });
}

// projectRepo.create / testRepo.create do NOT auto-generate id/createdAt and
// do NOT return the created row — callers must supply both. See
// backend/tests/recycle-bin.test.js for the canonical pattern.
const now = () => new Date().toISOString();

// ─── Empty-data case ──────────────────────────────────────────────────────────
const projectAId = "PRJ-HEAL-EMPTY";
// Note: workspaceId is intentionally omitted — it's a nullable FK to workspaces(id)
// and this test stubs req.userRole directly, bypassing workspaceScope.
projectRepo.create({ id: projectAId, name: "Healing-Empty", url: "https://a.test", createdAt: now(), status: "idle" });
let res = await get(`/api/v1/healing/summary?projectId=${projectAId}`);
assert.equal(res.status, 200);
assert.deepEqual(res.body.perStrategy, []);
assert.deepEqual(res.body.topSelectors, []);
assert.equal(res.body.totalEntries, 0);

// ─── Populated histogram case ─────────────────────────────────────────────────
const projectBId = "PRJ-HEAL-POP";
projectRepo.create({ id: projectBId, name: "Healing-Populated", url: "https://b.test", createdAt: now(), status: "idle" });
const t1Id = "TC-H1";
testRepo.create({ id: t1Id, projectId: projectBId, name: "x", description: "", steps: [], tags: [], createdAt: now(), updatedAt: now(), reviewStatus: "draft", priority: "medium", codeVersion: 0, isJourneyTest: false, assertionEnhanced: false });
healingRepo.set(`${t1Id}::click::Submit`, { strategyIndex: 1, succeededAt: now(), failCount: 3 });
healingRepo.set(`${t1Id}::fill::Email`, { strategyIndex: 0, succeededAt: now(), failCount: 1 });
healingRepo.set(`${t1Id}::click::Cancel`, { strategyIndex: 1, failCount: 5 }); // never succeeded

res = await get(`/api/v1/healing/summary?projectId=${projectBId}`);
assert.equal(res.status, 200);
assert.equal(res.body.totalEntries, 3);
assert.ok(res.body.perStrategy.find((s) => s.strategyIndex === 1 && s.total === 2 && s.success === 1));
assert.equal(res.body.topSelectors[0].failCount, 5);
assert.ok(Array.isArray(res.body.savingsTrend));

// ─── Bad request / not found ──────────────────────────────────────────────────
res = await get(`/api/v1/healing/summary`);
assert.equal(res.status, 400);
res = await get(`/api/v1/healing/summary?projectId=PRJ-DOES-NOT-EXIST`);
assert.equal(res.status, 404);

server.close();
console.log("healing-summary.test passed");
