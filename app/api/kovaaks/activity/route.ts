import { NextRequest, NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/store";
import { getRecentActivity } from "@/lib/kovaaks";
import { resolveKovaaksUsername } from "@/lib/kovaaks-identity";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const client = await getClient(clientId);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  let username = client.kovaaksUsername;
  if (!username) {
    username = await resolveKovaaksUsername(client.steamId, client.steamName);
    if (!username) {
      return NextResponse.json(
        { error: "Couldn't match this client to a KovaaK's account - activity data unavailable." },
        { status: 404 }
      );
    }
    await updateClient(clientId, { kovaaksUsername: username });
  }

  try {
    const activity = await getRecentActivity(username);
    return NextResponse.json({ activity, kovaaksUsername: username });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Activity fetch failed" },
      { status: 502 }
    );
  }
}
