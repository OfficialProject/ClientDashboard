import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getClient } from "@/lib/store";
import { getBenchmark } from "@/lib/benchmarks";
import { getBenchmarkProgress, getScenarioMeta, findLeaderboardEntry } from "@/lib/kovaaks";
import { resolveToSteamId64 } from "@/lib/steam";

const MAX_SCENARIOS = 12;

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const supabase = await getServerSupabase();
  const client = await getClient(supabase, clientId);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!client.assignedBenchmarkId) {
    return NextResponse.json({ error: "No benchmark assigned" }, { status: 400 });
  }

  const def = await getBenchmark(client.assignedBenchmarkId);
  if (!def || !def.kovaaksBenchmarkId) {
    return NextResponse.json({ error: "Benchmark not configured" }, { status: 404 });
  }

  const steamId = await resolveToSteamId64(client.steamId);

  const progress = await getBenchmarkProgress(def.kovaaksBenchmarkId, steamId);
  const meta = getScenarioMeta(progress);
  const scenarios = Object.entries(meta)
    .filter(([, m]) => m.score > 0)
    .slice(0, MAX_SCENARIOS);

  const results = await Promise.allSettled(
    scenarios.map(async ([name, m]) => {
      const entry = await findLeaderboardEntry(m.leaderboardId, steamId, m.rank);
      return { scenarioName: name, score: m.score, entry };
    })
  );

  const activity = results
    .filter((r): r is PromiseFulfilledResult<{ scenarioName: string; score: number; entry: Awaited<ReturnType<typeof findLeaderboardEntry>> }> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((r) => r.entry?.attributes?.epoch)
    .map((r) => ({
      scenarioName: r.scenarioName,
      score: r.score,
      timestamp: new Date(r.entry!.attributes!.epoch!).toISOString(),
      attributes: r.entry!.attributes,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    activity,
    reconstructed: true,
    checkedScenarios: scenarios.length,
    foundCount: activity.length,
  });
}
