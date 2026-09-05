import { NextRequest, NextResponse } from "next/server";
import { refreshAllFaceitRanks } from "@/lib/faceit-sync";

export async function POST(request: NextRequest) {
  const minAgeMs = Number(request.nextUrl.searchParams.get("minAgeMs")) || undefined;
  const results = await refreshAllFaceitRanks(minAgeMs);
  return NextResponse.json({ results });
}
