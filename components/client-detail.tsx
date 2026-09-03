"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/types";
import type { BenchmarkDef } from "@/lib/benchmarks";
import type { RecentActivityEntry } from "@/lib/kovaaks";
import SkillBreakdown from "@/components/skill-breakdown";
import SkillSummary from "@/components/skill-summary";
import RecentActivity from "@/components/recent-activity";
import RosterComparison from "@/components/roster-comparison";
import InsightSummary from "@/components/insight-summary";
import SkillRadar from "@/components/skill-radar";
import RankTrendChart from "@/components/rank-trend-chart";
import ScenarioBrowser from "@/components/scenario-browser";
import RosterTrendChart from "@/components/roster-trend-chart";
import SessionStatChart from "@/components/session-stat-chart";
import GoalsPanel from "@/components/goals-panel";
import RoutinesPanel from "@/components/routines-panel";
import PersonalBestBanner from "@/components/personal-best-banner";

export default function ClientDetail({ client }: { client: Client }) {
  const router = useRouter();
  const [premierRating, setPremierRating] = useState(client.premierRating ?? "");
  const [faceitLevel, setFaceitLevel] = useState(client.faceitLevel ?? "");
  const [faceitElo, setFaceitElo] = useState(client.faceitElo ?? "");
  const [savingRanks, setSavingRanks] = useState(false);
  const [faceitSyncing, setFaceitSyncing] = useState(false);
  const [faceitError, setFaceitError] = useState("");

  const [benchmarks, setBenchmarks] = useState<BenchmarkDef[]>([]);
  const [assignedBenchmarkId, setAssignedBenchmarkId] = useState(client.assignedBenchmarkId ?? "");
  const [savingBenchmark, setSavingBenchmark] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);

  const [activityEntries, setActivityEntries] = useState<RecentActivityEntry[] | null>(null);
  const [activityReconstructed, setActivityReconstructed] = useState(false);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");

  const [rosterAverages, setRosterAverages] = useState<
    { subcategory: string; category: string; averageScore: number }[]
  >([]);
  const [rosterClientCount, setRosterClientCount] = useState(0);

  useEffect(() => {
    setActivityLoading(true);
    setActivityError("");
    fetch(`/api/kovaaks/activity?clientId=${client.id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load activity");
        setActivityEntries(data.activity);
        setActivityReconstructed(false);
      })
      .catch(() =>
        fetch(`/api/kovaaks/scenario-history?clientId=${client.id}`).then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Failed to load activity");
          setActivityEntries(data.activity);
          setActivityReconstructed(true);
        })
      )
      .catch((err) => setActivityError(err.message))
      .finally(() => setActivityLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  useEffect(() => {
    fetch("/api/benchmarks")
      .then((r) => r.json())
      .then((d) => setBenchmarks(d.benchmarks ?? []));
  }, []);

  useEffect(() => {
    if (!assignedBenchmarkId) {
      setRosterAverages([]);
      return;
    }
    fetch(`/api/clients/roster-stats?benchmarkId=${assignedBenchmarkId}&excludeClientId=${client.id}`)
      .then((r) => r.json())
      .then((d) => {
        setRosterAverages(d.averages ?? []);
        setRosterClientCount(d.clientCount ?? 0);
      })
      .catch(() => setRosterAverages([]));
  }, [assignedBenchmarkId, client.id]);

  // Live auto-refresh while this page is open - only while open, not a true
  // background job (that needs always-on hosting + a real database, not
  // done yet). Polls every 5 minutes, only when a benchmark is assigned.
  useEffect(() => {
    if (!assignedBenchmarkId) return;
    const interval = setInterval(() => {
      syncBenchmark(assignedBenchmarkId);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedBenchmarkId]);

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

  async function syncFaceit() {
    setFaceitSyncing(true);
    setFaceitError("");
    const res = await fetch("/api/faceit/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id }),
    });
    setFaceitSyncing(false);
    if (!res.ok) {
      const data = await res.json();
      setFaceitError(data.error ?? "FACEIT sync failed.");
      return;
    }
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
    if (id) await syncBenchmark(id); // assigning a benchmark immediately pulls its first snapshot
    router.refresh();
  }

  async function syncBenchmark(benchmarkId?: string) {
    const targetId = benchmarkId ?? assignedBenchmarkId;
    if (!targetId) return;
    setSyncing(true);
    setSyncError("");
    const res = await fetch("/api/kovaaks/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, benchmarkId: targetId }),
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
        <div className="rank-row" style={{ marginTop: 12, gap: 8 }}>
          <button className="sync-button" onClick={saveRanks} disabled={savingRanks}>
            {savingRanks ? "Saving..." : "Save ranks"}
          </button>
          <button className="sync-button" onClick={syncFaceit} disabled={faceitSyncing}>
            {faceitSyncing ? "Syncing FACEIT..." : "Sync FACEIT"}
          </button>
        </div>
        {faceitError && (
          <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{faceitError}</div>
        )}
        <div style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 8 }}>
          Premier rank has no auto-pull path - it requires a persistent Steam bot connected to
          CS2's Game Coordinator (real infrastructure, not a simple API call), not built here.
          Stays manual entry.
        </div>
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
            {progress && history ? (
              <>
                <div className="rank-row" style={{ margin: "14px 0 12px" }}>
                  <span className="rank-chip viscose">{progress.overallRankName}</span>
                  <span style={{ color: "var(--text-dim)", fontSize: 12, alignSelf: "center" }}>
                    synced {new Date(progress.syncedAt).toLocaleString()}
                    {history.length > 1 ? ` · ${history.length} syncs on record` : ""}
                  </span>
                </div>
                <InsightSummary history={history} />
                <PersonalBestBanner history={history} />
                <SkillSummary history={history} lastRealActivity={activityEntries?.[0]?.timestamp ?? null} />
                <button
                  className="sort-toggle"
                  style={{ marginTop: 14, marginBottom: showFullBreakdown ? 10 : 0 }}
                  onClick={() => setShowFullBreakdown(!showFullBreakdown)}
                >
                  {showFullBreakdown ? "Hide full breakdown" : "See full breakdown"}
                </button>
                {showFullBreakdown && <SkillBreakdown latest={progress} previous={previousProgress} />}
              </>
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 13, margin: "12px 0" }}>
                Not synced yet.
              </div>
            )}
            <button
              className="sync-button"
              style={{ marginTop: 12 }}
              onClick={() => syncBenchmark()}
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

      {assignedBenchmarkId && progress && history && (
        <>
          <div className="panel">
            <h2>Goals</h2>
            <GoalsPanel client={client} progress={progress} benchmarkId={assignedBenchmarkId} />
          </div>

          <div className="panel">
            <h2>Routines</h2>
            <RoutinesPanel
              client={client}
              progress={progress}
              benchmarkId={assignedBenchmarkId}
              activityEntries={activityEntries}
            />
          </div>

          <div className="panel">
            <h2>Skill Radar</h2>
            <SkillRadar history={history} />
          </div>

          <div className="panel">
            <h2>Rank Trend</h2>
            <RankTrendChart history={history} />
          </div>

          <div className="panel">
            <h2>Scenario Browser</h2>
            <ScenarioBrowser history={history} />
          </div>

          <div className="panel">
            <h2>Roster Comparison</h2>
            <RosterComparison progress={progress} averages={rosterAverages} clientCount={rosterClientCount} />
            {rosterClientCount > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>Trend vs. roster</div>
                <RosterTrendChart benchmarkId={assignedBenchmarkId} currentClientId={client.id} />
              </div>
            )}
          </div>
        </>
      )}

      <div className="panel">
        <h2>Recent Activity</h2>
        <RecentActivity
          loading={activityLoading}
          error={activityError}
          entries={activityEntries}
          reconstructed={activityReconstructed}
        />
        {activityEntries && activityEntries.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>Session stats</div>
            <SessionStatChart entries={activityEntries} />
          </div>
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
