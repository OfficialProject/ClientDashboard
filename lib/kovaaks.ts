/**
 * Client for KovaaK's own webapp backend (kovaaks.com/webapp-backend/...).
 *
 * IMPORTANT: this is an unofficial, reverse-engineered API - not documented
 * or supported by KovaaK Games. It's the same surface community tools
 * (evxl.app included, almost certainly) use. It can change without notice.
 * None of these calls have been executed live from this environment
 * (kovaaks.com isn't reachable from the build sandbox) - the contracts
 * below are transcribed from a public Postman collection and a working
 * open-source wrapper, but the FIRST real call should be treated as a
 * smoke test, not an assumption.
 *
 * Primary path: KovaaK's computes full benchmark progress (every scenario's
 * score, for a given benchmarkId + steamId) in one call, no auth, no
 * username resolution needed - GET .../benchmarks/player-progress-rank-benchmark.
 * We use it purely as a raw-score source and re-run OUR OWN Viscose tier
 * math (lib/viscose.ts) on top, because KovaaK's own "rank" field uses its
 * generic Bronze/Silver/Gold ladder, not Viscose's Lemming/Hare/... names.
 */

const BASE = "https://kovaaks.com/webapp-backend";

export interface BenchmarkProgressScenario {
  score: number;
  leaderboard_rank: number;
  scenario_rank: number;
  rank_maxes: number[];
}
export interface BenchmarkProgressCategory {
  benchmark_progress: number;
  category_rank: number;
  rank_maxes: number[];
  scenarios: Record<string, BenchmarkProgressScenario>;
}
export interface BenchmarkProgressResponse {
  benchmark_progress: number;
  overall_rank: number;
  categories: Record<string, BenchmarkProgressCategory>;
  ranks: { name: string; color: string }[];
}

export async function getBenchmarkProgress(
  benchmarkId: number,
  steamId: string
): Promise<BenchmarkProgressResponse> {
  const url = `${BASE}/benchmarks/player-progress-rank-benchmark?benchmarkId=${benchmarkId}&steamId=${steamId}&page=0&max=100`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`KovaaK's benchmark-progress request failed (${res.status})`);
  }
  return res.json();
}

/** Flattens the nested category->scenario response into {scenarioName: score}. */
export function flattenScenarioScores(
  progress: BenchmarkProgressResponse
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const category of Object.values(progress.categories)) {
    for (const [name, s] of Object.entries(category.scenarios)) {
      out[name] = s.score;
    }
  }
  return out;
}

/**
 * Fallback path if a benchmark isn't registered under a clean benchmarkId:
 * search a scenario by exact name to get its leaderboardId, then you'd
 * still need a KovaaK's webapp *username* (not steamId) to pull an
 * individual score via /user/scenario/total-play - see README for the
 * unresolved steamId -> username step. Prefer getBenchmarkProgress above
 * whenever the benchmarkId is known.
 */
export async function searchScenarioLeaderboardId(
  scenarioName: string
): Promise<number | null> {
  const url = `${BASE}/scenario/popular?page=0&max=20&scenarioNameSearch=${encodeURIComponent(
    scenarioName
  )}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data = await res.json();
  const exact = (data.data as { scenarioName: string; leaderboardId: number }[]).find(
    (s) => s.scenarioName.toLowerCase() === scenarioName.toLowerCase()
  );
  return exact?.leaderboardId ?? data.data?.[0]?.leaderboardId ?? null;
}
