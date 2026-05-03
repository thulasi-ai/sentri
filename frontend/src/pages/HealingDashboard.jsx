import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import TrendChart from "../components/shared/TrendChart.jsx";

export default function HealingDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.getProjects().then((ps) => ps[0]?.id && api.getHealingSummary(ps[0].id).then(setData));
  }, []);
  return <div className="container">
    <h1>Healing Dashboard</h1>
    <div className="card" style={{ padding: 12, marginBottom: 12 }}>
      <h3>Strategy success rates</h3>
      <ul>{(data?.perStrategy || []).map((s) => <li key={s.strategyIndex}>Strategy {s.strategyIndex}: {(s.successRate * 100).toFixed(0)}%</li>)}</ul>
    </div>
    <div className="card" style={{ padding: 12, marginBottom: 12 }}>
      <h3>Top healed selectors</h3>
      <ul>{(data?.topSelectors || []).slice(0, 5).map((s) => <li key={s.key}>{s.key}</li>)}</ul>
    </div>
    <div className="card" style={{ padding: 12 }}>
      <h3>Estimated savings trend</h3>
      <TrendChart samples={data?.savingsTrend || []} />
    </div>
  </div>;
}
