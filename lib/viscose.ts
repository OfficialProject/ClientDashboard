import viscoseDataRaw from "./viscose-data.json";
import type { Difficulty, ScenarioScore, ViscoseProgress } from "./types";

interface ScenarioDef {
  name: string;
  category: string;
  subcategory: string;
  thresholds: number[];
}
interface Group {
  label: string;
  scenario_idx: number[];
}
interface DifficultyDef {
  tiers: string[];
  scenarios: ScenarioDef[];
  groups: Group[];
}

const viscoseData = viscoseDataRaw as unknown as Record<Difficulty, DifficultyDef>;

/**
 * Decoded from Viscose_Benchmarks.xlsx (brank/irank/arank helper sheets):
 *
 * 1. Per scenario: match the raw score against that scenario's 8 (or 6, for Hard)
 *    tier thresholds. Tier = index of the highest threshold the score meets or
 *    beats. 0 = below the lowest threshold (no tier reached on that scenario).
 * 2. Scenarios are grouped into 14 fixed subcategories (sizes 2 or 3, by row
 *    position in the sheet - NOT by matching the subcategory label text, since
 *    labels like "Speed" and "Reading" repeat across two separate groups).
 * 3. Subcategory tier = MAX tier among that subcategory's scenarios (best
 *    scenario counts).
 * 4. Overall rank = MIN tier among all 14 subcategory tiers (weakest link -
 *    you need at least one qualifying score in every subcategory).
 */

export function getDifficultyDef(difficulty: Difficulty): DifficultyDef {
  return viscoseData[difficulty];
}

export function listScenarioNames(difficulty: Difficulty): string[] {
  return viscoseData[difficulty].scenarios.map((s) => s.name);
}

function scenarioTier(thresholds: number[], score: number): number {
  let tier = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (score >= thresholds[i]) tier = i + 1;
  }
  return tier;
}

/**
 * Continuous 0-(100*tierCount) score: tier*100, plus 0-99 for progress
 * toward the next tier within the current one. Not part of the sheet's own
 * formula (Viscose only has discrete tiers) - built so tier movement is
 * trend-able across syncs instead of only visible as a tier-name jump.
 */
function scenarioScore(thresholds: number[], score: number): number {
  const tier = scenarioTier(thresholds, score);
  if (tier === 0) {
    const progress = Math.max(0, Math.min(99, (score / thresholds[0]) * 100));
    return progress;
  }
  if (tier === thresholds.length) return tier * 100;
  const floor = thresholds[tier - 1];
  const ceil = thresholds[tier];
  const progress = Math.max(0, Math.min(99, ((score - floor) / (ceil - floor)) * 100));
  return tier * 100 + progress;
}

/**
 * rawScores: map of scenario name -> best score. Missing scenarios are
 * treated as tier 0 (unranked on that scenario) - matching the sheet's
 * behavior where an empty High Score cell doesn't qualify for any tier.
 */
export function computeViscoseProgress(
  difficulty: Difficulty,
  rawScores: Record<string, { score: number; updatedAt: string }>,
  syncedAt: string | null
): ViscoseProgress {
  const def = viscoseData[difficulty];
  const scenarioScores: Record<string, ScenarioScore> = {};
  const tiersByIdx: number[] = [];
  const scoresByIdx: number[] = [];

  def.scenarios.forEach((s, idx) => {
    const raw = rawScores[s.name];
    const score = raw?.score ?? 0;
    const tier = scenarioTier(s.thresholds, score);
    tiersByIdx[idx] = tier;
    scoresByIdx[idx] = scenarioScore(s.thresholds, score);
    scenarioScores[s.name] = {
      scenario: s.name,
      score,
      tier,
      tierName: tier === 0 ? "Unranked" : def.tiers[tier - 1],
      updatedAt: raw?.updatedAt ?? "",
    };
  });

  const subcategoryTiers = def.groups.map((g) => {
    const bestIdx = g.scenario_idx.reduce((best, i) =>
      scoresByIdx[i] > scoresByIdx[best] ? i : best
    );
    const best = tiersByIdx[bestIdx];
    return {
      label: g.label,
      category: def.scenarios[g.scenario_idx[0]].category,
      subcategory: g.label,
      tier: best,
      tierName: best === 0 ? "Unranked" : def.tiers[best - 1],
      score: scoresByIdx[bestIdx],
    };
  });

  const overallTier = Math.min(...subcategoryTiers.map((s) => s.tier));

  return {
    difficulty,
    overallTier,
    overallTierName: overallTier === 0 ? "Unranked" : def.tiers[overallTier - 1],
    scenarioScores,
    subcategoryTiers,
    syncedAt,
  };
}
