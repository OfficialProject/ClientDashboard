import { listClients, appendBenchmarkSnapshot } from "./store";
import { getBenchmark } from "./benchmarks";
import { syncBenchmarkProgress } from "./unified-progress";

const DEFAULT_MIN_AGE_MS = 2 * 60 * 1000;

export interface KovaaksSyncAllResult {
  clientId: string;
  synced?: boolean;
  skipped?: boolean;
  error?: string;
}

export async function syncAllKovaaksProgress(minAgeMs = DEFAULT_MIN_AGE_MS): Promise<KovaaksSyncAllResult[]> {
  const clients = await listClients();
  const now = Date.now();

  const results = await Promise.allSettled(
    clients
      .filter((c) => c.assignedBenchmarkId)
      .map(async (c): Promise<KovaaksSyncAllResult> => {
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

  return results.map((r) => (r.status === "fulfilled" ? r.value : { clientId: "unknown", error: r.reason?.message ?? "failed" }));
}
