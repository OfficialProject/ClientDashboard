export type Difficulty = "easier" | "medium" | "hard";

export interface ScenarioScore {
  scenario: string;
  score: number;
  tier: number; // 0 = below lowest tier ("unranked" on that scenario)
  tierName: string;
  updatedAt: string; // ISO timestamp
}

export interface ViscoseProgress {
  difficulty: Difficulty;
  overallTier: number;
  overallTierName: string;
  scenarioScores: Record<string, ScenarioScore>; // keyed by scenario name
  subcategoryTiers: {
    label: string;
    category: string;
    subcategory: string;
    tier: number;
    tierName: string;
    score: number;
  }[];
  syncedAt: string | null; // null if never synced from KovaaK's
}

/**
 * Generic shape any benchmark's progress gets normalized into, regardless of
 * whether it came from our own decoded formula (Viscose) or KovaaK's own
 * native computed rank (every other benchmark). This is what the UI renders.
 */
export interface UnifiedBenchmarkProgress {
  benchmarkId: string; // registry id, e.g. "viscose-s2-easier"
  benchmarkName: string;
  difficultyName: string;
  overallRankName: string;
  groups: {
    category: string;
    subcategory: string;
    rankName: string;
    score: number; // continuous, comparable across syncs - see lib/viscose.ts / lib/voltaic.ts for what it means per formula
  }[];
  scenarioScores: Record<string, number>;
  syncedAt: string;
}

export interface Note {
  id: string;
  date: string; // ISO timestamp
  text: string;
}

export interface Client {
  id: string;
  nickname: string; // the name Luke knows them by
  steamId: string; // SteamID64
  steamName: string; // Steam persona name at time of add
  avatar: string;
  premierRating: number | null;
  faceitLevel: number | null;
  faceitElo: number | null;
  kovaaksUsername: string | null; // resolved lazily via lib/kovaaks-identity.ts, cached once found
  assignedBenchmarkId: string | null; // registry id of the benchmark they're currently working on
  benchmarkHistory: Record<string, UnifiedBenchmarkProgress[]>; // keyed by registry id, oldest -> newest; latest = [].at(-1)
  notes: Note[];
  createdAt: string;
}
