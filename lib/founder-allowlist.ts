import { resolveToSteamId64 } from "./steam";

interface AllowlistEntry {
  identifier: string; // vanity slug, numeric SteamID64, or full profile URL - resolveToSteamId64 handles all three
  label: string;
  role: "user" | "admin";
}

export const FOUNDER_ALLOWLIST: AllowlistEntry[] = [
  { identifier: "https://steamcommunity.com/id/OfficialPrxject/", label: "Prxject (owner)", role: "admin" },
  { identifier: "https://steamcommunity.com/profiles/76561198390405188", label: "TheGlitch (first client)", role: "user" },
  { identifier: "https://steamcommunity.com/id/LKeysOS", label: "LKeysOS (second client)", role: "user" },
];

let cache: { steamId64: string; role: "user" | "admin"; label: string }[] | null = null;

async function resolveAllowlist() {
  if (cache) return cache;
  cache = await Promise.all(
    FOUNDER_ALLOWLIST.map(async (entry) => ({
      steamId64: await resolveToSteamId64(entry.identifier),
      role: entry.role,
      label: entry.label,
    }))
  );
  return cache;
}

/** Checks a just-verified SteamID64 (from OpenID) against the allowlist. Returns the grant to apply, or null if not on the list. */
export async function checkFounderAllowlist(steamId64: string): Promise<{ role: "user" | "admin"; label: string } | null> {
  const resolved = await resolveAllowlist();
  const match = resolved.find((e) => e.steamId64 === steamId64);
  return match ? { role: match.role, label: match.label } : null;
}
