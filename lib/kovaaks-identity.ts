import { searchAccountNames } from "./kovaaks";

/**
 * KovaaK's account-search endpoint takes a text query (not a steamId), so
 * the resolution path is: search by the player's Steam display name, then
 * filter the candidate matches down to the one whose steamId matches the
 * client we already know. Traced from a working open-source tool
 * (KovaaksCompare) that does exactly this - not guessed.
 *
 * CONFIRMED LIVE LIMITATION: this only works for players who've set an
 * actual username on their kovaaks.com profile. Players who just play
 * through Steam without ever visiting the webapp have `username: null` in
 * the search response - and there is no working fallback. steamAccountName
 * looks like a plausible substitute but was tested live and returns
 * "Player does not exist" from the activity endpoint - it is NOT
 * interchangeable with the real webapp username, despite looking similar.
 *
 * Returns null both when no match is found AND when a match is found but
 * has no webapp username - callers should treat both the same way:
 * "activity data unavailable for this client," not an error to surface
 * loudly, since it's expected for a real chunk of players.
 */
export async function resolveKovaaksUsername(
  steamId: string,
  steamDisplayName: string
): Promise<string | null> {
  const matches = await searchAccountNames(steamDisplayName);
  const exact = matches.find((m) => m.steamId === steamId);
  return exact?.username ?? null;
}
