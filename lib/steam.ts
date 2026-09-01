import { parseSteamInput } from "./parse-steam-input";

/**
 * Resolves a SteamID64, vanity name, or profile URL to a raw 17-digit
 * SteamID64. Used anywhere we're about to call an external API that's
 * strict about the format (KovaaK's webapp-backend rejects anything that
 * isn't exactly /^\d{17}$/).
 */
export async function resolveToSteamId64(rawInput: string): Promise<string> {
  const parsed = parseSteamInput(rawInput);
  if (!parsed) throw new Error("Could not parse a Steam ID, vanity name, or profile URL.");

  if (parsed.type === "steamid64") return parsed.value;

  // Vanity URL slugs only allow letters, numbers, underscores, hyphens - no
  // spaces. A bare display name ("keys", "Stk The Lord") isn't resolvable
  // at all: Steam's Web API has no display-name lookup, only vanity URL
  // resolution, and display names aren't even unique across accounts.
  if (/\s/.test(parsed.value)) {
    throw new Error(
      "That looks like a display name, not a vanity URL - Steam doesn't support looking accounts up by display name. Paste their profile link (steamcommunity.com/id/... or /profiles/...) or their vanity URL slug instead."
    );
  }

  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) throw new Error("STEAM_WEB_API_KEY is not configured.");

  const url = new URL("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/");
  url.searchParams.set("key", key);
  url.searchParams.set("vanityurl", parsed.value);

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error("Steam vanity resolve request failed.");
  const result = (await res.json())?.response;
  if (!result?.success || !result?.steamid) {
    throw new Error(`Steam vanity "${parsed.value}" not found.`);
  }
  return result.steamid;
}
