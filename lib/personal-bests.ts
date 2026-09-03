import type { UnifiedBenchmarkProgress } from "./types";

export interface PersonalBest {
  scenario: string;
  score: number;
  previousBest: number;
}

/** Only flags a scenario as a PB if it had a prior recorded score to beat - a scenario's first-ever sync isn't a "personal best," it's just a first data point. */
export function computePersonalBests(history: UnifiedBenchmarkProgress[]): PersonalBest[] {
  if (history.length < 2) return [];
  const latest = history[history.length - 1];
  const prior = history.slice(0, -1);

  const out: PersonalBest[] = [];
  for (const [scenario, score] of Object.entries(latest.scenarioScores)) {
    const priorScores = prior.map((h) => h.scenarioScores[scenario]).filter((v): v is number => v !== undefined);
    if (priorScores.length === 0) continue;
    const previousBest = Math.max(...priorScores);
    if (score > previousBest) {
      out.push({ scenario, score, previousBest });
    }
  }
  return out.sort((a, b) => b.score - b.previousBest - (a.score - a.previousBest));
}
