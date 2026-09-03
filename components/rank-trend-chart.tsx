"use client";
import type { UnifiedBenchmarkProgress } from "@/lib/types";
import { LineChart } from "./charts";

/** Composite overall score per snapshot: average of that snapshot's category scores. Every formula path (native/Viscose/Voltaic) already produces a continuous per-group score, so this stays comparable across syncs even though it isn't KovaaK's own single "overall_rank" figure. */
function overallScore(snapshot: UnifiedBenchmarkProgress): number {
  if (snapshot.groups.length === 0) return 0;
  return snapshot.groups.reduce((sum, g) => sum + g.score, 0) / snapshot.groups.length;
}

export default function RankTrendChart({ history }: { history: UnifiedBenchmarkProgress[] }) {
  if (history.length < 2) {
    return (
      <div style={{ color: "var(--text-dim)", fontSize: 12 }}>
        Need at least 2 syncs to plot a trend - only {history.length} on record so far.
      </div>
    );
  }
  const points = history.map((snap) => ({ x: new Date(snap.syncedAt).getTime(), y: overallScore(snap) }));
  return (
    <div>
      <LineChart series={[{ label: "Overall progress", color: "var(--accent)", points }]} />
      <div style={{ color: "var(--text-dim)", fontSize: 10, marginTop: 4 }}>
        Plotted by sync date, not exact play date - see Scenario History for when individual scenarios were actually
        played.
      </div>
    </div>
  );
}
