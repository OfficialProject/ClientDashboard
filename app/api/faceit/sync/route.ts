import { NextRequest, NextResponse } from "next/server";
import { refreshFaceitRank } from "@/lib/faceit-sync";

export async function POST(request: NextRequest) {
  const { clientId } = await request.json();
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  try {
    const client = await refreshFaceitRank(clientId);
    return NextResponse.json({ client });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "FACEIT sync failed" },
      { status: 502 }
    );
  }
}
