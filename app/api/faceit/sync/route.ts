import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { refreshFaceitRank } from "@/lib/faceit-sync";

export async function POST(request: NextRequest) {
  const { clientId } = await request.json();
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const supabase = await getServerSupabase();
  try {
    const client = await refreshFaceitRank(supabase, clientId);
    return NextResponse.json({ client });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "FACEIT sync failed" },
      { status: 502 }
    );
  }
}
