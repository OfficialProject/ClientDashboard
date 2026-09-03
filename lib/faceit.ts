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
