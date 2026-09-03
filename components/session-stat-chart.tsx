"use client";
import { useState } from "react";
import type { RecentActivityEntry } from "@/lib/kovaaks";
import { LineChart } from "./charts";

type Metric = "accuracyDamage" | "kills" | "avgTtk";

const METRICS: { key: Metric; label: string }[] = [
  { key: "accuracyDamage", label: "Damage accuracy" },
  { key: "kills", label: "Kills" },
  { key: "avgTtk", label: "Avg TTK" },
];

export default function SessionStatChart({ entries }: { entries: RecentActivityEntry[] }) {
  const [metric, setMetric] = useState<Metric>("accuracyDamage");

  const points = [...entries]
    .filter((e) => e.attributes?.[metric] !== undefined)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((e) => ({ x: new Date(e.timestamp).getTime(), y: Number(e.attributes![metric]) }));

  if (points.length === 0) {
    return <div style={{ color: "var(--text-dim)", fontSize: 12 }}>No per-play stat data on these entries.</div>;
  }

  return (
    <div>
      <div className="skill-sort-row">
        {METRICS.map((m) => (
          <button
            key={m.key}
            className={`sort-toggle ${metric === m.key ? "active" : ""}`}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <LineChart series={[{ label: METRICS.find((m) => m.key === metric)!.label, color: "var(--accent)", points }]} />
    </div>
  );
}
