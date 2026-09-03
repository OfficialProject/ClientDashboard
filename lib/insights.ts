import type { SkillRow } from "./skill-rows";

/**
 * Turns the same numbers already shown in the strengths/weaknesses list into
 * a couple of plain sentences. Template-based, not a recommendation - it
 * narrates what the data says, it doesn't suggest what to do about it. The
 * "what to do about it" layer is the deferred, subtick-data-gated feature.
 */
export function buildInsightSummary(rows: SkillRow[]): string[] {
  if (rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) => a.score - b.score);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  const lines: string[] = [];

  if (weakest.trend === null) {
    lines.push(`Weakest category is ${weakest.label} (${weakest.rankName}) - no prior sync to compare against yet.`);
  } else if (weakest.trend > 0) {
    lines.push(
      `Weakest category is ${weakest.label} (${weakest.rankName}), but it's trending up (+${Math.round(
        weakest.trend
      )} since last sync).`
    );
  } else if (weakest.trend < 0) {
    lines.push(
      `Weakest category is ${weakest.label} (${weakest.rankName}) and it's slipping (${Math.round(
        weakest.trend
      )} since last sync).`
    );
  } else {
    lines.push(`Weakest category is ${weakest.label} (${weakest.rankName}), unchanged since last sync.`);
  }

  if (strongest.label !== weakest.label) {
    lines.push(`Strongest category is ${strongest.label} (${strongest.rankName}).`);
  }

  const improving = rows.filter((r) => r.trend !== null && r.trend > 0).length;
  const declining = rows.filter((r) => r.trend !== null && r.trend < 0).length;
  if (improving + declining > 0) {
    lines.push(`${improving} categor${improving === 1 ? "y is" : "ies are"} trending up, ${declining} trending down since the last sync.`);
  }

  return lines;
}
