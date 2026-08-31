"use client";
import { useMemo, useState } from "react";
import type { UnifiedBenchmarkProgress } from "@/lib/types";

type SortKey = "score" | "trend";

export default function SkillBreakdown({
  latest,
  previous,
}: {
  latest: UnifiedBenchmarkProgress;
  previous: UnifiedBenchmarkProgress | undefined;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [ascending, setAscending] = useState(true); // worst-first by default - surfaces the weakest link

  const rows = useMemo(() => {
    return latest.groups.map((g) => {
      const prevGroup = previous?.groups.find(
        (p) => p.category === g.category && p.subcategory === g.subcategory
      );
      const trend = prevGroup ? g.score - prevGroup.score : null;
      return {
        label: `${g.subcategory} · ${g.category}`,
        rankName: g.rankName,
        score: g.score,
        trend,
      };
    });
  }, [latest, previous]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortKey === "score" ? a.score : a.trend ?? -Infinity;
      const bv = sortKey === "score" ? b.score : b.trend ?? -Infinity;
      return ascending ? av - bv : bv - av;
    });
    return copy;
  }, [rows, sortKey, ascending]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setAscending(!ascending);
    } else {
      setSortKey(key);
      setAscending(true);
    }
  }

  return (
    <div>
      <div className="skill-sort-row">
        <button
          className={`sort-toggle ${sortKey === "score" ? "active" : ""}`}
          onClick={() => toggleSort("score")}
        >
          Score {sortKey === "score" ? (ascending ? "↑" : "↓") : ""}
        </button>
        <button
          className={`sort-toggle ${sortKey === "trend" ? "active" : ""}`}
          onClick={() => toggleSort("trend")}
        >
          Trend {sortKey === "trend" ? (ascending ? "↑" : "↓") : ""}
        </button>
      </div>
      <div className="skill-list">
        {sorted.map((r, i) => (
          <div className="skill-row" key={i}>
            <div className="skill-label">{r.label}</div>
            <div className="skill-rank">{r.rankName}</div>
            <div className="skill-score">{Math.round(r.score)}</div>
            <div
              className={`skill-trend ${
                r.trend === null ? "" : r.trend > 0 ? "up" : r.trend < 0 ? "down" : ""
              }`}
            >
              {r.trend === null
                ? "—"
                : `${r.trend > 0 ? "+" : ""}${Math.round(r.trend)}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
