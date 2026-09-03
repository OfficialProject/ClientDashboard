"use client";
import { useMemo } from "react";
import type { RecentActivityEntry } from "@/lib/kovaaks";
import { groupIntoSessions, computeConsistency } from "@/lib/sessions";
import { computeStreak } from "@/lib/streaks";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatAttrs(e: RecentActivityEntry): string {
  const a = e.attributes;
  if (!a) return "";
  const parts: string[] = [];
  if (a.accuracyDamage !== undefined) parts.push(`${Math.round(a.accuracyDamage)} dmg`);
  if (a.kills !== undefined) parts.push(`${a.kills} kills`);
  if (a.avgTtk) parts.push(`${a.avgTtk.toFixed(2)}s TTK`);
  return parts.join(" · ");
}

export default function RecentActivity({
  loading,
  error,
  entries,
  reconstructed,
}: {
  loading: boolean;
  error: string;
  entries: RecentActivityEntry[] | null;
  reconstructed: boolean;
}) {
  const sessions = useMemo(() => (entries ? groupIntoSessions(entries) : []), [entries]);
  const consistency = useMemo(() => computeConsistency(sessions), [sessions]);
  const streak = useMemo(() => computeStreak(sessions), [sessions]);

  if (loading) return <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Loading activity...</div>;
  if (error) return <div style={{ color: "var(--text-dim)", fontSize: 13 }}>{error}</div>;
  if (!entries || entries.length === 0)
    return <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No recent activity found.</div>;

  return (
    <div>
      {reconstructed && (
        <div style={{ color: "var(--text-dim)", fontSize: 11, marginBottom: 8 }}>
          Reconstructed from public leaderboard data (this client has no kovaaks.com username) -
          shows when each scenario's current best was set, not every session played.
        </div>
      )}

      <div className="hero-row" style={{ marginBottom: 14 }}>
        <div className="hero-stat">
          <div className="hero-label">Last session</div>
          <div className="hero-value" style={{ fontSize: 14 }}>
            {consistency.daysSinceLastSession === null
              ? "unknown"
              : consistency.daysSinceLastSession === 0
              ? "today"
              : `${consistency.daysSinceLastSession}d ago`}
          </div>
        </div>
        <div className="hero-stat">
          <div className="hero-label">Sessions (7d)</div>
          <div className="hero-value">{consistency.sessionsLast7Days}</div>
        </div>
        <div className="hero-stat">
          <div className="hero-label">Sessions (30d)</div>
          <div className="hero-value">{consistency.sessionsLast30Days}</div>
        </div>
        <div className="hero-stat">
          <div className="hero-label">Current streak</div>
          <div className="hero-value">{streak.currentStreak}d</div>
        </div>
        <div className="hero-stat">
          <div className="hero-label">Longest streak</div>
          <div className="hero-value">{streak.longestStreak}d</div>
        </div>
      </div>

      {sessions.slice(0, 8).map((s, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ color: "var(--text-dim)", fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {timeAgo(s.end)} · {s.entries.length} scenario{s.entries.length === 1 ? "" : "s"}
          </div>
          <div className="notes-list">
            {s.entries.map((e, j) => (
              <div className="note-item" key={j}>
                <div className="date">{new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                <div className="text">
                  {e.scenarioName} — <span style={{ fontFamily: "var(--font-mono)" }}>{Math.round(e.score)}</span>
                  {formatAttrs(e) && (
                    <span style={{ color: "var(--text-dim)", fontSize: 11 }}> · {formatAttrs(e)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
