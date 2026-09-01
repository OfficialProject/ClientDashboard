import voltaicDataRaw from "./voltaic-data.json";

export type VoltaicDifficulty = "novice" | "intermediate" | "advanced";

interface ScenarioDef {
  name: string;
  category: string;
  subcategory: string;
  thresholds: number[]; // [h, i, j, k]
}
interface Group {
  label: string;
  scenario_idx: number[];
}
interface DifficultyDef {
  tiers: string[]; // 4 tier names
  energyLevels: number[]; // 4 energy values, one per tier
  scenarios: ScenarioDef[];
  groups: Group[];
}

const voltaicData = voltaicDataRaw as unknown as Record<VoltaicDifficulty, DifficultyDef>;

/**
 * Decoded from Voltaic_x_KovaaKs_Benchmarks_S5.5.xlsx's array formulas
 * (column G on each difficulty sheet). Meaningfully different from
 * Viscose's discrete tier-match + weakest-link system:
 *
 * 1. Per scenario: score maps to a continuous "energy" value via PIECEWISE
 *    LINEAR interpolation between (score, energy) breakpoints - one
 *    breakpoint per rank threshold, plus a floor anchor. Energy is NOT
 *    clamped at the top: it keeps extrapolating past the highest threshold
 *    using that segment's slope, then gets capped separately (see below).
 * 2. Per group (2-3 scenarios): energy = MAX of the group's scenario
 *    energies, capped at a ceiling ("min(nextDifficultyFloorEnergy, ...)").
 *    For Novice/Intermediate the floor anchor is (0 score, 0 energy) and
 *    the cap is the next difficulty's first tier's energy. Advanced has no
 *    next difficulty, so it anchors backward from its own first segment's
 *    slope (using Intermediate's ceiling energy as the synthetic floor) and
 *    caps at its own top tier's energy instead.
 * 3. Overall energy = TRUNC(HARMONIC MEAN of all group energies) - NOT a
 *    simple average and NOT a min/weakest-link like Viscose. Any group at
 *    or below 0 energy collapses the whole result to 0 (mirrors the
 *    spreadsheet's IFERROR-wrapped HARMEAN, which errors on a zero input).
 * 4. Overall energy maps to a rank name via the same threshold-match
 *    pattern as Viscose: highest tier whose energy is <= overall energy.
 */

const CHAIN: VoltaicDifficulty[] = ["novice", "intermediate", "advanced"];

function nextDifficulty(d: VoltaicDifficulty): VoltaicDifficulty | null {
  const idx = CHAIN.indexOf(d);
  return idx < CHAIN.length - 1 ? CHAIN[idx + 1] : null;
}
function prevDifficulty(d: VoltaicDifficulty): VoltaicDifficulty | null {
  const idx = CHAIN.indexOf(d);
  return idx > 0 ? CHAIN[idx - 1] : null;
}

function interpolateEnergy(score: number, breakScores: number[], breakEnergies: number[]): number {
  let seg = 0;
  for (let s = 0; s < breakScores.length - 1; s++) {
    if (score >= breakScores[s]) seg = s;
  }
  const x0 = breakScores[seg];
  const x1 = breakScores[seg + 1];
  const y0 = breakEnergies[seg];
  const y1 = breakEnergies[seg + 1];
  const width = x1 - x0 || 1;
  return y0 + ((score - x0) / width) * (y1 - y0);
}

function scenarioEnergy(
  difficulty: VoltaicDifficulty,
  score: number,
  thresholds: number[]
): number {
  const def = voltaicData[difficulty];
  const [h, i] = thresholds;
  const prev = prevDifficulty(difficulty);

  let breakScores: number[];
  let breakEnergies: number[];

  if (difficulty === "advanced" && prev) {
    // Real formula's match array is {0, H-(I-H), H, I, J, K} - SIX points.
    // The explicit 0->0 anchor matters: without it, an unplayed scenario
    // (score 0) falls into the synthetic-floor segment and extrapolates
    // backward into negative energy instead of hitting an exact 0 match.
    const syntheticFloor = h - (i - h);
    breakScores = [0, syntheticFloor, ...thresholds];
    breakEnergies = [0, prevCeiling(prev), ...def.energyLevels];
  } else {
    breakScores = [0, ...thresholds];
    breakEnergies = [0, ...def.energyLevels];
  }

  return interpolateEnergy(score, breakScores, breakEnergies);
}

function prevCeiling(prev: VoltaicDifficulty): number {
  return voltaicData[prev].energyLevels[3];
}

function groupCap(difficulty: VoltaicDifficulty): number {
  const next = nextDifficulty(difficulty);
  return next ? voltaicData[next].energyLevels[0] : voltaicData[difficulty].energyLevels[3];
}

function harmonicMean(values: number[]): number {
  if (values.some((v) => v <= 0)) return 0;
  return values.length / values.reduce((sum, v) => sum + 1 / v, 0);
}

function energyToRank(energy: number, def: DifficultyDef): string {
  let idx = 0;
  for (let i = 0; i < def.energyLevels.length; i++) {
    if (energy >= def.energyLevels[i]) idx = i + 1;
  }
  return idx === 0 ? "Unranked" : def.tiers[idx - 1];
}

export interface VoltaicProgress {
  difficulty: VoltaicDifficulty;
  overallEnergy: number;
  overallRankName: string;
  groupEnergies: { label: string; category: string; subcategory: string; energy: number; rankName: string }[];
  scenarioScores: Record<string, number>;
}

export function computeVoltaicProgress(
  difficulty: VoltaicDifficulty,
  rawScores: Record<string, number>
): VoltaicProgress {
  const def = voltaicData[difficulty];
  const cap = groupCap(difficulty);

  const scenarioEnergies = def.scenarios.map((s) =>
    scenarioEnergy(difficulty, rawScores[s.name] ?? 0, s.thresholds)
  );

  const groupEnergies = def.groups.map((g) => {
    const best = Math.max(...g.scenario_idx.map((i) => scenarioEnergies[i]));
    const energy = Math.trunc(Math.min(cap, best));
    return {
      label: g.label,
      category: def.scenarios[g.scenario_idx[0]].category,
      subcategory: g.label,
      energy,
      rankName: energyToRank(energy, def),
    };
  });

  const overallEnergy = Math.trunc(harmonicMean(groupEnergies.map((g) => g.energy)));

  return {
    difficulty,
    overallEnergy,
    overallRankName: energyToRank(overallEnergy, def),
    groupEnergies,
    scenarioScores: rawScores,
  };
}

export function listVoltaicScenarioNames(difficulty: VoltaicDifficulty): string[] {
  return voltaicData[difficulty].scenarios.map((s) => s.name);
}
