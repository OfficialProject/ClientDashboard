import type { Routine } from "./types";
import type { RecentActivityEntry } from "./kovaaks";

export interface RoutineScenarioStatus {
  scenario: string;
  practiced: boolean;
  lastPracticed: string | null;
}

/**
 * "Practiced" means the scenario shows up in activity data timestamped
 * after the routine was created - not that the score improved, just that
 * it was played. Depends entirely on whatever activity feed is available
 * (real feed or the reconstructed leaderboard fallback) - same coverage
 * limits as Recent Activity already has.
 */
export function computeRoutineProgress(
  routine: Routine,
  activityEntries: RecentActivityEntry[] | null
): RoutineScenarioStatus[] {
  const createdAt = new Date(routine.createdAt).getTime();
  return routine.scenarios.map((scenario) => {
    const plays = (activityEntries ?? []).filter(
      (e) => e.scenarioName === scenario && new Date(e.timestamp).getTime() >= createdAt
    );
    if (plays.length === 0) return { scenario, practiced: false, lastPracticed: null };
    const latest = plays.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b));
    return { scenario, practiced: true, lastPracticed: latest.timestamp };
  });
}
