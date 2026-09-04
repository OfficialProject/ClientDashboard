"use client";
import { useEffect, useState } from "react";
import LocalTime from "./local-time";

interface LifetimeStats {
  matches: number | null;
  winRatePct: number | null;
  avgKD: number | null;
  avgHeadshotPct: number | null;
  avgDamagePerRound: number | null;
  currentWinStreak: number | null;
  longestWinStreak: number | null;
}

interface RecentMatch {
  matchId: string;
  finishedAt: string | null;
  map: string | null;
  result: "win" | "loss" | "unknown";
}

interface MatchPlayerStats {
  map: string | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  adr: number | null;
  headshotPct: number | null;
  mvps: number | null;
  won: boolean | null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hero-stat">
      <div className="hero-label">{label}</div>
      <div className="hero-value" style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}

export default function MatchStatsPanel({ clientId }: { clientId: string }) {
  const [lifetime, setLifetime] = useState<LifetimeStats | null>(null);
  const [matches, setMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [matchStats, setMatchStats] = useState<Record<string, MatchPlayerStats | null>>({});
  const [matchStatsLoading, setMatchStatsLoading] = useState<string | null>(null);
  const [matchStatsError, setMatchStatsError] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/faceit/match-stats?clientId=${clientId}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error ?? "Failed to load match stats");
        setLifetime(body.lifetime);
        setMatches(body.recentMatches ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load match stats"))
      .finally(() => setLoading(false));
  }, [clientId]);

  async function toggleMatch(matchId: string) {
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
      return;
    }
    setExpandedMatchId(matchId);
    if (matchStats[matchId] !== undefined) return; // already fetched (or already known to have failed)

    setMatchStatsLoading(matchId);
    setMatchStatsError((prev) => ({ ...prev, [matchId]: "" }));
    try {
      const res = await fetch(`/api/faceit/match-player-stats?clientId=${clientId}&matchId=${matchId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to load per-map stats");
      setMatchStats((prev) => ({ ...prev, [matchId]: body.stats }));
    } catch (e) {
      setMatchStatsError((prev) => ({ ...prev, [matchId]: e instanceof Error ? e.message : "Failed to load per-map stats" }));
    } finally {
      setMatchStatsLoading(null);
    }
  }

  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 10 }}>
        Sourced from FACEIT's own computed lifetime stats - real data, but coarser than what subtick-engagement-analyzer
        will eventually replace this with (no per-round aim/utility/positioning/trade breakdown yet).
      </div>

      {loading && <div style={{ color: "var(--text-dim)", fontSize: 12 }}>Loading match stats...</div>}
      {error && <div style={{ color: "var(--danger, #f87171)", fontSize: 12 }}>{error}</div>}

      {lifetime && (
        <div className="hero-row" style={{ marginBottom: 14 }}>
          {lifetime.avgKD !== null && <Stat label="Avg K/D" value={lifetime.avgKD.toFixed(2)} />}
          {lifetime.avgHeadshotPct !== null && <Stat label="Avg HS%" value={`${Math.round(lifetime.avgHeadshotPct)}%`} />}
          {lifetime.avgDamagePerRound !== null && <Stat label="ADR" value={Math.round(lifetime.avgDamagePerRound).toString()} />}
          {lifetime.winRatePct !== null && <Stat label="Win rate" value={`${Math.round(lifetime.winRatePct)}%`} />}
          {lifetime.matches !== null && <Stat label="Matches" value={lifetime.matches.toString()} />}
          {lifetime.currentWinStreak !== null && <Stat label="Win streak" value={lifetime.currentWinStreak.toString()} />}
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>
            Recent matches <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(tap for per-map stats)</span>
          </div>
          {matches.map((m) => {
            const expanded = expandedMatchId === m.matchId;
            const stats = matchStats[m.matchId];
            return (
              <div key={m.matchId} style={{ marginBottom: 4 }}>
                <div className="skill-row" style={{ cursor: "pointer" }} onClick={() => toggleMatch(m.matchId)}>
                  <div className="skill-label">{m.map ?? "Unknown map"}</div>
                  <div
                    className="skill-rank"
                    style={{ color: m.result === "win" ? "var(--accent)" : m.result === "loss" ? "var(--danger, #f87171)" : "var(--text-dim)" }}
                  >
                    {m.result === "win" ? "Win" : m.result === "loss" ? "Loss" : "—"}
                  </div>
                  <div className="skill-score" style={{ fontSize: 10 }}>
                    {m.finishedAt ? <LocalTime iso={m.finishedAt} format="date" /> : ""}
                  </div>
                </div>

                {expanded && (
                  <div style={{ paddingLeft: 4, marginTop: 2, marginBottom: 6 }}>
                    {matchStatsLoading === m.matchId && (
                      <div style={{ color: "var(--text-dim)", fontSize: 11 }}>Loading per-map stats...</div>
                    )}
                    {matchStatsError[m.matchId] && (
                      <div style={{ color: "var(--danger, #f87171)", fontSize: 11 }}>{matchStatsError[m.matchId]}</div>
                    )}
                    {stats && (
                      <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                        {stats.kills ?? "—"}K/{stats.deaths ?? "—"}D/{stats.assists ?? "—"}A
                        {stats.adr !== null ? ` · ${Math.round(stats.adr)} ADR` : ""}
                        {stats.headshotPct !== null ? ` · ${Math.round(stats.headshotPct)}% HS` : ""}
                        {stats.mvps !== null ? ` · ${stats.mvps} MVP` : ""}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
