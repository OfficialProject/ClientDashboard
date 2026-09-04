import { NextRequest, NextResponse } from "next/server";
import { enqueueJob, listJobs } from "@/lib/premier-jobs-store";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;
  const jobs = await listJobs(clientId);
  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clientId, shareCode } = body ?? {};
  if (!clientId || !shareCode) {
    return NextResponse.json({ error: "clientId and shareCode are required" }, { status: 400 });
  }
  // Loose sanity check, not a full validator - real share codes are CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx.
  if (!/^CSGO(-[\w]{5}){5}$/.test(shareCode.trim())) {
    return NextResponse.json({ error: "That doesn't look like a valid share code (expected CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx)." }, { status: 400 });
  }
  const job = await enqueueJob(clientId, shareCode.trim());
  return NextResponse.json({ job });
}
