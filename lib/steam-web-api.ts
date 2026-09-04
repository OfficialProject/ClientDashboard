/**
 * GetNextMatchSharingCode is a normal HTTPS Steam Web API endpoint (not
 * the Game Coordinator) - it turns a player's "last known" share code
 * into the next one in their match history. Needs three things per
 * player: their SteamID64, their own CS2 match-history authentication
 * code (a per-account code the player generates once from CS2's in-game
 * settings > "Game" tab - not a normal login credential, and not
 * something this app can obtain on the player's behalf), and a known
 * prior share code to start the chain from. Once you have one real
 * share code for a player, this can walk forward through their match
 * history without needing anything from the GC - the GC bot is only
 * needed to turn a share code into an actual demo URL, not to discover
 * new share codes.
 */

const BASE = "https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1";

export interface NextMatchSharingCodeResult {
  nextCode: string | null; // null when there's no newer match than knownCode
}

export async function getNextMatchSharingCode(
  steamId: string,
  authCode: string,
  knownCode: string
): Promise<NextMatchSharingCodeResult> {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) throw new Error("STEAM_WEB_API_KEY is not configured.");

  const url = `${BASE}/?key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(steamId)}&steamidkey=${encodeURIComponent(
    authCode
  )}&knowncode=${encodeURIComponent(knownCode)}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  const body = await res.text();

  // Valve returns a 202 with no body when there's no newer match yet, and
  // otherwise a 200 with JSON - not fully verified against a live account
  // from this environment, same "first real call is a smoke test" caveat
  // as everywhere else external in this codebase.
  if (res.status === 202) return { nextCode: null };
  if (!res.ok) throw new Error(`Steam Web API request failed (${res.status}): ${body || "no response body"}`);

  const parsed = JSON.parse(body);
  const nextCode: string | undefined = parsed?.result?.nextcode;
  if (!nextCode || nextCode === "n/a") return { nextCode: null };
  return { nextCode };
}
