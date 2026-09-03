"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Client, UnifiedBenchmarkProgress } from "@/lib/types";
import type { RecentActivityEntry } from "@/lib/kovaaks";
import { computeRoutineProgress } from "@/lib/routine-progress";
import { buildAutoProgression } from "@/lib/auto-progression";

export default function RoutinesPanel({
  client,
  progress,
  benchmarkId,
  activityEntries,
}: {
  client: Client;
  progress: UnifiedBenchmarkProgress;
  benchmarkId: string;
  activityEntries: RecentActivityEntry[] | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  const routines = client.routines.filter((r) => r.benchmarkId === benchmarkId);
  const scenarioNames = Object.keys(progress.scenarioScores).sort();

  async function createRoutine(scenarios: string[], routineName: string, source: "manual" | "auto-progression") {
    if (scenarios.length === 0 || !routineName.trim()) return;
    setSaving(true);
    await fetch(`/api/clients/${client.id}/routines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: routineName.trim(), benchmarkId, scenarios, source }),
    });
    setSaving(false);
    setName("");
    setSelectedScenarios([]);
    setShowBuilder(false);
    router.refresh();
  }

  async function removeRoutine(routineId: string) {
    await fetch(`/api/clients/${client.id}/routines`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routineId }),
    });
    router.refresh();
  }

  function toggleScenario(s: string) {
    setSelectedScenarios((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  return (
    <div>
      {routines.length === 0 && (
        <div style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 10 }}>No routines yet.</div>
      )}
      {routines.map((r) => {
        const statuses = computeRoutineProgress(r, activityEntries);
        const done = statuses.filter((s) => s.practiced).length;
        return (
          <div key={r.id} style={{ marginBottom: 14, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {r.name}{" "}
                {r.source === "auto-progression" && (
                  <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 400 }}>(auto)</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  {done}/{statuses.length} practiced
                </span>
                <button
                  onClick={() => removeRoutine(r.id)}
                  style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {statuses.map((s) => (
                <span
                  key={s.scenario}
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    color: s.practiced ? "var(--accent)" : "var(--text-dim)",
                    background: s.practiced ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                  }}
                >
                  {s.practiced ? "✓ " : ""}
                  {s.scenario}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button
          className="sync-button"
          disabled={saving}
          onClick={() => createRoutine(buildAutoProgression(progress), `Auto progression ${new Date().toLocaleDateString()}`, "auto-progression")}
        >
          {saving ? "Building..." : "Auto-generate from lowest scores"}
        </button>
        <button className="sort-toggle" onClick={() => setShowBuilder(!showBuilder)}>
          {showBuilder ? "Cancel" : "Build manual routine"}
        </button>
      </div>

      {showBuilder && (
        <div style={{ marginTop: 12 }}>
          <input
            placeholder="Routine name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: 8, fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}
          />
          <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 8 }}>
            {scenarioNames.map((s) => (
              <label key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "3px 0", cursor: "pointer" }}>
                <input type="checkbox" checked={selectedScenarios.includes(s)} onChange={() => toggleScenario(s)} />
                {s}
              </label>
            ))}
          </div>
          <button
            className="sync-button"
            disabled={saving || selectedScenarios.length === 0 || !name.trim()}
            onClick={() => createRoutine(selectedScenarios, name, "manual")}
          >
            {saving ? "Saving..." : `Save routine (${selectedScenarios.length} scenarios)`}
          </button>
        </div>
      )}
    </div>
  );
}
