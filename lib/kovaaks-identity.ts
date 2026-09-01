import { searchAccountNames } from "./kovaaks";

/**
 * KovaaK's account-search endpoint takes a text query (not a steamId), so
 * the resolution path is: search by the player's Steam display name, then
 * filter the candidate matches down to the one whose steamId matches the
 * client we already know. Traced from a working open-source tool
 * (KovaaksCompare) that does exactly this - not guessed.
 *
 * Returns null if no confident match is found (ambiguous or no results) -
 * callers should treat that as "activity data unavailable for this client
 * right now," not as an error to surface loudly.
 */
export async function resolveKovaaksUsername(
  steamId: string,
  steamDisplayName: string
): Promise<string | null> {
  const matches = await searchAccountNames(steamDisplayName);
  const exact = matches.find((m) => m.steamId === steamId);
  return exact?.username ?? exact?.steamAccountName ?? null;
}
