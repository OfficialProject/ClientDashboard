/**
 * KovaaK's webapp backend client.
 *
 * The Benchmark Tracker is public and community tools use the same backend,
 * but the endpoints are undocumented. Keep the raw response available for
 * diagnostics so a backend change cannot silently look like "0 scores".
 */
const BASE = "https://kovaaks.com/webapp-backend";

export interface BenchmarkProgressScenario {
  score: number;
  leaderboard_rank?: number;
  scenario_rank?: number;
  rank_maxes?: number[];
}
export interface BenchmarkProgressCategory {
  benchmark_progress?: number;
  category_rank?: number;
  rank_maxes?: number[];
  scenarios: Record<string, BenchmarkProgressScenario>;
}
export interface BenchmarkProgressResponse {
  benchmark_progress?: number;
  overall_rank?: number;
  categories?: Record<string, BenchmarkProgressCategory>;
  ranks?: { name: string; color: string }[];
  [key: string]: unknown;
}

export interface KovaaKsDiagnostic {
  url: string;
  status: number;
  ok: boolean;
  contentType: string | null;
  bodyPreview: string;
  json: unknown;
}

async function fetchJson(url: string): Promise<KovaaKsDiagnostic> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "EsportsCoachDashboard/0.9"
    }
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return {
    url,
    status: res.status,
    ok: res.ok,
    contentType: res.headers.get("content-type"),
    bodyPreview: text.slice(0, 4000),
    json
  };
}

export async function getBenchmarkProgress(
  benchmarkId: number,
  steamId: string
): Promise<BenchmarkProgressResponse> {
  const diagnostic = await getBenchmarkProgressDiagnostic(benchmarkId, steamId);
  if (!diagnostic.ok) {
    throw new Error(
      `KovaaK's returned HTTP ${diagnostic.status}. ${diagnostic.bodyPreview.slice(0, 500)}`
    );
  }
  if (!diagnostic.json || typeof diagnostic.json !== "object") {
    throw new Error(`KovaaK's returned a non-JSON response: ${diagnostic.bodyPreview.slice(0, 500)}`);
  }
  return diagnostic.json as BenchmarkProgressResponse;
}

export async function getBenchmarkProgressDiagnostic(
  benchmarkId: number,
  steamId: string
): Promise<KovaaKsDiagnostic> {
  const url = new URL(`${BASE}/benchmarks/player-progress-rank-benchmark`);
  url.searchParams.set("benchmarkId", String(benchmarkId));
  url.searchParams.set("steamId", steamId);
  url.searchParams.set("page", "0");
  url.searchParams.set("max", "100");
  return fetchJson(url.toString());
}

export function flattenScenarioScores(
  progress: BenchmarkProgressResponse
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const category of Object.values(progress.categories ?? {})) {
    for (const [name, s] of Object.entries(category.scenarios ?? {})) {
      if (typeof s.score === "number") out[name] = s.score;
    }
  }
  return out;
}

export async function searchScenarioLeaderboardId(
  scenarioName: string
): Promise<number | null> {
  const url = `${BASE}/scenario/popular?page=0&max=20&scenarioNameSearch=${encodeURIComponent(scenarioName)}`;
  const diagnostic = await fetchJson(url);
  if (!diagnostic.ok || !diagnostic.json || typeof diagnostic.json !== "object") return null;
  const data = diagnostic.json as { data?: { scenarioName: string; leaderboardId: number }[] };
  const exact = (data.data ?? []).find(
    (s) => s.scenarioName.toLowerCase() === scenarioName.toLowerCase()
  );
  return exact?.leaderboardId ?? data.data?.[0]?.leaderboardId ?? null;
}
