import React from "react";

export default function TrendChart({ samples = [], height = 120 }) {
  if (!samples.length) return <div className="card" style={{ padding: 12 }}>No trend data</div>;
  const values = samples.map((s) => Number(s.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = samples.map((s, i) => `${(i / (samples.length - 1 || 1)) * 100},${100 - ((Number(s.value) - min) / range) * 100}`).join(" ");
  return <svg viewBox="0 0 100 100" style={{ width: "100%", height }}><polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={points} /></svg>;
}
