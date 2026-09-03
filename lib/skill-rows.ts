import type { UnifiedBenchmarkProgress } from "./types";

export interface SkillRow {
  category: string;
  subcategory: string;
  label: string;
  rankName: string;
  score: number;
  trend: number | null; // change since previous sync, null if no previous sync
  /** [{ date: ISO syncedAt, score }] across every sync on record for this subcategory, oldest first. */
  series: { date: string; score: number }[];
}

/** One row per subcategory in the latest snapshot, with trend + full dated history attached. */
export function computeSkillRows(history: UnifiedBenchmarkProgress[]): SkillRow[] {
  const latest = history.at(-1);
  if (!latest) return [];
  const previous = history.length > 1 ? history[history.length - 2] : undefined;

  return latest.groups.map((g) => {
    const prevGroup = previous?.groups.find(
      (p) => p.category === g.category && p.subcategory === g.subcategory
    );
    const trend = prevGroup ? g.score - prevGroup.score : null;
    const series = history
      .map((snap) => {
        const match = snap.groups.find(
          (s) => s.category === g.category && s.subcategory === g.subcategory
        );
        return match ? { date: snap.syncedAt, score: match.score } : null;
      })
      .filter((v): v is { date: string; score: number } => v !== null);
    return {
      category: g.category,
      subcategory: g.subcategory,
      label: `${g.subcategory} · ${g.category}`,
      rankName: g.rankName,
      score: g.score,
      trend,
      series,
    };
  });
}

/** Groups rows by category, averaging subcategory scores - used for the radar chart so it has one axis per category instead of one per subcategory (too many to read for benchmarks with 10+). */
export function computeCategoryAverages(rows: SkillRow[]): { category: string; score: number }[] {
  const byCategory: Record<string, number[]> = {};
  for (const r of rows) {
    (byCategory[r.category] ??= []).push(r.score);
  }
  return Object.entries(byCategory).map(([category, scores]) => ({
    category,
    score: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));
}

/** Best (lowest number) global leaderboard rank across every scenario in the latest snapshot, plus which scenario it's from. */
export function bestLeaderboardRank(latest: UnifiedBenchmarkProgress): { rank: number; scenario: string } | null {
  const entries = Object.entries(latest.scenarioLeaderboardRanks ?? {});
  if (entries.length === 0) return null;
  const [scenario, rank] = entries.reduce((best, cur) => (cur[1] < best[1] ? cur : best));
  return { rank, scenario };
}
