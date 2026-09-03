"use client";
import type { UnifiedBenchmarkProgress } from "@/lib/types";

interface RosterAverage {
  subcategory: string;
  category: string;
  averageScore: number;
}

export default function RosterComparison({
  progress,
  averages,
  clientCount,
}: {
  progress: UnifiedBenchmarkProgress;
  averages: RosterAverage[];
  clientCount: number;
}) {
  if (clientCount === 0 || averages.length === 0) {
    return (
      <div style={{ color: "var(--text-dim)", fontSize: 12 }}>
        No other clients on this benchmark yet to compare against.
      </div>
    );
  }

  const rows = progress.groups
    .map((g) => {
      const avg = averages.find((a) => a.category === g.category && a.subcategory === g.subcategory);
      if (!avg) return null;
      return {
        label: `${g.subcategory} · ${g.category}`,
        score: g.score,
        rosterAvg: avg.averageScore,
        delta: g.score - avg.averageScore,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.delta - b.delta); // worst-relative-to-roster first

  return (
    <div>
      <div style={{ color: "var(--text-dim)", fontSize: 11, marginBottom: 8 }}>
        vs. {clientCount} other client{clientCount === 1 ? "" : "s"} on this benchmark
      </div>
      <div className="skill-list">
        {rows.map((r, i) => (
          <div className="skill-row" key={i}>
            <div className="skill-label">{r.label}</div>
            <div className="skill-rank">roster avg {Math.round(r.rosterAvg)}</div>
            <div className="skill-score">{Math.round(r.score)}</div>
            <div className={`skill-trend ${r.delta > 0 ? "up" : r.delta < 0 ? "down" : ""}`}>
              {r.delta > 0 ? "+" : ""}
              {Math.round(r.delta)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
