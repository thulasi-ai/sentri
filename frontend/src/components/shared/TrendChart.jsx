import React from "react";

/**
 * TrendChart — reusable time-series chart for MET-001 metric_samples.
 *
 * Props:
 *   samples    — Array<{ ts, value }>
 *   height     — pixel height (default 120)
 *   thresholds — Array<{ value, label?, color? }> — horizontal threshold lines
 *                (e.g. Web Vitals "good"/"needs-improvement" cutoffs).
 *   band       — { lower, upper, color? } — shaded band overlay (e.g. budget
 *                acceptance window).
 */
export default function TrendChart({ samples = [], height = 120, thresholds = [], band = null }) {
  if (!samples.length) return <div className="card" style={{ padding: 12 }}>No trend data</div>;
  const values = samples.map((s) => Number(s.value));
  const extras = [
    ...thresholds.map((t) => Number(t.value)),
    ...(band ? [Number(band.lower), Number(band.upper)] : []),
  ].filter((n) => Number.isFinite(n));
  const min = Math.min(...values, ...extras);
  const max = Math.max(...values, ...extras);
  const range = max - min || 1;
  const y = (v) => 100 - ((Number(v) - min) / range) * 100;
  const points = samples
    .map((s, i) => `${(i / (samples.length - 1 || 1)) * 100},${y(s.value)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height }}>
      {band && Number.isFinite(Number(band.lower)) && Number.isFinite(Number(band.upper)) && (
        <rect
          x="0"
          y={Math.min(y(band.lower), y(band.upper))}
          width="100"
          height={Math.abs(y(band.upper) - y(band.lower))}
          fill={band.color || "var(--accent)"}
          opacity="0.12"
        />
      )}
      {thresholds.map((t, i) =>
        Number.isFinite(Number(t.value)) ? (
          <line
            key={i}
            x1="0"
            x2="100"
            y1={y(t.value)}
            y2={y(t.value)}
            stroke={t.color || "var(--danger, #d33)"}
            strokeWidth="0.5"
            strokeDasharray="2,2"
          >
            {t.label ? <title>{`${t.label}: ${t.value}`}</title> : null}
          </line>
        ) : null
      )}
      <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
