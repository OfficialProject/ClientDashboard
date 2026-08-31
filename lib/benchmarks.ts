import { promises as fs } from "fs";
import path from "path";
import type { Difficulty } from "./types";
import type { VoltaicDifficulty } from "./voltaic";

export type CustomFormula = "viscose" | "voltaic" | null;

export interface BenchmarkDef {
  id: string; // slug, e.g. "viscose-s2-easier"
  benchmarkName: string;
  difficultyName: string;
  kovaaksBenchmarkId: number | null; // null until looked up
  customFormula: CustomFormula; // which decoded formula to use, if any; null uses KovaaK's native computed rank
  viscoseDifficultyKey: Difficulty | null; // lib/viscose-data.json key, when customFormula is "viscose"
  voltaicDifficultyKey: VoltaicDifficulty | null; // lib/voltaic-data.json key, when customFormula is "voltaic"
}

const REGISTRY_FILE = path.join(process.cwd(), "data", "benchmarks.json");

export async function listBenchmarks(): Promise<BenchmarkDef[]> {
  const raw = await fs.readFile(REGISTRY_FILE, "utf-8");
  return JSON.parse(raw);
}

export async function getBenchmark(id: string): Promise<BenchmarkDef | null> {
  const all = await listBenchmarks();
  return all.find((b) => b.id === id) ?? null;
}
