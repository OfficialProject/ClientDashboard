"use client";
import { useEffect, useState } from "react";
import { LineChart, type ChartSeries } from "./charts";

const COLORS = ["#5eead4", "#f472b6", "#fbbf24", "#818cf8", "#4ade80", "#fb7185", "#38bdf8"];

interface RosterSeriesResponse {
  series: { clientId: string; nickname: string; points: { x: number; y: number }[] }[];
}

export default function RosterTrendChart({
  benchmarkId,
  currentClientId,
}: {
  benchmarkId: string;
  currentClientId: string;
}) {
  const [data, setData] = useState<RosterSeriesResponse["series"]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/clients/roster-trend?benchmarkId=${benchmarkId}`)
      .then((r) => r.json())
      .then((d: RosterSeriesResponse) => setData(d.series ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [benchmarkId]);

  if (loading) return <div style={{ color: "var(--text-dim)", fontSize: 12 }}>Loading roster trend...</div>;
  if (data.length === 0) {
    return <div style={{ color: "var(--text-dim)", fontSize: 12 }}>No roster data yet for this benchmark.</div>;
  }

  const chartSeries: ChartSeries[] = data.map((s, i) => ({
    label: s.clientId === currentClientId ? `${s.nickname} (this client)` : s.nickname,
    color: s.clientId === currentClientId ? "var(--accent)" : COLORS[i % COLORS.length],
    points: s.points,
  }));

  return <LineChart series={chartSeries} />;
}
