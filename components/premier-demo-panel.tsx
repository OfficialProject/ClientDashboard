"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/types";
import { decompressDemo, parseMatchStats, type ParsedMatchStats } from "@/lib/demo-parser";

interface Job {
  id: string;
  shareCode: string;
  status: "pending" | "resolved" | "error";
  demoUrl: string | null;
  map: string | null;
  error: string | null;
  createdAt: string;
  parsedStats: ParsedMatchStats | null;
  parseStatus: "unparsed" | "parsing" | "parsed" | "error";
  parseError: string | null;
}

export default function PremierDemoPanel({ client }: { client: Client }) {
  const router = useRouter();
  const clientId = client.id;
  const [shareCode, setShareCode] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [parsingJobId, setParsingJobId] = useState<string | null>(null);
  const [parseError, setParseError] = useState<Record<string, string>>({});

  const [showAutoSettings, setShowAutoSettings] = useState(false);
  const [authCode, setAuthCode] = useState(client.steamAuthCode ?? "");
  const [lastKnownCode, setLastKnownCode] = useState(client.lastKnownShareCode ?? "");
  const [savingAuto, setSavingAuto] = useState(false);

  const loadJobs = useCallback(() => {
    fetch(`/api/premier/demo-jobs?clientId=${clientId}`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => {});
  }, [clientId]);

  useEffect(() => {
    loadJobs();
    // Pending jobs get resolved by a separate worker process (npm run gc-bot), not this request - poll for updates.
    const interval = setInterval(loadJobs, 8000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  async function submit() {
    setSubmitError("");
    setSubmitting(true);
    const res = await fetch("/api/premier/demo-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, shareCode }),
    });
    const body = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(body?.error ?? "Failed to submit share code");
      return;
    }
    setShareCode("");
    loadJobs();
  }

  async function parseDemo(job: Job) {
    setParsingJobId(job.id);
    setParseError((prev) => ({ ...prev, [job.id]: "" }));
    try {
      const res = await fetch(`/api/premier/demo-proxy?jobId=${job.id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Demo download failed (${res.status})`);
      }
      const compressed = await res.arrayBuffer();
      const demoBytes = decompressDemo(compressed);
      const stats = await parseMatchStats(demoBytes);

      await fetch("/api/premier/demo-jobs/parsed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, parsedStats: stats }),
      });
      loadJobs();
    } catch (err) {
      setParseError((prev) => ({ ...prev, [job.id]: err instanceof Error ? err.message : "Parsing failed" }));
    } finally {
      setParsingJobId(null);
    }
  }

  async function saveAutoDiscoverySettings() {
    setSavingAuto(true);
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steamAuthCode: authCode.trim() || null,
        lastKnownShareCode: lastKnownCode.trim() || null,
      }),
    });
    setSavingAuto(false);
    router.refresh();
  }

  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 10 }}>
        Paste a Premier match share code (from the client's CS2 match history) to queue it for demo resolution. A
        separate bot worker process picks these up - if none is running, jobs will stay "pending" indefinitely.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
          value={shareCode}
          onChange={(e) => setShareCode(e.target.value)}
          style={{ flex: 1, background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: 8, fontSize: 12 }}
        />
        <button className="sync-button" disabled={submitting || !shareCode.trim()} onClick={submit}>
          {submitting ? "Queuing..." : "Queue"}
        </button>
      </div>
      {submitError && <div style={{ color: "var(--danger, #f87171)", fontSize: 12, marginBottom: 10 }}>{submitError}</div>}

      <button className="sort-toggle" style={{ fontSize: 11, marginBottom: 10 }} onClick={() => setShowAutoSettings(!showAutoSettings)}>
        {showAutoSettings ? "Hide auto-discovery settings" : "Set up auto-discovery"}
      </button>
      {showAutoSettings && (
        <div style={{ marginBottom: 14, padding: 10, background: "var(--panel-alt)", borderRadius: 8 }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 8 }}>
            Once both are set, the scheduler worker (npm run sync-scheduler) auto-walks forward from this share code
            and queues new matches on its own - no more pasting each one by hand. The auth code has to come from the
            client themselves (CS2 Settings &gt; Game &gt; enable match history authentication) - there's no
            self-service way for them to hand it over yet, so paste it in here once you have it.
          </div>
          <input
            placeholder="Match history auth code"
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value)}
            style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: 8, fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}
          />
          <input
            placeholder="Starting share code (CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx)"
            value={lastKnownCode}
            onChange={(e) => setLastKnownCode(e.target.value)}
            style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: 8, fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}
          />
          <button className="sync-button" disabled={savingAuto} onClick={saveAutoDiscoverySettings}>
            {savingAuto ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {jobs.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: 12 }}>No demo jobs yet.</div>
      ) : (
        [...jobs].reverse().map((j) => (
          <div key={j.id} style={{ marginBottom: 10 }}>
            <div className="skill-row">
              <div className="skill-label" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{j.shareCode}</div>
              <div
                className="skill-rank"
                style={{ color: j.status === "resolved" ? "var(--accent)" : j.status === "error" ? "var(--danger, #f87171)" : "var(--text-dim)" }}
              >
                {j.status === "resolved" ? (
                  <a href={j.demoUrl ?? "#"} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                    Download
                  </a>
                ) : j.status === "error" ? (
                  j.error ?? "Error"
                ) : (
                  "Pending..."
                )}
              </div>
            </div>

            {j.status === "resolved" && (
              <div style={{ paddingLeft: 4, marginTop: 4 }}>
                {j.parseStatus === "parsing" && parsingJobId !== j.id && (
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Auto-parsing in the background worker...</div>
                )}
                {j.parsedStats ? (
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {j.parsedStats.rounds} rounds parsed · {j.parsedStats.players.length} players ·{" "}
                    <button
                      className="sort-toggle"
                      style={{ fontSize: 10, padding: "2px 6px" }}
                      onClick={() => parseDemo(j)}
                      disabled={parsingJobId === j.id}
                    >
                      Re-parse
                    </button>
                  </div>
                ) : j.parseStatus !== "parsing" ? (
                  <button className="sort-toggle" style={{ fontSize: 11 }} onClick={() => parseDemo(j)} disabled={parsingJobId === j.id}>
                    {parsingJobId === j.id ? "Parsing (in-browser)..." : "Parse demo"}
                  </button>
                ) : null}
                {j.parseStatus === "error" && j.parseError && !parseError[j.id] && (
                  <div style={{ color: "var(--danger, #f87171)", fontSize: 11, marginTop: 4 }}>
                    Background auto-parse failed: {j.parseError}
                  </div>
                )}
                {parseError[j.id] && (
                  <div style={{ color: "var(--danger, #f87171)", fontSize: 11, marginTop: 4 }}>{parseError[j.id]}</div>
                )}
                {j.parsedStats && (
                  <div style={{ marginTop: 4 }}>
                    {[...j.parsedStats.players]
                      .sort((a, b) => b.kills - a.kills)
                      .map((p) => (
                        <div key={p.steamId} style={{ fontSize: 10.5, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                          {p.steamId}: {p.kills}K/{p.deaths}D, {p.headshotKills} HS, {Math.round(p.damageDealt)} dmg
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
