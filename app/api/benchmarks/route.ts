import { NextResponse } from "next/server";
import { listBenchmarks } from "@/lib/benchmarks";

export async function GET() {
  const benchmarks = await listBenchmarks();
  return NextResponse.json({ benchmarks });
}
