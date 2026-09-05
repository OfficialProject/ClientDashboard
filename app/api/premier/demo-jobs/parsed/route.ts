import { NextRequest, NextResponse } from "next/server";
import { saveParsedStats } from "@/lib/premier-jobs-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { jobId, parsedStats, map } = body ?? {};
  if (!jobId || !parsedStats) return NextResponse.json({ error: "jobId and parsedStats are required" }, { status: 400 });

  const job = await saveParsedStats(jobId, parsedStats, map ?? null);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job });
}
