import Bunzip from "seek-bzip";
import { parseEvent, parseHeader } from "@laihoe/demoparser2";
import { extractMatchStats, type ParsedMatchStats } from "./demo-stats-extract";

export type { ParsedMatchStats };

/** Downloads and decompresses a resolved Premier demo URL - never written to disk, kept entirely in memory and discarded after parsing. */
export async function downloadAndDecompressDemo(demoUrl: string): Promise<Buffer> {
  const res = await fetch(demoUrl);
  if (!res.ok) throw new Error(`Demo download failed (${res.status})`);
  const compressed = Buffer.from(await res.arrayBuffer());
  return Bunzip.decode(compressed);
}

/**
 * Reads the map name straight from the demo file's own header instead of
 * trusting the GC's match object - `watchablematchinfo` (what
 * lib/steam-gc-bot.ts falls back to) is meant for currently-live
 * spectatable matches, not historical/completed ones, so it's frequently
 * empty for exactly the matches this pipeline deals with. `map_name` is
 * the standard field name across every Source-engine demo header parser
 * (confirmed against the underlying header struct shape, which
 * demoparser2 parses the same binary format for), so this should be far
 * more reliable than the GC-side guess it replaces.
 */
export function extractMapName(demoBytes: Buffer): string | null {
  const header = parseHeader(demoBytes) as Record<string, unknown>;
  const map = header["map_name"] ?? header["mapName"] ?? header["map"];
  return typeof map === "string" && map.length > 0 ? map : null;
}

/** Tick-level stats only, same scope as the browser fallback parser - not the subtick-gated diagnosis layer. */
export function parseMatchStatsNative(demoBytes: Buffer): ParsedMatchStats {
  const deaths = parseEvent(demoBytes, "player_death", ["steamid"], ["total_rounds_played"]) as Record<string, unknown>[];
  const hurts = parseEvent(demoBytes, "player_hurt", ["steamid"], []) as Record<string, unknown>[];
  return extractMatchStats(deaths, hurts);
}
