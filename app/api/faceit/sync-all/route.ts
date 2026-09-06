import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { refreshAllFaceitRanks } from "@/lib/faceit-sync";

export async function POST(request: NextRequest) {
  const minAgeMs = Number(request.nextUrl.searchParams.get("minAgeMs")) || undefined;
  const supabase = await getServerSupabase();
  const results = await refreshAllFaceitRanks(supabase, minAgeMs);
  return NextResponse.json({ results });
}
