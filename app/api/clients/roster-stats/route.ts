import { NextRequest, NextResponse } from "next/server";
import { listClients } from "@/lib/store";

export async function GET(request: NextRequest) {
  const benchmarkId = request.nextUrl.searchParams.get("benchmarkId");
  const excludeClientId = request.nextUrl.searchParams.get("excludeClientId");
  if (!benchmarkId) return NextResponse.json({ error: "benchmarkId is required" }, { status: 400 });

  const clients = await listClients();
  const relevant = clients.filter(
    (c) => c.id !== excludeClientId && c.benchmarkHistory[benchmarkId]?.length
  );

  // category -> running sum/count, to average across every client's latest snapshot
  const totals: Record<string, { sum: number; count: number }> = {};
  for (const c of relevant) {
    const latest = c.benchmarkHistory[benchmarkId].at(-1)!;
    for (const g of latest.groups) {
      const key = `${g.subcategory}::${g.category}`;
      if (!totals[key]) totals[key] = { sum: 0, count: 0 };
      totals[key].sum += g.score;
      totals[key].count += 1;
    }
  }

  const averages = Object.entries(totals).map(([key, { sum, count }]) => {
    const [subcategory, category] = key.split("::");
    return { subcategory, category, averageScore: sum / count };
  });

  return NextResponse.json({ averages, clientCount: relevant.length });
}
