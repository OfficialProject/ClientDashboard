"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/types";
import type { BenchmarkDef } from "@/lib/benchmarks";
import SkillBreakdown from "@/components/skill-breakdown";

export default function ClientDetail({ client }: { client: Client }) {
  const router = useRouter();
  const [premierRating, setPremierRating] = useState(client.premierRating ?? "");
  const [faceitLevel, setFaceitLevel] = useState(client.faceitLevel ?? "");
  const [faceitElo, setFaceitElo] = useState(client.faceitElo ?? "");
  const [savingRanks, setSavingRanks] = useState(false);

  const [benchmarks, setBenchmarks] = useState<BenchmarkDef[]>([]);
  const [assignedBenchmarkId, setAssignedBenchmarkId] = useState(client.assignedBenchmarkId ?? "");
  const [savingBenchmark, setSavingBenchmark] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetch("/api/benchmarks")
      .then((r) => r.json())
      .then((d) => setBenchmarks(d.benchmarks ?? []));
  }, []);

  async function saveRanks() {
    setSavingRanks(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        premierRating: premierRating === "" ? null : Number(premierRating),
        faceitLevel: faceitLevel === "" ? null : Number(faceitLevel),
        faceitElo: faceitElo === "" ? null : Number(faceitElo),
      }),
    });
    setSavingRanks(false);
    router.refresh();
  }

  async function saveBenchmarkAssignment(id: string) {
    setAssignedBenchmarkId(id);
    setSavingBenchmark(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedBenchmarkId: id || null }),
    });
    setSavingBenchmark(false);
    router.refresh();
  }

  async function syncBenchmark() {
    if (!assignedBenchmarkId) return;
    setSyncing(true);
    setSyncError("");
    const res = await fetch("/api/kovaaks/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, benchmarkId: assignedBenchmarkId }),
    });
    setSyncing(false);
    if (!res.ok) {
      const data = await res.json();
      setSyncError(data.error ?? "Sync failed.");
      return;
    }
    router.refresh();
  }

  async function saveNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteText.trim() }),
    });
    setSavingNote(false);
    setNoteText("");
    router.refresh();
  }

  const history = assignedBenchmarkId ? client.benchmarkHistory[assignedBenchmarkId] : undefined;
  const progress = history?.at(-1);
  const previousProgress = history && history.length > 1 ? history[history.length - 2] : undefined;

  return (
    <>
      <div className="client-header">
        <img src={client.avatar} alt="" />
        <div>
          <h1>{client.nickname}</h1>
          <div className="steamname">{client.steamName}</div>
          <div className="rank-row" style={{ marginTop: 6 }}>
            {client.premierRating !== null && (
              <span className="rank-chip premier">Premier {client.premierRating}</span>
            )}
            {client.faceitLevel !== null && (
              <span className="rank-chip faceit">
                FACEIT {client.faceitLevel}
                {client.faceitElo !== null ? ` · ${client.faceitElo}` : ""}
              </span>
            )}
            {progress && <span className="rank-chip viscose">{progress.overallRankName}</span>}
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>CS2 Ranks</h2>
        <div className="rank-inputs">
          <label>
            Premier rating
            <input
              type="number"
              value={premierRating}
              onChange={(e) => setPremierRating(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
          <label>
            FACEIT level
            <input
              type="number"
              min={1}
              max={10}
              value={faceitLevel}
              onChange={(e) => setFaceitLevel(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
          <label>
            FACEIT elo
            <input
              type="number"
              value={faceitElo}
              onChange={(e) => setFaceitElo(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
        </div>
        <button
          className="sync-button"
          style={{ marginTop: 12 }}
          onClick={saveRanks}
          disabled={savingRanks}
        >
          {savingRanks ? "Saving..." : "Save ranks"}
        </button>
      </div>

      <div className="panel">
        <h2>Aim Benchmark</h2>
        <div className="rank-inputs">
          <label style={{ minWidth: 220 }}>
            Assigned benchmark
            <select
              value={assignedBenchmarkId}
              onChange={(e) => saveBenchmarkAssignment(e.target.value)}
              disabled={savingBenchmark}
              style={{
                background: "var(--panel-alt)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: 8,
                padding: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 13,
              }}
            >
              <option value="">— not assigned —</option>
              {benchmarks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.benchmarkName} — {b.difficultyName}
                </option>
              ))}
            </select>
          </label>
        </div>

        {assignedBenchmarkId && (
          <>
            {progress ? (
              <>
                <div className="rank-row" style={{ margin: "14px 0 12px" }}>
                  <span className="rank-chip viscose">{progress.overallRankName}</span>
                  <span style={{ color: "var(--text-dim)", fontSize: 12, alignSelf: "center" }}>
                    synced {new Date(progress.syncedAt).toLocaleString()}
                    {history && history.length > 1 ? ` · ${history.length} syncs on record` : ""}
                  </span>
                </div>
                <SkillBreakdown latest={progress} previous={previousProgress} />
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, margin: "12px 0" }}>
                Not synced yet.
              </div>
            )}
            <button
              className="sync-button"
              style={{ marginTop: 12 }}
              onClick={syncBenchmark}
              disabled={syncing}
            >
              {syncing ? "Syncing from KovaaK's..." : "Sync from KovaaK's"}
            </button>
            {syncError && (
              <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{syncError}</div>
            )}
          </>
        )}
      </div>

      <div className="panel">
        <h2>Coaching Notes</h2>
        <div className="notes-list">
          {client.notes.length === 0 && (
            <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No notes yet.</div>
          )}
          {client.notes.map((n) => (
            <div className="note-item" key={n.id}>
              <div className="date">{new Date(n.date).toLocaleString()}</div>
              <div className="text">{n.text}</div>
            </div>
          ))}
        </div>
        <div className="note-form">
          <textarea
            placeholder="What to work on next session..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <button className="primary" onClick={saveNote} disabled={savingNote}>
            Add
          </button>
        </div>
      </div>
    </>
  );
}
