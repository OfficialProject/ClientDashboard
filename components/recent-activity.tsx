"use client";
import { useEffect, useState } from "react";
import type { RecentActivityEntry } from "@/lib/kovaaks";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentActivity({ clientId }: { clientId: string }) {
  const [entries, setEntries] = useState<RecentActivityEntry[] | null>(null);
  const [reconstructed, setReconstructed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/kovaaks/activity?clientId=${clientId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load activity");
        setEntries(data.activity);
        setReconstructed(false);
      })
      .catch(() => {
        // No webapp username (or any other failure) - fall back to
        // reconstructing from public leaderboard data instead. Works for
        // any client, no username required, but is "last best set per
        // scenario" not a true session-by-session feed - labeled as such.
        return fetch(`/api/kovaaks/scenario-history?clientId=${clientId}`)
          .then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Failed to load activity");
            setEntries(data.activity);
            setReconstructed(true);
          });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [clientId]);

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
      <div className="notes-list">
        {entries.slice(0, 15).map((e, i) => (
          <div className="note-item" key={i}>
            <div className="date">{timeAgo(e.timestamp)}</div>
            <div className="text">
              {e.scenarioName} — <span style={{ fontFamily: "var(--font-mono)" }}>{Math.round(e.score)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
