import express from "express";
import { requireRole } from "../middleware/requireRole.js";
import * as projectRepo from "../database/repositories/projectRepo.js";
import * as testRepo from "../database/repositories/testRepo.js";
import * as healingRepo from "../database/repositories/healingRepo.js";
import { listMetricSamples } from "../database/repositories/metricSamplesRepo.js";

const router = express.Router();
router.use(requireRole("viewer"));

router.get("/healing/summary", (req, res) => {
  const projectId = String(req.query.projectId || "").trim();
  if (!projectId) return res.status(400).json({ error: "projectId is required" });
  const p = projectRepo.getById(projectId);
  if (!p) return res.status(404).json({ error: "Project not found" });

  const tests = testRepo.getByProjectId(projectId);
  const testIds = tests.map((t) => t.id);
  const entries = testIds.flatMap((tid) => Object.values(healingRepo.getByTestId(tid)));
  const strategy = {};
  const selectors = [];
  for (const e of entries) {
    const idx = e.strategyIndex ?? -1;
    strategy[idx] = strategy[idx] || { strategyIndex: idx, total: 0, success: 0 };
    strategy[idx].total += 1;
    if (e.succeededAt) strategy[idx].success += 1;
    selectors.push({ key: e.key, failCount: e.failCount || 0, succeededAt: e.succeededAt });
  }
  const perStrategy = Object.values(strategy).map((s) => ({ ...s, successRate: s.total ? s.success / s.total : 0 }));
  const topSelectors = selectors.sort((a, b) => (b.failCount - a.failCount)).slice(0, 10);
  const savingsTrend = listMetricSamples(projectId, "healing.savings.estimate", { limit: 90 });

  res.json({ perStrategy, topSelectors, savingsTrend, totalEntries: entries.length });
});

export default router;
