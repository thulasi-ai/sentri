import assert from "node:assert/strict";
import { getDatabase } from "../src/database/sqlite.js";
import { recordMetricSample, listMetricSamples } from "../src/database/repositories/metricSamplesRepo.js";

const db = getDatabase();
recordMetricSample({ projectId: "PRJ-T", metricKey: "x", value: 1 });
const rows = listMetricSamples("PRJ-T", "x", { limit: 5 });
assert.ok(rows.length >= 1);
console.log("metric-samples.test passed");
