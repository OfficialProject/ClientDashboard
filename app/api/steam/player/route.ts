import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const steamid = request.nextUrl.searchParams.get("steamid")?.trim();
  const key = process.env.STEAM_WEB_API_KEY;
  if (!steamid) return NextResponse.json({ error: "steamid is required" }, { status: 400 });
  if (!/^\d{17}$/.test(steamid))
    return NextResponse.json({ error: "Invalid SteamID64" }, { status: 400 });
  if (!key)
    return NextResponse.json({ error: "STEAM_WEB_API_KEY is not configured" }, { status: 503 });

  const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/");
  url.searchParams.set("key", key);
  url.searchParams.set("steamids", steamid);

  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) return NextResponse.json({ error: "Steam lookup failed" }, { status: 502 });

  const data = await response.json();
  const player = data?.response?.players?.[0];
  if (!player) return NextResponse.json({ error: "Steam profile not found" }, { status: 404 });

  return NextResponse.json({
    steamId: player.steamid,
    steamName: player.personaname,
    profileUrl: player.profileurl,
    avatar: player.avatarfull ?? player.avatarmedium ?? player.avatar,
  });
}
