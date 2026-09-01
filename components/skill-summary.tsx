"use client";
import { useMemo } from "react";
import type { UnifiedBenchmarkProgress } from "@/lib/types";

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span style={{ color: "var(--text-dim)", fontSize: 11 }}>—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 64;
  const h = 20;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const trendingUp = values[values.length - 1] >= values[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={points}
        fill="none"
        stroke={trendingUp ? "var(--accent)" : "var(--danger)"}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function SkillSummary({ history }: { history: UnifiedBenchmarkProgress[] }) {
  const latest = history.at(-1);
  const previous = history.length > 1 ? history[history.length - 2] : undefined;

  const rows = useMemo(() => {
    if (!latest) return [];
    return latest.groups.map((g) => {
      const prevGroup = previous?.groups.find(
        (p) => p.category === g.category && p.subcategory === g.subcategory
      );
      const trend = prevGroup ? g.score - prevGroup.score : null;
      const series = history
        .map((snap) => snap.groups.find((s) => s.category === g.category && s.subcategory === g.subcategory)?.score)
        .filter((v): v is number => v !== undefined);
      return {
        label: `${g.subcategory} · ${g.category}`,
        rankName: g.rankName,
        score: g.score,
        trend,
        series,
      };
    });
  }, [latest, previous, history]);

  if (!latest || rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 3);
  const weaknesses = sorted.slice(-3).reverse();
  const weakest = sorted[sorted.length - 1];

  return (
    <div>
      <div className="hero-row">
        <div className="hero-stat">
          <div className="hero-label">Current rank</div>
          <div className="hero-value">{latest.overallRankName}</div>
        </div>
        <div className="hero-stat">
          <div className="hero-label">Weakest link</div>
          <div className="hero-value" style={{ fontSize: 14 }}>{weakest.label}</div>
        </div>
      </div>

      <div className="summary-cols">
        <div>
          <div className="summary-heading">Strengths</div>
          {strengths.map((r, i) => (
            <div className="summary-row" key={i}>
              <div className="summary-row-label">{r.label}</div>
              <Sparkline values={r.series} />
              <div className="summary-row-trend up">
                {r.trend === null ? "" : `${r.trend > 0 ? "+" : ""}${Math.round(r.trend)}`}
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="summary-heading">Weaknesses</div>
          {weaknesses.map((r, i) => (
            <div className="summary-row" key={i}>
              <div className="summary-row-label">{r.label}</div>
              <Sparkline values={r.series} />
              <div className={`summary-row-trend ${r.trend !== null && r.trend < 0 ? "down" : ""}`}>
                {r.trend === null ? "" : `${r.trend > 0 ? "+" : ""}${Math.round(r.trend)}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
