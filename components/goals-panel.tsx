"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Client, UnifiedBenchmarkProgress } from "@/lib/types";

export default function GoalsPanel({
  client,
  progress,
  benchmarkId,
}: {
  client: Client;
  progress: UnifiedBenchmarkProgress;
  benchmarkId: string;
}) {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState(
    progress.groups[0] ? `${progress.groups[0].category}::${progress.groups[0].subcategory}` : ""
  );
  const [targetScore, setTargetScore] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const goals = client.goals.filter((g) => g.benchmarkId === benchmarkId);

  async function addGoal() {
    if (!selectedGroup || targetScore === "") return;
    const [category, subcategory] = selectedGroup.split("::");
    setSaving(true);
    await fetch(`/api/clients/${client.id}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ benchmarkId, category, subcategory, targetScore: Number(targetScore) }),
    });
    setSaving(false);
    setTargetScore("");
    router.refresh();
  }

  async function removeGoal(goalId: string) {
    await fetch(`/api/clients/${client.id}/goals`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId }),
    });
    router.refresh();
  }

  return (
    <div>
      {goals.length === 0 && (
        <div style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 10 }}>No goals set yet.</div>
      )}
      {goals.map((g) => {
        const current = progress.groups.find((p) => p.category === g.category && p.subcategory === g.subcategory)?.score ?? 0;
        const pct = Math.max(0, Math.min(100, (current / g.targetScore) * 100));
        const met = current >= g.targetScore;
        return (
          <div key={g.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span>
                {g.subcategory} · {g.category}
              </span>
              <span style={{ color: "var(--text-dim)" }}>
                {Math.round(current)} / {Math.round(g.targetScore)}
                {met ? " ✓" : ""}{" "}
                <button
                  onClick={() => removeGoal(g.id)}
                  style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 0, marginLeft: 6 }}
                >
                  ✕
                </button>
              </span>
            </div>
            <div style={{ height: 6, background: "var(--panel-alt)", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: met ? "var(--accent)" : "var(--faceit, #f59e0b)",
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: 8, fontSize: 12, flex: 1, minWidth: 140 }}
        >
          {progress.groups.map((g) => (
            <option key={`${g.category}::${g.subcategory}`} value={`${g.category}::${g.subcategory}`}>
              {g.subcategory} · {g.category}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Target score"
          value={targetScore}
          onChange={(e) => setTargetScore(e.target.value === "" ? "" : Number(e.target.value))}
          style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: 8, fontSize: 12, width: 110 }}
        />
        <button className="sync-button" onClick={addGoal} disabled={saving || targetScore === ""}>
          {saving ? "Saving..." : "Set goal"}
        </button>
      </div>
    </div>
  );
}
