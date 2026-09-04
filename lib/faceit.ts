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

export interface FaceitRecentMatch {
  matchId: string;
  finishedAt: string | null;
  map: string | null;
  result: "win" | "loss" | "unknown";
}

/** Recent match list - win/loss + map only. Per-match KDA would need a second lookup per match (/matches/{id}/stats) and is left out here rather than firing N extra requests for a placeholder panel. */
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

  return items.map((raw): FaceitRecentMatch => {
    const item = raw as Record<string, unknown>;
    const results = item["results"] as Record<string, unknown> | undefined;
    const winnerFaction = results?.["winner"] as string | undefined;
    const teams = item["teams"] as Record<string, unknown> | undefined;
    // Which faction this player's team was on isn't in the summary payload without matching player_id inside team rosters - left "unknown" when it can't be determined cheaply.
    let result: FaceitRecentMatch["result"] = "unknown";
    if (winnerFaction && teams) {
      for (const [factionKey, teamVal] of Object.entries(teams)) {
        const roster = (teamVal as Record<string, unknown>)?.["players"] as Array<Record<string, unknown>> | undefined;
        if (roster?.some((p) => p["player_id"] === playerId)) {
          result = factionKey === winnerFaction ? "win" : "loss";
        }
      }
    }
    return {
      matchId: String(item["match_id"] ?? ""),
      finishedAt: item["finished_at"] ? new Date(Number(item["finished_at"]) * 1000).toISOString() : null,
      map: (item["voting"] as Record<string, unknown>)?.["map"]
        ? String(((item["voting"] as Record<string, unknown>)["map"] as Record<string, unknown>)["pick"])
        : null,
      result,
    };
  });
}
