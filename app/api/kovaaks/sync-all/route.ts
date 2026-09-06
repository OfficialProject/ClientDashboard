import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { syncAllKovaaksProgress } from "@/lib/kovaaks-sync";

export async function POST(request: NextRequest) {
  const minAgeMs = Number(request.nextUrl.searchParams.get("minAgeMs")) || undefined;
  const supabase = await getServerSupabase();
  const results = await syncAllKovaaksProgress(supabase, minAgeMs);
  return NextResponse.json({ results });
}
