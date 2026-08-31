import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const vanityurl = request.nextUrl.searchParams.get("vanity")?.trim();
  const key = process.env.STEAM_WEB_API_KEY;
  if (!vanityurl) return NextResponse.json({ error: "vanity is required" }, { status: 400 });
  if (!key)
    return NextResponse.json({ error: "STEAM_WEB_API_KEY is not configured" }, { status: 503 });

  const url = new URL("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/");
  url.searchParams.set("key", key);
  url.searchParams.set("vanityurl", vanityurl);

  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) return NextResponse.json({ error: "Steam resolve failed" }, { status: 502 });

  const result = (await response.json())?.response;
  if (!result?.success || !result?.steamid)
    return NextResponse.json({ error: "Steam vanity URL not found" }, { status: 404 });

  return NextResponse.json({ steamId: result.steamid });
}
