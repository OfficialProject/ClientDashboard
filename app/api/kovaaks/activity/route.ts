import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getClient, updateClient } from "@/lib/store";
import { getRecentActivity } from "@/lib/kovaaks";
import { resolveKovaaksUsername } from "@/lib/kovaaks-identity";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const supabase = await getServerSupabase();
  const client = await getClient(supabase, clientId);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  let username = client.kovaaksUsername;
  if (username === null) {
    username = (await resolveKovaaksUsername(client.steamId, client.steamName)) ?? "";
    await updateClient(supabase, clientId, { kovaaksUsername: username });
  }
  if (!username) {
    return NextResponse.json(
      {
        error:
          "This client hasn't set a username on their kovaaks.com profile, so activity history isn't available for them - this is a real platform limitation, not a bug. Their benchmark scores and trends still work fine.",
      },
      { status: 404 }
    );
  }

  try {
    const activity = await getRecentActivity(username);
    return NextResponse.json({ activity, kovaaksUsername: username });
  } catch (err) {
    const freshUsername = (await resolveKovaaksUsername(client.steamId, client.steamName)) ?? "";
    await updateClient(supabase, clientId, { kovaaksUsername: freshUsername });

    if (!freshUsername) {
      return NextResponse.json(
        {
          error:
            "This client hasn't set a username on their kovaaks.com profile, so activity history isn't available for them - this is a real platform limitation, not a bug. Their benchmark scores and trends still work fine.",
        },
        { status: 404 }
      );
    }
    if (freshUsername !== username) {
      try {
        const activity = await getRecentActivity(freshUsername);
        return NextResponse.json({ activity, kovaaksUsername: freshUsername });
      } catch (retryErr) {
        return NextResponse.json(
          { error: retryErr instanceof Error ? retryErr.message : "Activity fetch failed" },
          { status: 502 }
        );
      }
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Activity fetch failed" },
      { status: 502 }
    );
  }
}
