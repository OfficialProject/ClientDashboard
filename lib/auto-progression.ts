import type { UnifiedBenchmarkProgress } from "./types";

/**
 * Picks the N lowest-scoring scenarios from the latest snapshot. This is a
 * cruder proxy than "weakest category first" would be - it's ranking raw
 * scenario scores directly rather than normalized category standing,
 * because scenario-to-category grouping data isn't reliably available for
 * every benchmark path (only the decoded Viscose/Voltaic formulas carry
 * it, and Viscose currently runs on KovaaK's native rank, not the decoded
 * grouping). Worth revisiting if/when that grouping data is wired back in.
 */
export function buildAutoProgression(latest: UnifiedBenchmarkProgress, count = 6): string[] {
  return Object.entries(latest.scenarioScores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, count)
    .map(([name]) => name);
}
