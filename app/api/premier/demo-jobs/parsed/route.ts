import { NextRequest, NextResponse } from "next/server";
import { saveParsedStats } from "@/lib/premier-jobs-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { jobId, parsedStats } = body ?? {};
  if (!jobId || !parsedStats) return NextResponse.json({ error: "jobId and parsedStats are required" }, { status: 400 });

  const job = await saveParsedStats(jobId, parsedStats);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job });
}
