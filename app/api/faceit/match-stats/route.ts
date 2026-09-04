import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/store";
import { getFaceitPlayerBySteamId, getFaceitLifetimeStats, getFaceitRecentMatches } from "@/lib/faceit";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const client = await getClient(clientId);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  try {
    const player = await getFaceitPlayerBySteamId(client.steamId);
    if (!player) {
      return NextResponse.json({ error: "No FACEIT account found linked to this client's Steam ID." }, { status: 404 });
    }
    const [lifetime, recentMatches] = await Promise.all([
      getFaceitLifetimeStats(player.player_id),
      getFaceitRecentMatches(player.player_id, 10).catch(() => []), // history endpoint failing shouldn't take down lifetime stats
    ]);
    return NextResponse.json({ lifetime, recentMatches });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "FACEIT match stats fetch failed" }, { status: 502 });
  }
}
