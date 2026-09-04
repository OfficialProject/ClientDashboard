"use client";
import { useEffect, useState, useCallback } from "react";

interface Job {
  id: string;
  shareCode: string;
  status: "pending" | "resolved" | "error";
  demoUrl: string | null;
  map: string | null;
  error: string | null;
  createdAt: string;
}

export default function PremierDemoPanel({ clientId }: { clientId: string }) {
  const [shareCode, setShareCode] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

      {jobs.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: 12 }}>No demo jobs yet.</div>
      ) : (
        [...jobs].reverse().map((j) => (
          <div key={j.id} className="skill-row">
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
        ))
      )}
    </div>
  );
}
