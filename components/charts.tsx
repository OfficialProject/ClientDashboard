"use client";
import { useState } from "react";

export interface ChartSeries {
  label: string;
  color: string;
  points: { x: number; y: number }[]; // x = timestamp (ms), y = value
}

const CHART_W = 640;
const CHART_H = 220;
const PAD = { top: 12, right: 12, bottom: 24, left: 12 };

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Multi-series line chart with a real (proportionally-spaced) date x-axis,
 * not just evenly-spaced sync indices. Renders as a viewBox'd SVG so it
 * scales to container width without a resize observer.
 */
export function LineChart({
  series,
  yFormat,
}: {
  series: ChartSeries[];
  yFormat?: (v: number) => string;
}) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: number; date: number } | null>(
    null
  );

  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) {
    return <div style={{ color: "var(--text-dim)", fontSize: 12 }}>Not enough data yet.</div>;
  }

  const xs = allPoints.map((p) => p.x);
  const ys = allPoints.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys, 0);
  const yMax = Math.max(...ys) || 1;
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;

  function toScreen(x: number, y: number) {
    const sx = PAD.left + ((x - xMin) / xRange) * innerW;
    const sy = PAD.top + innerH - ((y - yMin) / yRange) * innerH;
    return { sx, sy };
  }

  const xTicks = xRange === 0 ? [xMin] : [xMin, xMin + xRange / 2, xMax];

  return (
    <div>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
        {/* baseline */}
        <line
          x1={PAD.left}
          y1={PAD.top + innerH}
          x2={PAD.left + innerW}
          y2={PAD.top + innerH}
          stroke="var(--border)"
          strokeWidth="1"
        />
        {xTicks.map((x, i) => {
          const { sx } = toScreen(x, yMin);
          return (
            <text key={i} x={sx} y={CHART_H - 6} fontSize="9" fill="var(--text-dim)" textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}>
              {formatDate(x)}
            </text>
          );
        })}

        {series.map((s, si) => {
          if (s.points.length === 0) return null;
          const sorted = [...s.points].sort((a, b) => a.x - b.x);
          const pathPoints = sorted.map((p) => toScreen(p.x, p.y));
          const d = pathPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`).join(" ");
          return (
            <g key={si}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" />
              {pathPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.sx}
                  cy={p.sy}
                  r={3}
                  fill={s.color}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() =>
                    setHover({ x: p.sx, y: p.sy, label: s.label, value: sorted[i].y, date: sorted[i].x })
                  }
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
          {hover.label}: <span style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>
            {yFormat ? yFormat(hover.value) : Math.round(hover.value)}
          </span>{" "}
          on {formatDate(hover.date)}
        </div>
      )}
      {series.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
          {series.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-dim)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const RADAR_SIZE = 240;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = RADAR_SIZE / 2 - 36;

/** Radar/hexagon chart - one axis per category, normalized 0-1 against the max value present so the shape is always readable regardless of each formula's native scale. */
export function RadarChart({ axes }: { axes: { label: string; value: number }[] }) {
  if (axes.length < 3) {
    return <div style={{ color: "var(--text-dim)", fontSize: 12 }}>Need at least 3 categories for a radar chart.</div>;
  }
  const max = Math.max(...axes.map((a) => a.value)) || 1;
  const angleFor = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;

  const pointFor = (i: number, frac: number) => {
    const angle = angleFor(i);
    return {
      x: RADAR_CENTER + Math.cos(angle) * RADAR_RADIUS * frac,
      y: RADAR_CENTER + Math.sin(angle) * RADAR_RADIUS * frac,
    };
  };

  const dataPoints = axes.map((a, i) => pointFor(i, Math.max(0.04, a.value / max)));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} width="100%" style={{ maxWidth: 320, display: "block", margin: "0 auto" }}>
      {rings.map((r, ri) => {
        const ringPoints = axes.map((_, i) => pointFor(i, r));
        const d = ringPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
        return <path key={ri} d={d} fill="none" stroke="var(--border)" strokeWidth="1" />;
      })}
      {axes.map((_, i) => {
        const p = pointFor(i, 1);
        return <line key={i} x1={RADAR_CENTER} y1={RADAR_CENTER} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="1" />;
      })}
      <path d={dataPath} fill="var(--accent)" fillOpacity="0.25" stroke="var(--accent)" strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--accent)" />
      ))}
      {axes.map((a, i) => {
        const p = pointFor(i, 1.22);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            fontSize="9"
            fill="var(--text-dim)"
            textAnchor={Math.cos(angleFor(i)) > 0.3 ? "start" : Math.cos(angleFor(i)) < -0.3 ? "end" : "middle"}
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
