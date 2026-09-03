"use client";
import type { UnifiedBenchmarkProgress } from "@/lib/types";
import { computeSkillRows } from "@/lib/skill-rows";
import { buildInsightSummary } from "@/lib/insights";

export default function InsightSummary({ history }: { history: UnifiedBenchmarkProgress[] }) {
  const rows = computeSkillRows(history);
  const lines = buildInsightSummary(rows);
  if (lines.length === 0) return null;
  return (
    <div style={{ background: "var(--panel-alt)", borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12.5, color: "var(--text)", lineHeight: 1.5 }}>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}
