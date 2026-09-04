/**
 * FACEIT's official public Data API v4 - documented, stable, requires a
 * free self-serve API key from developers.faceit.com. A different
 * reliability tier entirely from the reverse-engineered KovaaK's
 * endpoints elsewhere in this app - this one has an actual published
 * contract. Not yet live-tested against a real key from this environment,
 * same caveat as every other external API here: first real call should be
 * treated as a smoke test, not an assumption.
 */

const BASE = "https://open.faceit.com/data/v4";

export interface FaceitPlayer {
  player_id: string;
  nickname: string;
  games?: {
    cs2?: {
      skill_level?: number;
      faceit_elo?: number;
    };
  };
}

export async function getFaceitPlayerBySteamId(steamId: string): Promise<FaceitPlayer | null> {
  const key = process.env.FACEIT_API_KEY;
  if (!key) throw new Error("FACEIT_API_KEY is not configured.");

  const url = `${BASE}/players?game=cs2&game_player_id=${encodeURIComponent(steamId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 0 },
  });
  if (res.status === 404) return null; // no FACEIT account linked to this steamId
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FACEIT request failed (${res.status}): ${body || "no response body"}`);
  }
  return res.json();
}

/**
 * Lifetime aggregate CS2 stats - real FACEIT-computed numbers (K/D, ADR,
 * HS%, win rate), not demo-parsed by us. This is the honest non-subtick
 * placeholder for Leetify-style scoreboard stats: genuine data, just
 * coarser than what subtick-engagement-analyzer will eventually produce
 * (no per-round/per-duel breakdown, no aim/utility/positioning scoring -
 * those genuinely need demo parsing and aren't approximated here).
 * FACEIT's own field naming has drifted before (see the KovaaK's/Voltaic
 * formula-decay precedent elsewhere in this app), so this is read
 * defensively rather than assuming a fixed shape.
 */
export interface FaceitLifetimeStats {
  raw: Record<string, unknown>;
  matches: number | null;
  winRatePct: number | null;
  avgKD: number | null;
  avgHeadshotPct: number | null;
  avgDamagePerRound: number | null;
  currentWinStreak: number | null;
  longestWinStreak: number | null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

export async function getFaceitLifetimeStats(playerId: string): Promise<FaceitLifetimeStats | null> {
  const key = process.env.FACEIT_API_KEY;
  if (!key) throw new Error("FACEIT_API_KEY is not configured.");

  const res = await fetch(`${BASE}/players/${encodeURIComponent(playerId)}/stats/cs2`, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 0 },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FACEIT stats request failed (${res.status}): ${body || "no response body"}`);
  }
  const data = await res.json();
  const lifetime: Record<string, unknown> = data?.lifetime ?? {};

  return {
    raw: lifetime,
    matches: num(lifetime["Matches"]),
    winRatePct: num(lifetime["Win Rate %"]),
    avgKD: num(lifetime["Average K/D Ratio"]),
    avgHeadshotPct: num(lifetime["Average Headshots %"]),
    avgDamagePerRound: num(lifetime["ADR"]) ?? num(lifetime["Average Damage per Round"]),
    currentWinStreak: num(lifetime["Current Win Streak"]),
    longestWinStreak: num(lifetime["Longest Win Streak"]),
  };
}

export interface MatchPlayerStats {
  map: string | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  adr: number | null;
  headshotPct: number | null;
  mvps: number | null;
  won: boolean | null;
}

/**
 * Per-map stats for one player in one match. Field names inside
 * `player_stats` (Kills, Deaths, ADR, Headshots %, etc.) are based on the
 * stat categories consistently used across FACEIT's own tooling ecosystem
 * (FaceitTracker, faceit-ruby, and others all expose the same set) - the
 * exact key strings are read defensively with fallbacks rather than
 * asserted with full certainty, same caution as the lifetime-stats parser
 * above, since this specific nested shape hasn't been hit against a real
 * response from this codebase yet.
 */
export async function getMatchPlayerStats(matchId: string, playerId: string): Promise<MatchPlayerStats | null> {
  const key = process.env.FACEIT_API_KEY;
  if (!key) throw new Error("FACEIT_API_KEY is not configured.");

  const res = await fetch(`${BASE}/matches/${encodeURIComponent(matchId)}/stats`, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const rounds = (data?.rounds as Array<Record<string, unknown>> | undefined) ?? [];

  for (const round of rounds) {
    const roundStats = round["round_stats"] as Record<string, unknown> | undefined;
    const map = typeof roundStats?.["Map"] === "string" ? (roundStats["Map"] as string) : null;
    const teams = (round["teams"] as Array<Record<string, unknown>> | undefined) ?? [];

    for (const team of teams) {
      const players = (team["players"] as Array<Record<string, unknown>> | undefined) ?? [];
      const player = players.find((p) => p["player_id"] === playerId);
      if (!player) continue;

      const stats = (player["player_stats"] as Record<string, unknown> | undefined) ?? {};
      return {
        map,
        kills: num(stats["Kills"]),
        deaths: num(stats["Deaths"]),
        assists: num(stats["Assists"]),
        adr: num(stats["ADR"]),
        headshotPct: num(stats["Headshots %"]),
        mvps: num(stats["MVPs"]),
        won: stats["Result"] !== undefined ? stats["Result"] === "1" || stats["Result"] === 1 : null,
      };
    }
  }
  return null; // player not found in this match's stats (shouldn't normally happen for a match in their own history)
}

export interface FaceitRecentMatch {
  matchId: string;
  finishedAt: string | null;
  map: string | null;
  result: "win" | "loss" | "unknown";
}

/** Looks up the map for one match via the stats endpoint - `rounds[0].round_stats.Map` is where FACEIT actually puts it, not anywhere on the lightweight history endpoint (verified against real usage, not guessed - the original version of this guessed a `voting.map.pick` field that doesn't exist on this endpoint at all, which is why every match showed "Unknown map"). */
async function getMatchMap(matchId: string, key: string): Promise<string | null> {
  const res = await fetch(`${BASE}/matches/${encodeURIComponent(matchId)}/stats`, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const rounds = data?.rounds as Array<Record<string, unknown>> | undefined;
  const roundStats = rounds?.[0]?.["round_stats"] as Record<string, unknown> | undefined;
  const map = roundStats?.["Map"];
  return typeof map === "string" ? map : null;
}

/** Recent match list - win/loss + map. Per-match KDA would need yet another lookup per match and is left out here rather than firing even more extra requests for a placeholder panel. */
export async function getFaceitRecentMatches(playerId: string, limit = 10): Promise<FaceitRecentMatch[]> {
  const key = process.env.FACEIT_API_KEY;
  if (!key) throw new Error("FACEIT_API_KEY is not configured.");

  const res = await fetch(
    `${BASE}/players/${encodeURIComponent(playerId)}/history?game=cs2&offset=0&limit=${limit}`,
    { headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 0 } }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FACEIT history request failed (${res.status}): ${body || "no response body"}`);
  }
  const data = await res.json();
  const items: unknown[] = data?.items ?? [];

  const matches = await Promise.all(
    items.map(async (raw): Promise<FaceitRecentMatch> => {
      const item = raw as Record<string, unknown>;
      const results = item["results"] as Record<string, unknown> | undefined;
      const winnerFaction = results?.["winner"] as string | undefined;
      const teams = item["teams"] as Record<string, unknown> | undefined;
      let result: FaceitRecentMatch["result"] = "unknown";
      if (winnerFaction && teams) {
        for (const [factionKey, teamVal] of Object.entries(teams)) {
          const roster = (teamVal as Record<string, unknown>)?.["players"] as Array<Record<string, unknown>> | undefined;
          if (roster?.some((p) => p["player_id"] === playerId)) {
            result = factionKey === winnerFaction ? "win" : "loss";
          }
        }
      }
      const matchId = String(item["match_id"] ?? "");
      const map = matchId ? await getMatchMap(matchId, key).catch(() => null) : null;
      return {
        matchId,
        finishedAt: item["finished_at"] ? new Date(Number(item["finished_at"]) * 1000).toISOString() : null,
        map,
        result,
      };
    })
  );

  return matches;
}
