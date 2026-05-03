CREATE TABLE IF NOT EXISTS metric_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projectId TEXT NOT NULL,
  metricKey TEXT NOT NULL,
  ts TEXT NOT NULL,
  value REAL NOT NULL,
  tags TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_metric_samples_project_metric_ts
  ON metric_samples(projectId, metricKey, ts);
