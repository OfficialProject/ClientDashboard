import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/store";
import { getFaceitPlayerBySteamId, getMatchPlayerStats } from "@/lib/faceit";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!clientId || !matchId) return NextResponse.json({ error: "clientId and matchId are required" }, { status: 400 });

  const client = await getClient(clientId);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  try {
    const player = await getFaceitPlayerBySteamId(client.steamId);
    if (!player) return NextResponse.json({ error: "No FACEIT account linked to this client's Steam ID." }, { status: 404 });

    const stats = await getMatchPlayerStats(matchId, player.player_id);
    if (!stats) return NextResponse.json({ error: "Could not find this player's stats in that match." }, { status: 404 });
    return NextResponse.json({ stats });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to fetch match stats" }, { status: 502 });
  }
}
