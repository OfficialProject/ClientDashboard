import { NextRequest, NextResponse } from "next/server";
import { listClients } from "@/lib/store";

export async function GET(request: NextRequest) {
  const benchmarkId = request.nextUrl.searchParams.get("benchmarkId");
  if (!benchmarkId) return NextResponse.json({ error: "benchmarkId is required" }, { status: 400 });

  const clients = await listClients();
  const relevant = clients.filter((c) => c.benchmarkHistory[benchmarkId]?.length);

  const series = relevant.map((c) => {
    const history = c.benchmarkHistory[benchmarkId];
    const points = history.map((snap) => ({
      x: new Date(snap.syncedAt).getTime(),
      y: snap.groups.length ? snap.groups.reduce((sum, g) => sum + g.score, 0) / snap.groups.length : 0,
    }));
    return { clientId: c.id, nickname: c.nickname, points };
  });

  return NextResponse.json({ series });
}
