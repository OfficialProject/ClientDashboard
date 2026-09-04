import { NextRequest, NextResponse } from "next/server";
import { listJobs } from "@/lib/premier-jobs-store";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  const jobs = await listJobs();
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "resolved" || !job.demoUrl) {
    return NextResponse.json({ error: "This job hasn't resolved to a demo URL yet." }, { status: 409 });
  }

  const upstream = await fetch(job.demoUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Upstream demo download failed (${upstream.status})` }, { status: 502 });
  }

  // Pass the stream straight through - never buffered to disk here.
  return new NextResponse(upstream.body, {
    headers: { "Content-Type": "application/octet-stream" },
  });
}
