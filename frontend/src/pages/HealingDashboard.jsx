import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import TrendChart from "../components/shared/TrendChart.jsx";

export default function HealingDashboard() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load project list once.
  useEffect(() => {
    api.getProjects()
      .then((ps) => {
        setProjects(ps || []);
        if (ps?.[0]?.id) setProjectId(ps[0].id);
      })
      .catch((e) => setError(e.message || "Failed to load projects"));
  }, []);

  // Refetch summary whenever the selected project changes.
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    api.getHealingSummary(projectId)
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load healing summary"))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Healing Dashboard</h1>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Project</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!projects.length}
            aria-label="Select project"
          >
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name || p.id}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="card" style={{ padding: 12, marginBottom: 12, color: "var(--danger, #d33)" }} role="alert">
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <h3>Strategy success rates</h3>
        {loading && !data ? <p>Loading…</p> : (
          <ul>
            {(data?.perStrategy || []).length === 0 && <li>No healing events recorded yet.</li>}
            {(data?.perStrategy || []).map((s) => (
              <li key={s.strategyIndex}>
                Strategy {s.strategyIndex}: {(s.successRate * 100).toFixed(0)}%
                {" "}<span style={{ opacity: 0.6 }}>({s.success}/{s.total})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <h3>Top healed selectors</h3>
        <ul>
          {(data?.topSelectors || []).length === 0 && <li>No selectors yet.</li>}
          {(data?.topSelectors || []).slice(0, 5).map((s) => (
            <li key={s.key}>
              <code>{s.key}</code>{" "}
              <span style={{ opacity: 0.6 }}>· {s.failCount} fail{s.failCount === 1 ? "" : "s"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <h3>Estimated savings trend</h3>
        <TrendChart samples={data?.savingsTrend || []} />
      </div>
    </div>
  );
}
