import { recordMetricSample } from "../database/repositories/metricSamplesRepo.js";

export function recordMetric(projectId, metricKey, value, tags = null) {
  if (!projectId || !metricKey || Number.isNaN(Number(value))) return;
  recordMetricSample({ projectId, metricKey, value: Number(value), tags });
}
