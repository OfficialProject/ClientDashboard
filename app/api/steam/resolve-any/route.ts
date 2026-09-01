import { NextRequest, NextResponse } from "next/server";
import { resolveToSteamId64 } from "@/lib/steam";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input")?.trim();
  if (!input) return NextResponse.json({ error: "input is required" }, { status: 400 });

  try {
    const steamId = await resolveToSteamId64(input);
    return NextResponse.json({ steamId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Resolve failed" },
      { status: 502 }
    );
  }
}
