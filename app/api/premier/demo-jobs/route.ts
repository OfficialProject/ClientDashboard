import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { enqueueJob, listJobs } from "@/lib/premier-jobs-store";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;
  const supabase = await getServerSupabase();
  const jobs = await listJobs(supabase, clientId);
  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clientId, shareCode } = body ?? {};
  if (!clientId || !shareCode) {
    return NextResponse.json({ error: "clientId and shareCode are required" }, { status: 400 });
  }
  if (!/^CSGO(-[\w]{5}){5}$/.test(shareCode.trim())) {
    return NextResponse.json({ error: "That doesn't look like a valid share code (expected CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx)." }, { status: 400 });
  }
  const supabase = await getServerSupabase();
  const job = await enqueueJob(supabase, clientId, shareCode.trim());
  return NextResponse.json({ job });
}
