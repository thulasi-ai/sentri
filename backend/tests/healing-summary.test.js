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

// ─── Empty-data case ──────────────────────────────────────────────────────────
const projectA = projectRepo.create({ name: "Healing-Empty", url: "https://a.test" });
let res = await get(`/api/v1/healing/summary?projectId=${projectA.id}`);
assert.equal(res.status, 200);
assert.deepEqual(res.body.perStrategy, []);
assert.deepEqual(res.body.topSelectors, []);
assert.equal(res.body.totalEntries, 0);

// ─── Populated histogram case ─────────────────────────────────────────────────
const projectB = projectRepo.create({ name: "Healing-Populated", url: "https://b.test" });
const t1 = testRepo.create({ id: "TC-H1", projectId: projectB.id, name: "x", steps: [], playwrightCode: "" });
healingRepo.set(`${t1.id}::click::Submit`, { strategyIndex: 1, succeededAt: new Date().toISOString(), failCount: 3 });
healingRepo.set(`${t1.id}::fill::Email`, { strategyIndex: 0, succeededAt: new Date().toISOString(), failCount: 1 });
healingRepo.set(`${t1.id}::click::Cancel`, { strategyIndex: 1, failCount: 5 }); // never succeeded

res = await get(`/api/v1/healing/summary?projectId=${projectB.id}`);
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
