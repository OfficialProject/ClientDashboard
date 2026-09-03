import { NextRequest, NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/store";
import { getFaceitPlayerBySteamId } from "@/lib/faceit";

export async function POST(request: NextRequest) {
  const { clientId } = await request.json();
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const client = await getClient(clientId);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  try {
    const player = await getFaceitPlayerBySteamId(client.steamId);
    if (!player) {
      return NextResponse.json(
        { error: "No FACEIT account found linked to this client's Steam ID." },
        { status: 404 }
      );
    }
    const cs2 = player.games?.cs2;
    const updated = await updateClient(clientId, {
      faceitLevel: cs2?.skill_level ?? null,
      faceitElo: cs2?.faceit_elo ?? null,
    });
    return NextResponse.json({ client: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "FACEIT sync failed" },
      { status: 502 }
    );
  }
}
