"use client";
import type { UnifiedBenchmarkProgress } from "@/lib/types";
import { computeSkillRows, computeCategoryAverages } from "@/lib/skill-rows";
import { RadarChart } from "./charts";

export default function SkillRadar({ history }: { history: UnifiedBenchmarkProgress[] }) {
  const rows = computeSkillRows(history);
  const axes = computeCategoryAverages(rows).map((c) => ({ label: c.category, value: c.score }));
  return <RadarChart axes={axes} />;
}
