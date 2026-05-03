import { getDatabase } from "../sqlite.js";

export function recordMetricSample({ projectId, metricKey, value, ts = new Date().toISOString(), tags = null }) {
  const db = getDatabase();
  db.prepare(`INSERT INTO metric_samples (projectId, metricKey, ts, value, tags) VALUES (?, ?, ?, ?, ?)`)
    .run(projectId, metricKey, ts, value, tags ? JSON.stringify(tags) : null);
}

export function listMetricSamples(projectId, metricKey, { from, to, limit = 200 } = {}) {
  const db = getDatabase();
  const clauses = ["projectId = ?", "metricKey = ?"];
  const params = [projectId, metricKey];
  if (from) { clauses.push("ts >= ?"); params.push(from); }
  if (to) { clauses.push("ts <= ?"); params.push(to); }
  params.push(limit);
  // Select the most recent `limit` rows (DESC + LIMIT), then re-sort ASC so
  // consumers receive a chronological series suitable for trend charts.
  // Selecting ASC + LIMIT would return the *oldest* N samples, which is the
  // opposite of what a "trend" view needs.
  const rows = db.prepare(
    `SELECT projectId, metricKey, ts, value, tags FROM metric_samples
     WHERE ${clauses.join(" AND ")}
     ORDER BY ts DESC LIMIT ?`
  ).all(...params);
  return rows
    .map((r) => ({ ...r, tags: r.tags ? JSON.parse(r.tags) : null }))
    .reverse();
}
