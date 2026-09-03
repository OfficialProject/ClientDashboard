import type { UnifiedBenchmarkProgress } from "@/lib/types";
import { computePersonalBests } from "@/lib/personal-bests";

export default function PersonalBestBanner({ history }: { history: UnifiedBenchmarkProgress[] }) {
  const bests = computePersonalBests(history);
  if (bests.length === 0) return null;
  return (
    <div style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--panel-alt))", border: "1px solid var(--accent)", borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12.5 }}>
      <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
        🏆 New personal best{bests.length > 1 ? "s" : ""} this sync
      </div>
      {bests.slice(0, 5).map((b) => (
        <div key={b.scenario} style={{ color: "var(--text)" }}>
          {b.scenario}: {Math.round(b.score)} <span style={{ color: "var(--text-dim)" }}>(was {Math.round(b.previousBest)})</span>
        </div>
      ))}
      {bests.length > 5 && (
        <div style={{ color: "var(--text-dim)", marginTop: 2 }}>+{bests.length - 5} more</div>
      )}
    </div>
  );
}
