const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";

/** Builds the URL to redirect the user to Steam's own login page. realm/returnTo must match what's registered - Steam checks the return_to URL's domain against the realm. */
export function buildSteamLoginUrl(returnTo: string, realm: string): string {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`;
}

/**
 * Verifies a Steam OpenID callback is genuine (not forged) by re-posting
 * the exact params back to Steam with mode=check_authentication - Steam
 * either confirms or rejects it. Returns the verified SteamID64, or null
 * if verification failed.
 */
export async function verifySteamCallback(params: URLSearchParams): Promise<string | null> {
  const claimedId = params.get("openid.claimed_id");
  if (!claimedId) return null;

  // claimed_id looks like https://steamcommunity.com/openid/id/76561198012345678
  const match = claimedId.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
  if (!match) return null;
  const steamId64 = match[1];

  const verifyParams = new URLSearchParams(params);
  verifyParams.set("openid.mode", "check_authentication");

  const res = await fetch(STEAM_OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });
  if (!res.ok) return null;

  const body = await res.text();
  const isValid = /is_valid\s*:\s*true/.test(body);
  return isValid ? steamId64 : null;
}
