import type { BenchmarkDef } from "./benchmarks";
import type { UnifiedBenchmarkProgress } from "./types";
import { computeViscoseProgress } from "./viscose";
import { computeVoltaicProgress } from "./voltaic";
import { resolveToSteamId64 } from "./steam";
import {
  getBenchmarkProgress,
  flattenScenarioScores,
  type BenchmarkProgressResponse,
} from "./kovaaks";

/** Viscose path: use our own decoded tier-threshold formula for exact Lemming/Hare/... names. */
function fromViscose(
  def: BenchmarkDef,
  progress: BenchmarkProgressResponse,
  now: string
): UnifiedBenchmarkProgress {
  const flat = flattenScenarioScores(progress);
  const rawScores: Record<string, { score: number; updatedAt: string }> = {};
  for (const [name, score] of Object.entries(flat)) {
    rawScores[name] = { score, updatedAt: now };
  }
  // Uses whichever Viscose difficulty this benchmark entry maps to.
  const viscose = computeViscoseProgress(def.viscoseDifficultyKey ?? "easier", rawScores, now);
  return {
    benchmarkId: def.id,
    benchmarkName: def.benchmarkName,
    difficultyName: def.difficultyName,
    overallRankName: viscose.overallTierName,
    groups: viscose.subcategoryTiers.map((s) => ({
      category: s.category,
      subcategory: s.subcategory,
      rankName: s.tierName,
      score: s.score,
    })),
    scenarioScores: flat,
    syncedAt: now,
  };
}

/** Voltaic path: use the decoded energy-interpolation + harmonic-mean formula. */
function fromVoltaic(
  def: BenchmarkDef,
  progress: BenchmarkProgressResponse,
  now: string
): UnifiedBenchmarkProgress {
  const flat = flattenScenarioScores(progress);
  const voltaic = computeVoltaicProgress(def.voltaicDifficultyKey ?? "novice", flat);
  return {
    benchmarkId: def.id,
    benchmarkName: def.benchmarkName,
    difficultyName: def.difficultyName,
    overallRankName: voltaic.overallRankName,
    groups: voltaic.groupEnergies.map((g) => ({
      category: g.category,
      subcategory: g.subcategory,
      rankName: g.rankName,
      score: g.energy,
    })),
    scenarioScores: flat,
    syncedAt: now,
  };
}

/** Generic path: trust KovaaK's own computed rank - required for benchmarks with bespoke formulas we don't have. */
function fromNative(
  def: BenchmarkDef,
  progress: BenchmarkProgressResponse,
  now: string
): UnifiedBenchmarkProgress {
  const rankName = (idx: number) => progress.ranks?.[idx]?.name?.trim() ?? `Rank ${idx}`;
  return {
    benchmarkId: def.id,
    benchmarkName: def.benchmarkName,
    difficultyName: def.difficultyName,
    overallRankName: rankName(progress.overall_rank),
    groups: Object.entries(progress.categories).map(([name, c]) => ({
      category: name.trim(),
      subcategory: name.trim(), // KovaaK's native response doesn't split into subcategories
      rankName: rankName(c.category_rank),
      score: c.benchmark_progress, // continuous - matches Voltaic's energy granularity, unlike the coarse rank index
    })),
    scenarioScores: flattenScenarioScores(progress),
    syncedAt: now,
  };
}

export async function syncBenchmarkProgress(
  def: BenchmarkDef,
  steamId: string
): Promise<UnifiedBenchmarkProgress> {
  if (!def.kovaaksBenchmarkId) {
    throw new Error(`${def.benchmarkName} (${def.difficultyName}) has no kovaaksBenchmarkId set yet.`);
  }
  const resolvedSteamId = await resolveToSteamId64(steamId);
  const progress = await getBenchmarkProgress(def.kovaaksBenchmarkId, resolvedSteamId);
  const now = new Date().toISOString();
  if (def.customFormula === "viscose") return fromViscose(def, progress, now);
  if (def.customFormula === "voltaic") return fromVoltaic(def, progress, now);
  return fromNative(def, progress, now);
}
