import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/store";
import { getBenchmark } from "@/lib/benchmarks";
import { getBenchmarkProgressDiagnostic, flattenScenarioScores } from "@/lib/kovaaks";

export async function POST(request: NextRequest) {
  const { clientId, benchmarkId } = await request.json();
  if (!clientId || !benchmarkId) {
    return NextResponse.json({ error: "clientId and benchmarkId are required" }, { status: 400 });
  }

  const [client, def] = await Promise.all([getClient(clientId), getBenchmark(benchmarkId)]);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!def) return NextResponse.json({ error: "Unknown benchmark" }, { status: 404 });
  if (!def.kovaaksBenchmarkId) return NextResponse.json({ error: "Benchmark has no KovaaK's ID" }, { status: 400 });

  const result = await getBenchmarkProgressDiagnostic(def.kovaaksBenchmarkId, client.steamId);
  const scores = result.json && typeof result.json === "object"
    ? flattenScenarioScores(result.json as Parameters<typeof flattenScenarioScores>[0])
    : {};

  return NextResponse.json({
    client: {
      id: client.id,
      nickname: client.nickname,
      steamId: client.steamId,
      steamName: client.steamName,
    },
    benchmark: {
      registryId: def.id,
      name: def.benchmarkName,
      difficulty: def.difficultyName,
      kovaaksBenchmarkId: def.kovaaksBenchmarkId,
    },
    request: result.url,
    response: {
      status: result.status,
      ok: result.ok,
      contentType: result.contentType,
      scenarioCount: Object.keys(scores).length,
      scenarios: scores,
      bodyPreview: result.bodyPreview,
    },
  });
}
