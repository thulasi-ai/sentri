import assert from "node:assert/strict";
import { getDatabase } from "../src/database/sqlite.js";
import { recordMetricSample, listMetricSamples } from "../src/database/repositories/metricSamplesRepo.js";
import { recordMetric } from "../src/utils/recordMetric.js";

getDatabase();

// Insert + retrieve, ts-ordered ascending
const t0 = "2024-01-01T00:00:00.000Z";
const t1 = "2024-01-02T00:00:00.000Z";
const t2 = "2024-01-03T00:00:00.000Z";
recordMetricSample({ projectId: "PRJ-MS", metricKey: "k", value: 2, ts: t1 });
recordMetricSample({ projectId: "PRJ-MS", metricKey: "k", value: 1, ts: t0 });
recordMetricSample({ projectId: "PRJ-MS", metricKey: "k", value: 3, ts: t2, tags: { source: "test" } });

const all = listMetricSamples("PRJ-MS", "k", { limit: 10 });
assert.equal(all.length, 3);
assert.deepEqual(all.map((r) => r.value), [1, 2, 3]);
assert.deepEqual(all[2].tags, { source: "test" });

// Range filter
const ranged = listMetricSamples("PRJ-MS", "k", { from: t1, to: t2, limit: 10 });
assert.equal(ranged.length, 2);

// recordMetric helper guards bad inputs
recordMetric(null, "k", 1);
recordMetric("PRJ-MS", "k", "not-a-number");
const after = listMetricSamples("PRJ-MS", "k", { limit: 10 });
assert.equal(after.length, 3, "guarded inputs must not insert");

// recordMetric happy path
recordMetric("PRJ-MS", "k2", 7, { foo: "bar" });
const k2 = listMetricSamples("PRJ-MS", "k2", { limit: 5 });
assert.equal(k2.length, 1);
assert.equal(k2[0].value, 7);
assert.deepEqual(k2[0].tags, { foo: "bar" });

console.log("metric-samples.test passed");
