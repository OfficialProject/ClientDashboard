import { NextRequest, NextResponse } from "next/server";
import { listClients, appendBenchmarkSnapshot } from "@/lib/store";
import { getBenchmark } from "@/lib/benchmarks";
import { syncBenchmarkProgress } from "@/lib/unified-progress";

const DEFAULT_MIN_AGE_MS = 2 * 60 * 1000; // don't re-sync a client synced more recently than this

export async function POST(request: NextRequest) {
  const minAgeMs = Number(request.nextUrl.searchParams.get("minAgeMs")) || DEFAULT_MIN_AGE_MS;
  const clients = await listClients();
  const now = Date.now();

  const results = await Promise.allSettled(
    clients
      .filter((c) => c.assignedBenchmarkId)
      .map(async (c) => {
        const benchmarkId = c.assignedBenchmarkId!;
        const history = c.benchmarkHistory[benchmarkId];
        const lastSynced = history?.at(-1)?.syncedAt;
        if (lastSynced && now - new Date(lastSynced).getTime() < minAgeMs) {
          return { clientId: c.id, skipped: true };
        }
        const def = await getBenchmark(benchmarkId);
        if (!def) return { clientId: c.id, error: "Unknown benchmark" };
        const progress = await syncBenchmarkProgress(def, c.steamId);
        await appendBenchmarkSnapshot(c.id, benchmarkId, progress);
        return { clientId: c.id, synced: true };
      })
  );

  const summary = results.map((r) => (r.status === "fulfilled" ? r.value : { error: r.reason?.message ?? "failed" }));
  return NextResponse.json({ results: summary });
}
