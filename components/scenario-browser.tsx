"use client";
import { useMemo, useState } from "react";
import type { UnifiedBenchmarkProgress } from "@/lib/types";
import { LineChart } from "./charts";

export default function ScenarioBrowser({ history }: { history: UnifiedBenchmarkProgress[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const latest = history.at(-1);

  const scenarioNames = useMemo(() => {
    if (!latest) return [];
    return Object.keys(latest.scenarioScores).sort();
  }, [latest]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scenarioNames;
    return scenarioNames.filter((n) => n.toLowerCase().includes(q));
  }, [scenarioNames, query]);

  const selectedSeries = useMemo(() => {
    if (!selected) return [];
    return history
      .filter((snap) => selected in snap.scenarioScores)
      .map((snap) => ({ x: new Date(snap.syncedAt).getTime(), y: snap.scenarioScores[selected] }));
  }, [history, selected]);

  if (!latest || scenarioNames.length === 0) {
    return <div style={{ color: "var(--text-dim)", fontSize: 12 }}>No scenario data yet.</div>;
  }

  return (
    <div>
      <input
        placeholder="Search scenarios..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%",
          background: "var(--panel-alt)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 13,
          marginBottom: 10,
          boxSizing: "border-box",
        }}
      />
      <div style={{ maxHeight: selected ? 160 : 320, overflowY: "auto", marginBottom: selected ? 12 : 0 }}>
        {filtered.map((name) => {
          const rank = latest.scenarioLeaderboardRanks?.[name];
          return (
            <div
              key={name}
              onClick={() => setSelected(name === selected ? null : name)}
              className="skill-row"
              style={{ cursor: "pointer", background: name === selected ? "var(--panel-alt)" : "transparent" }}
            >
              <div className="skill-label">{name}</div>
              <div className="skill-rank">{rank ? `#${rank.toLocaleString()} global` : "—"}</div>
              <div className="skill-score">{Math.round(latest.scenarioScores[name])}</div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ color: "var(--text-dim)", fontSize: 12, padding: "8px 0" }}>No scenarios match "{query}".</div>
        )}
      </div>

      {selected && (
        <div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>{selected} — score history</div>
          {selectedSeries.length < 2 ? (
            <div style={{ color: "var(--text-dim)", fontSize: 12 }}>
              Only one sync on record for this scenario so far - history builds up as more syncs happen.
            </div>
          ) : (
            <LineChart series={[{ label: selected, color: "var(--accent)", points: selectedSeries }]} />
          )}
        </div>
      )}
    </div>
  );
}
