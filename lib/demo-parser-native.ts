import Bunzip from "seek-bzip";
import { parseEvent } from "@laihoe/demoparser2";
import { extractMatchStats, type ParsedMatchStats } from "./demo-stats-extract";

export type { ParsedMatchStats };

/** Downloads and decompresses a resolved Premier demo URL - never written to disk, kept entirely in memory and discarded after parsing. */
export async function downloadAndDecompressDemo(demoUrl: string): Promise<Buffer> {
  const res = await fetch(demoUrl);
  if (!res.ok) throw new Error(`Demo download failed (${res.status})`);
  const compressed = Buffer.from(await res.arrayBuffer());
  return Bunzip.decode(compressed);
}

/** Tick-level stats only, same scope as the browser fallback parser - not the subtick-gated diagnosis layer. */
export function parseMatchStatsNative(demoBytes: Buffer): ParsedMatchStats {
  const deaths = parseEvent(demoBytes, "player_death", ["steamid"], ["total_rounds_played"]) as Record<string, unknown>[];
  const hurts = parseEvent(demoBytes, "player_hurt", ["steamid"], []) as Record<string, unknown>[];
  return extractMatchStats(deaths, hurts);
}
