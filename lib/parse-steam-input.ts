export type ParsedSteamInput =
  | { type: "steamid64"; value: string }
  | { type: "vanity"; value: string };

/**
 * Accepts a raw SteamID64, a bare vanity name, or a full
 * steamcommunity.com/id/... or /profiles/... URL (with or without
 * protocol, trailing slash, or extra path segments).
 */
export function parseSteamInput(raw: string): ParsedSteamInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(
    /steamcommunity\.com\/(id|profiles)\/([^/?#]+)/i
  );
  if (urlMatch) {
    const [, kind, value] = urlMatch;
    return kind === "profiles" && /^\d{17}$/.test(value)
      ? { type: "steamid64", value }
      : { type: "vanity", value };
  }

  if (/^\d{17}$/.test(trimmed)) {
    return { type: "steamid64", value: trimmed };
  }

  return { type: "vanity", value: trimmed };
}
