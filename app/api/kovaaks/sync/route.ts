import { NextRequest, NextResponse } from "next/server";
import { getClient, appendBenchmarkSnapshot } from "@/lib/store";
import { getBenchmark } from "@/lib/benchmarks";
import { syncBenchmarkProgress } from "@/lib/unified-progress";

export async function POST(request: NextRequest) {
  const { clientId, benchmarkId } = await request.json();
  if (!clientId || !benchmarkId) {
    return NextResponse.json({ error: "clientId and benchmarkId are required" }, { status: 400 });
  }

  const [client, def] = await Promise.all([getClient(clientId), getBenchmark(benchmarkId)]);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!def) return NextResponse.json({ error: "Unknown benchmark" }, { status: 404 });

  try {
    const progress = await syncBenchmarkProgress(def, client.steamId);
    const updated = await appendBenchmarkSnapshot(clientId, benchmarkId, progress);
    return NextResponse.json({ client: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 502 }
    );
  }
}
